import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { onboardingApi } from '../api/onboarding.api';
import type {
  MedicalExam,
  MedicalStatus,
  OnboardingResult,
  OfferLetterInput,
  AppointmentLetterInput,
} from '../types/onboarding.types';

export const onboardingKeys = {
  candidate: (candidateId: string) => ['onboarding', candidateId] as const,
  medicalQueue: ['onboarding', 'medical-queue'] as const,
  medicalExam: (onboardingId: string) =>
    ['onboarding', onboardingId, 'medical-exam'] as const,
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
      if (data && typeof data === 'object' && 'docCatalogue' in data) {
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

/**
 * Settle which level this candidate is hired at.
 *
 * The response is the whole onboarding result, so useCandidateAction drops it
 * straight into the cache and the sidebar, the header card and the letter all
 * change together — rather than the letter saying one thing and the card
 * beside it another.
 */
export function useSetOnboardingDesignation(candidateId: string) {
  return useCandidateAction(
    candidateId,
    (designation: string) =>
      onboardingApi.setDesignation(candidateId, designation),
    {
      success: 'Designation confirmed',
      fallback: 'Could not confirm the designation',
    },
  );
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

export function useManualCrossCheck(candidateId: string) {
  return useCandidateAction(
    candidateId,
    (vars: { verdict: string; note?: string }) =>
      onboardingApi.manualCrossCheck(candidateId, vars.verdict, vars.note),
    { success: 'Manual review recorded', fallback: 'Could not save review' },
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
    (input: OfferLetterInput) => onboardingApi.sendOffer(candidateId, input),
    { success: 'Offer letter sent', fallback: 'Could not send the offer' },
  );
}

export function useSendAppointmentLetter(candidateId: string) {
  return useCandidateAction(
    candidateId,
    (input: AppointmentLetterInput) =>
      onboardingApi.sendAppointment(candidateId, input),
    {
      success: 'Appointment letter sent',
      fallback: 'Could not send the appointment letter',
    },
  );
}

export function useHrVerify(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.hrVerify(candidateId),
    { success: 'HR verification complete', fallback: 'Could not verify' },
  );
}

/** Settle the placement — the employee ID and who the hire reports to. */
export function useSetPlacement(candidateId: string) {
  return useCandidateAction(
    candidateId,
    (placement: {
      employeeId: string;
      lineManagerName?: string;
      lineManagerCode?: string;
      lineManagerTitle?: string;
    }) => onboardingApi.setEmployeeId(candidateId, placement),
    {
      success: 'Placement saved',
      fallback: 'Could not save the placement',
    },
  );
}

export function useSendCoc(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.sendCoc(candidateId),
    {
      success: 'Code of Conduct sent to the candidate',
      fallback: 'Could not send the Code of Conduct',
    },
  );
}

export function useMarkOfferAcceptedManually(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.markOfferAcceptedManually(candidateId),
    {
      success: 'Offer marked as accepted',
      fallback: 'Could not mark the offer as accepted',
    },
  );
}

export function useSkipDocs(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.skipDocs(candidateId),
    { success: 'Document submission skipped', fallback: 'Could not skip' },
  );
}

export function useSkipVerification(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.skipVerification(candidateId),
    { success: 'Document verification skipped', fallback: 'Could not skip' },
  );
}

/**
 * Who HR may issue this candidate's letters over.
 *
 * Fetched per candidate rather than globally because the endpoint is the
 * candidate's own — it checks recruitment access on the way through, so the
 * list cannot be read by someone who has no business with this hire.
 */
export function useLetterSignatories(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: [...onboardingKeys.candidate(candidateId), 'signatories'],
    queryFn: () => onboardingApi.letterSignatories(candidateId),
    enabled: enabled && Boolean(candidateId),
    staleTime: 5 * 60_000,
  });
}

