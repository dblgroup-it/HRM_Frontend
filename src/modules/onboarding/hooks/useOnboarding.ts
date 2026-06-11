import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { onboardingApi } from '../api/onboarding.api';
import type {
  MedicalStatus,
  OnboardingResult,
} from '../types/onboarding.types';

export const onboardingKeys = {
  candidate: (candidateId: string) => ['onboarding', candidateId] as const,
  medicalQueue: ['onboarding', 'medical-queue'] as const,
};

function errMsg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

export function useOnboarding(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: onboardingKeys.candidate(candidateId),
    queryFn: () => onboardingApi.get(candidateId),
    enabled: Boolean(candidateId) && enabled,
  });
}

/** Run a candidate-scoped onboarding action and refresh that candidate's view. */
function useCandidateAction<TVars>(
  candidateId: string,
  fn: (vars: TVars) => Promise<unknown>,
  opts: { success?: string; fallback: string } = { fallback: 'Action failed' },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      // Full-payload responses carry { onboarding, ...flags }; reuse if present.
      if (data && typeof data === 'object' && 'requiredDocs' in data) {
        qc.setQueryData(
          onboardingKeys.candidate(candidateId),
          data as OnboardingResult,
        );
      } else {
        qc.invalidateQueries({
          queryKey: onboardingKeys.candidate(candidateId),
        });
      }
      qc.invalidateQueries({ queryKey: ['candidates'] });
      if (opts.success) toast.success(opts.success);
    },
    onError: (error) => toast.error(errMsg(error, opts.fallback)),
  });
}

export function useStartOnboarding(candidateId: string) {
  return useCandidateAction(candidateId, () => onboardingApi.start(candidateId), {
    success: 'Onboarding started',
    fallback: 'Could not start onboarding',
  });
}

export function useSendOnboardingLink(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.sendLink(candidateId),
    { success: 'Document link emailed', fallback: 'Could not send the link' },
  );
}

export function useSummarizeDoc(candidateId: string) {
  return useCandidateAction(
    candidateId,
    (docId: string) => onboardingApi.summarizeDoc(docId),
    { success: 'Document summarized', fallback: 'Could not summarize' },
  );
}

export function useCrossCheck(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.crossCheck(candidateId),
    { success: 'Cross-check complete', fallback: 'Cross-check failed' },
  );
}

export function useVerifyDoc(candidateId: string) {
  return useCandidateAction(
    candidateId,
    (vars: { docId: string; status: string }) =>
      onboardingApi.verifyDoc(vars.docId, vars.status),
    { fallback: 'Could not update the document' },
  );
}

export function useSendOffer(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.sendOffer(candidateId),
    { success: 'Offer sent', fallback: 'Could not send the offer' },
  );
}

export function useHrVerify(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.hrVerify(candidateId),
    { success: 'HR verification complete', fallback: 'Could not verify' },
  );
}

export function useArchiveOnboarding(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.archive(candidateId),
    { success: 'Documents archived', fallback: 'Could not archive' },
  );
}

export function useNotifyIt(candidateId: string) {
  return useCandidateAction(
    candidateId,
    (body: { email?: string; assetId?: string }) =>
      onboardingApi.notifyIt(candidateId, body),
    { success: 'IT notified', fallback: 'Could not notify IT' },
  );
}

// --- medical officer ---

export function useMedicalQueue() {
  return useQuery({
    queryKey: onboardingKeys.medicalQueue,
    queryFn: () => onboardingApi.medicalQueue(),
  });
}

export function useSetMedical() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      onboardingId: string;
      status: MedicalStatus;
      note?: string;
    }) =>
      onboardingApi.setMedical(vars.onboardingId, {
        status: vars.status,
        note: vars.note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.medicalQueue });
      toast.success('Medical status recorded');
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not record medical status')),
  });
}
