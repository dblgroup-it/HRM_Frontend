import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';

import { ENV } from '@shared/constants';
import type { Paginated } from '@shared/types';
import { useAuthStore } from '@modules/auth';
import { notificationKeys, type AppNotification } from '@modules/notifications';
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

    // Live data — patch open requisition caches immediately, then refetch.
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

      void queryClient.invalidateQueries({
        queryKey: requisitionKeys.all,
        refetchType: 'active',
      });
      void queryClient.invalidateQueries({ queryKey: ['organogram'] });
    });

    // Targeted notification → sound + toast + bell refresh.
    socket.on('notification', (n: AppNotification) => {
      const played = tryPlayNotificationSound();
      if (!played) pendingSoundRef.current = true;
      toast(n.title, {
        description: n.message,
        action: n.link
          ? { label: 'View', onClick: () => navigate(n.link as string) }
          : undefined,
      });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    });

    socket.on('notification:read', () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    });

    return () => {
      socket.disconnect();
      unlockEvents.forEach((eventName) =>
        document.removeEventListener(eventName, unlockAudio)
      );
    };
  }, [token, isAuthenticated, queryClient, navigate]);

  return <>{children}</>;
}
