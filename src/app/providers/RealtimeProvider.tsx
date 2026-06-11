import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';

import { ENV } from '@shared/constants';
import type { Paginated } from '@shared/types';
import { useAuthStore } from '@modules/auth';
import { notificationKeys, type AppNotification } from '@modules/notifications';
import { candidateKeys } from '@modules/candidates';
import { requisitionKeys } from '@modules/requisition/hooks/useRequisitions';
import type { Requisition } from '@modules/requisition/types/requisition.types';
import notificationSound from '@assets/notification.mp3';

const SOCKET_URL = ENV.API_BASE_URL.replace(/\/api\/?$/, '');

interface RequisitionChangedPayload {
  id: string;
  action?: string;
  record?: Requisition;
}

/**
 * Connects an authenticated websocket and turns server events into:
 *  - live React Query cache invalidation (instant status updates), and
 *  - toast notifications with sound for things addressed to this user.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const pendingSoundRef = useRef(false);

  const tryPlayNotificationSound = () => {
    const audio = audioRef.current;
    if (!audio) return false;

    if (audio.readyState < 2) {
      audio.load();
    }

    audio.currentTime = 0;
    const playPromise = audio.play();
    if (!playPromise) return true;

    void playPromise
      .then(() => {
        audioUnlockedRef.current = true;
        pendingSoundRef.current = false;
      })
      .catch(() => {
        pendingSoundRef.current = true;
      });

    return true;
  };

  const primeNotificationAudio = () => {
    const audio = audioRef.current;
    if (!audio || audioUnlockedRef.current) return;

    audio.muted = true;
    audio.currentTime = 0;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        audioUnlockedRef.current = true;
        if (pendingSoundRef.current) {
          void tryPlayNotificationSound();
        }
      })
      .catch(() => {
        audio.muted = false;
      });
  };

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(notificationSound);
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 1;
      audioRef.current.load();
    }

    const unlockEvents: Array<keyof DocumentEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
    ];
    const unlockAudio = () => primeNotificationAudio();
    unlockEvents.forEach((eventName) =>
      document.addEventListener(eventName, unlockAudio, { passive: true })
    );

    const socket: Socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    // Coalesce bursts of change events into ONE refetch (e.g. bulk AI screening
    // emits many candidate:changed events) so we never trigger a refetch storm.
    const pending = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      flushTimer = undefined;
      const keys = [...pending];
      pending.clear();
      for (const k of keys) {
        if (k === 'req') {
          void queryClient.invalidateQueries({
            queryKey: requisitionKeys.all,
            refetchType: 'active',
          });
        } else if (k === 'org') {
          void queryClient.invalidateQueries({
            queryKey: ['organogram'],
            refetchType: 'active',
          });
        } else if (k === 'notif') {
          void queryClient.invalidateQueries({
            queryKey: notificationKeys.all,
            refetchType: 'active',
          });
        } else if (k === 'cand:all') {
          void queryClient.invalidateQueries({
            queryKey: candidateKeys.all,
            refetchType: 'active',
          });
        } else if (k.startsWith('cand:')) {
          void queryClient.invalidateQueries({
            queryKey: candidateKeys.list(k.slice(5)),
            refetchType: 'active',
          });
        }
      }
    };
    const schedule = (...keys: string[]) => {
      keys.forEach((k) => pending.add(k));
      if (!flushTimer) flushTimer = setTimeout(flush, 400);
    };

    // Live data — patch open requisition caches immediately, refetch (debounced).
    socket.on('requisition:changed', (payload?: RequisitionChangedPayload) => {
      const requisition = payload?.record;
      if (requisition) {
        queryClient.setQueryData(
          requisitionKeys.detail(requisition.id),
          requisition
        );
        queryClient.setQueriesData<Paginated<Requisition>>(
          { queryKey: requisitionKeys.all },
          (old) =>
            old?.items
              ? {
                  ...old,
                  items: old.items.map((item) =>
                    item.id === requisition.id ? requisition : item
                  ),
                }
              : old
        );
      }
      schedule('req', 'org');
    });

    // Targeted notification → sound + toast (immediate) + bell refresh (debounced).
    socket.on('notification', (n: AppNotification) => {
      const played = tryPlayNotificationSound();
      if (!played) pendingSoundRef.current = true;
      toast(n.title, {
        description: n.message,
        action: n.link
          ? { label: 'View', onClick: () => navigate(n.link as string) }
          : undefined,
      });
      schedule('notif');
    });

    socket.on('notification:read', () => schedule('notif'));

    // Candidate pipeline changed (payload.id is the requisition id).
    socket.on('candidate:changed', (payload?: { id?: string }) => {
      schedule(payload?.id ? `cand:${payload.id}` : 'cand:all', 'req');
    });

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      socket.disconnect();
      unlockEvents.forEach((eventName) =>
        document.removeEventListener(eventName, unlockAudio)
      );
    };
    // Audio-priming helpers are intentionally stable across renders; re-running
    // this effect on every render would needlessly reconnect the socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated, queryClient, navigate]);

  return <>{children}</>;
}
