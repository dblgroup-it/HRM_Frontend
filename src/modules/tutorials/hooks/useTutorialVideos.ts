import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { tutorialsApi } from '../api/tutorials.api';
import { allowsFrameFrom } from '../embedPolicy';

const YOUTUBE_PLAYER = 'https://www.youtube-nocookie.com';

/**
 * Whether the video can play inside the page. Asks the site's own policy (a
 * same-origin response shows its headers), once per visit; until it answers,
 * or if it cannot, Play opens YouTube instead.
 */
export function useCanEmbedVideos(): boolean {
  const { data } = useQuery({
    queryKey: ['tutorials', 'embed-policy'],
    queryFn: async () => {
      const res = await fetch(`${window.location.origin}/`, { method: 'HEAD', cache: 'no-store' });
      return allowsFrameFrom(res.headers.get('content-security-policy'), YOUTUBE_PLAYER);
    },
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return data === true;
}

const keys = { settings: ['settings', 'tutorial-videos'] as const };

const message = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

export function useTutorialVideoSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: () => tutorialsApi.videoSettings(),
    refetchOnWindowFocus: false,
  });
}

export function useSaveTutorialVideoSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tutorialsApi.saveVideoSettings,
    onSuccess: (data) => {
      qc.setQueryData(keys.settings, data);
      void qc.invalidateQueries({ queryKey: ['tutorials'] });
      toast.success(data.playlistId ? 'Video playlist saved' : 'Videos taken off the Tutorials page');
    },
    onError: (e) => toast.error(message(e, 'Could not save the video playlist')),
  });
}
