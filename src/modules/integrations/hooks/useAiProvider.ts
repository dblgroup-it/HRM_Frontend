import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { aiProviderApi } from '../api/aiProvider.api';

const keys = { settings: ['settings', 'ai-provider'] as const };

const message = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

export function useAiProviderSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: () => aiProviderApi.get(),
    refetchOnWindowFocus: false,
  });
}

export function useSaveAiProviderSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aiProviderApi.save,
    onSuccess: (data) => {
      qc.setQueryData(keys.settings, data);
      // AI Settings shows the provider too
      void qc.invalidateQueries({ queryKey: ['settings', 'ai'] });
      toast.success('AI provider saved');
    },
    onError: (e) => toast.error(message(e, 'Could not save the AI provider')),
  });
}

export function useTestAiProvider() {
  return useMutation({
    mutationFn: aiProviderApi.test,
    onError: (e) => toast.error(message(e, 'Could not run the test')),
  });
}