export function useReviewFacilities(candidateId: string) {
  return useCandidateAction(
    candidateId,
    () => onboardingApi.reviewFacilities(candidateId),
    {
      success: 'Facility requirements reviewed',
      fallback: 'Could not record the review',
    },
  );
}

/** Email the candidate whatever documents are still outstanding. */
export function useChaseDocs(candidateId: string) {
  return useMutation({
    mutationFn: () => onboardingApi.chaseDocs(candidateId),
    onSuccess: (d) => {
      const n = d.outstanding.length + d.rejected.length;
      toast.success(
        `Reminder sent — ${n} document${n === 1 ? '' : 's'} listed`,
      );
    },
    onError: (e) => toast.error(errMsg(e, 'Could not send the reminder')),
  });
}

/** HR ticks off that the physical photographs arrived. */
export function useSetPhotosHardCopy(candidateId: string) {
  return useCandidateAction(
    candidateId,
    (received: boolean) =>
      onboardingApi.setPhotosHardCopy(candidateId, received),
    {
      success: 'Photograph hard copies updated',
      fallback: 'Could not update that',
    },
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

/**
 * Findings waiting on the Central Medical Officer.
 *
 * `enabled` so the dashboard can mount the card for everyone and only fetch for
 * a CMO — the endpoint refuses anyone else, and a 403 on every dashboard load
 * would be noise in the logs and a wasted request.
 */
export function useMedicalLetterDraft(onboardingId: string, enabled = true) {
  return useQuery({
    queryKey: ['medical-letter', onboardingId],
    queryFn: () => onboardingApi.medicalLetterDraft(onboardingId),
    enabled: enabled && Boolean(onboardingId),
  });
}

export function useMedicalApprovalQueue(enabled = true) {
  return useQuery({
    queryKey: ['medical-approvals'],
    queryFn: () => onboardingApi.medicalApprovalQueue(),
    enabled,
  });
}

export function useMedicalExam(onboardingId: string, enabled = true) {
  return useQuery({
    queryKey: onboardingKeys.medicalExam(onboardingId),
    queryFn: () => onboardingApi.getMedicalExam(onboardingId),
    enabled: Boolean(onboardingId) && enabled,
  });
}

export function useUpsertMedicalExam(onboardingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<MedicalExam>) =>
      onboardingApi.upsertMedicalExam(onboardingId, body),
    onSuccess: (data) => {
      qc.setQueryData(onboardingKeys.medicalExam(onboardingId), data);
      toast.success('Exam saved');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not save the exam')),
  });
}

export function useUploadMedicalReport(onboardingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      onboardingApi.uploadMedicalReport(onboardingId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.medicalQueue });
      qc.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success('Report uploaded');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not upload the report')),
  });
}

/**
 * The hire's full history, for the printed record.
 *
 * Fetched with the page rather than on the print click: opening the print
 * window after an await loses the user gesture, and popup blockers stop it.
 * One extra request on a page that already makes several is the cheaper
 * trade.
 */
export function useCandidateTimeline(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: ['onboarding', candidateId, 'timeline'],
    queryFn: () => onboardingApi.timeline(candidateId),
    enabled: enabled && Boolean(candidateId),
  });
}

export function useAlertMedical() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (onboardingId: string) => onboardingApi.alertMedical(onboardingId),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success(
        `Medical team notified (${res.notified} ${res.notified === 1 ? 'person' : 'people'})`,
      );
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not notify the medical team')),
  });
}

export function useSetMedical() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      onboardingId: string;
      status: MedicalStatus;
      note?: string;
      /** Recorded from an exam done on paper, outside the structured form. */
      manual?: boolean;
    }) =>
      onboardingApi.setMedical(vars.onboardingId, {
        status: vars.status,
        note: vars.note,
        manual: vars.manual,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.medicalQueue });
      // HR records by-hand results from the onboarding page, which reads a
      // different key — without this the step keeps saying "Awaiting".
      void qc.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success('Medical status recorded');
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not record medical status')),
  });
}
