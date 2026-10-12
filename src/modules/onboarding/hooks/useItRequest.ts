import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { itRequestApi, itRequestPublicApi } from '../api/itRequest.api';
import type {
  ItRequestAnswer,
  ItRequestInput,
} from '../types/itRequest.types';
import { onboardingKeys } from './useOnboarding';

const itKeys = {
  draft: (candidateId: string) =>
    ['onboarding', candidateId, 'it-request', 'draft'] as const,
  preview: (candidateId: string, input: ItRequestInput) =>
    ['onboarding', candidateId, 'it-request', 'preview', input] as const,
  public: (token: string) => ['it-request', token] as const,
  settings: ['settings', 'it-requests'] as const,
};

const message = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

/** What the Notify IT dialog starts from — fetched each time it opens. */
export function useItRequestDraft(candidateId: string, enabled: boolean) {
  return useQuery({
    queryKey: itKeys.draft(candidateId),
    queryFn: () => itRequestApi.draft(candidateId),
    enabled: Boolean(candidateId) && enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

/** The email as it would go. `input` is debounced by the caller. */
export function useItRequestPreview(
  candidateId: string,
  input: ItRequestInput | null,
) {
  return useQuery({
    queryKey: itKeys.preview(candidateId, input ?? {}),
    queryFn: () => itRequestApi.preview(candidateId, input ?? {}),
    enabled: Boolean(candidateId) && input !== null,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
}

export function useSendItRequest(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ItRequestInput) => itRequestApi.send(candidateId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.candidate(candidateId) });
      toast.success('Request sent to IT');
    },
    onError: (e) => toast.error(message(e, 'Could not send the request to IT')),
  });
}

// --- IT's page (public) -------------------------------------------------------

export function useItRequestPublic(token: string) {
  return useQuery({
    queryKey: itKeys.public(token),
    queryFn: () => itRequestPublicApi.get(token),
    enabled: Boolean(token),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useCompleteItRequest(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answer: ItRequestAnswer) =>
      itRequestPublicApi.complete(token, answer),
    onSuccess: () => qc.invalidateQueries({ queryKey: itKeys.public(token) }),
  });
}

// --- Integrations ---------------------------------------------------------------

export function useItRequestSettings() {
  return useQuery({
    queryKey: itKeys.settings,
    queryFn: () => itRequestApi.settings(),
    refetchOnWindowFocus: false,
  });
}

export function useSaveItRequestSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: itRequestApi.saveSettings,
    onSuccess: (data) => {
      qc.setQueryData(itKeys.settings, data);
      toast.success('IT request settings saved');
    },
    onError: (e) => toast.error(message(e, 'Could not save the settings')),
  });
}
