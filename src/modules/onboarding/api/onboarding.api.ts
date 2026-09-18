import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  MedicalExam,
  TimelineEvent,
  MedicalQueueItem,
  MedicalStatus,
  OnboardingResult,
  OnboardingView,
  PublicOnboarding,
  OfferLetterInput,
  AppointmentLetterInput,
  MedicalApprovalRow,
  MedicalBulkResult,
  CmoDecision,
  MedicalAgeBand,
  MedicalLetterDraft,
  SendMedicalLetterResult,
} from '../types/onboarding.types';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export const onboardingApi = {
  /** What the send screen needs: band, reference, venue, who it will reach. */
  medicalLetterDraft: (onboardingId: string): Promise<MedicalLetterDraft> =>
    http
      .get<ApiResponse<MedicalLetterDraft>>(
        `/onboarding/${onboardingId}/medical-letter`,
      )
      .then((r) => r.data),

  /** Send the letter to the medical team and the appointment to the candidate. */
  sendMedicalLetter: (
    onboardingId: string,
    body: {
      band: MedicalAgeBand;
      examAt: string;
      venue?: string;
      salutation?: string;
      notifyMedicalTeam?: boolean;
      notifyCandidate?: boolean;
    },
  ): Promise<SendMedicalLetterResult> =>
    http
      .post<ApiResponse<SendMedicalLetterResult>>(
        `/onboarding/${onboardingId}/medical-letter`,
        body,
      )
      .then((r) => r.data),

  /** Everything waiting on the Central Medical Officer, oldest first. */
  medicalApprovalQueue: (): Promise<MedicalApprovalRow[]> =>
    http
      .get<ApiResponse<MedicalApprovalRow[]>>('/medical-approvals')
      .then((r) => r.data),

  /** Confirm, overturn or return one submitted finding. */
  decideMedical: (
    onboardingId: string,
    body: { decision: CmoDecision; note?: string },
  ): Promise<{ ok: boolean; status: string }> =>
    http
      .post<ApiResponse<{ ok: boolean; status: string }>>(
        `/medical-approvals/${onboardingId}/decide`,
        body,
      )
      .then((r) => r.data),

  /**
   * The same verdict across a selection.
   *
   * Resolves even when some rows were skipped — a bulk decision is a list of
   * independent ones, and the caller shows what did not apply.
   */
  decideMedicalMany: (body: {
    onboardingIds: string[];
    decision: CmoDecision;
    note?: string;
  }): Promise<MedicalBulkResult> =>
    http
      .post<ApiResponse<MedicalBulkResult>>('/medical-approvals/decide', body)
      .then((r) => r.data),

  get: (candidateId: string): Promise<OnboardingResult> =>
    http
      .get<ApiResponse<OnboardingResult>>(`/candidates/${candidateId}/onboarding`)
      .then((r) => r.data),

  /**
   * Settle which level this candidate is hired at.
   *
   * Returns the whole onboarding result, so every screen reading `designation`
   * updates from one response rather than each guessing at the new value.
   */
  setDesignation: (
    candidateId: string,
    designation: string,
  ): Promise<OnboardingResult> =>
    http
      .patch<ApiResponse<OnboardingResult>>(
        `/candidates/${candidateId}/onboarding/designation`,
        { designation },
      )
      .then((r) => r.data),

  start: (candidateId: string): Promise<OnboardingResult> =>
    http
      .post<ApiResponse<OnboardingResult>>(`/candidates/${candidateId}/onboarding`)
      .then((r) => r.data),

  sendLink: (candidateId: string): Promise<OnboardingResult> =>
    http
      .post<ApiResponse<OnboardingResult>>(
        `/candidates/${candidateId}/onboarding/send-link`,
      )
      .then((r) => r.data),

  summarizeDoc: (docId: string): Promise<OnboardingResult> =>
    http
      .post<ApiResponse<OnboardingResult>>(
        `/onboarding/docs/${docId}/summarize`,
        undefined,
        { timeout: 90_000 },
      )
      .then((r) => r.data),

  verifyDoc: (docId: string, status: string): Promise<OnboardingResult> =>
    http
      .patch<ApiResponse<OnboardingResult>>(`/onboarding/docs/${docId}/verify`, {
        status,
      })
      .then((r) => r.data),

  crossCheck: (candidateId: string): Promise<OnboardingResult> =>
    http
      .post<ApiResponse<OnboardingResult>>(
        `/candidates/${candidateId}/onboarding/cross-check`,
        undefined,
        { timeout: 90_000 },
      )
      .then((r) => r.data),

  manualCrossCheck: (
    candidateId: string,
    verdict: string,
    note?: string,
  ): Promise<OnboardingResult> =>
    http
      .post<ApiResponse<OnboardingResult>>(
        `/candidates/${candidateId}/onboarding/cross-check/manual`,
        { verdict, note },
      )
      .then((r) => r.data),

  previewOffer: (
    candidateId: string,
    input: OfferLetterInput,
  ): Promise<{ html: string }> =>
    http
      .post<ApiResponse<{ html: string }>>(
        `/candidates/${candidateId}/onboarding/offer/preview`,
        input,
      )
      .then((r) => r.data),

  sendOffer: (
    candidateId: string,
    input: OfferLetterInput,
  ): Promise<{ onboarding: OnboardingView }> =>
    http
      .post<ApiResponse<{ onboarding: OnboardingView }>>(
        `/candidates/${candidateId}/onboarding/offer`,
        input,
      )
      .then((r) => r.data),

  previewAppointment: (
    candidateId: string,
    input: AppointmentLetterInput,
  ): Promise<{ html: string }> =>
    http
      .post<ApiResponse<{ html: string }>>(
        `/candidates/${candidateId}/onboarding/appointment-letter/preview`,
        input,
      )
      .then((r) => r.data),

  sendAppointment: (
    candidateId: string,
    input: AppointmentLetterInput,
  ): Promise<{ onboarding: OnboardingView }> =>
    http
      .post<ApiResponse<{ onboarding: OnboardingView }>>(
        `/candidates/${candidateId}/onboarding/appointment-letter`,
        input,
      )
      .then((r) => r.data),

  hrVerify: (candidateId: string): Promise<{ onboarding: OnboardingView }> =>
    http
      .post<ApiResponse<{ onboarding: OnboardingView }>>(
        `/candidates/${candidateId}/onboarding/hr-verify`,
      )
      .then((r) => r.data),

  markOfferAcceptedManually: (
    candidateId: string,
  ): Promise<{ onboarding: OnboardingView }> =>
    http
      .post<ApiResponse<{ onboarding: OnboardingView }>>(
        `/candidates/${candidateId}/onboarding/offer/mark-accepted`,
      )
      .then((r) => r.data),

  skipDocs: (candidateId: string): Promise<{ onboarding: OnboardingView }> =>
    http
      .post<ApiResponse<{ onboarding: OnboardingView }>>(
        `/candidates/${candidateId}/onboarding/skip-docs`,
      )
      .then((r) => r.data),

  skipVerification: (candidateId: string): Promise<{ onboarding: OnboardingView }> =>
    http
      .post<ApiResponse<{ onboarding: OnboardingView }>>(
        `/candidates/${candidateId}/onboarding/skip-verification`,
      )
      .then((r) => r.data),

  archive: (candidateId: string): Promise<{ onboarding: OnboardingView }> =>
    http
      .post<ApiResponse<{ onboarding: OnboardingView }>>(
        `/candidates/${candidateId}/onboarding/archive`,
      )
      .then((r) => r.data),

  notifyIt: (
    candidateId: string,
    body: { email?: string; assetId?: string },
  ): Promise<{ onboarding: OnboardingView }> =>
    http
      .post<ApiResponse<{ onboarding: OnboardingView }>>(
        `/candidates/${candidateId}/onboarding/notify-it`,
        body,
      )
      .then((r) => r.data),

  /** The whole lifecycle of this hire, oldest first. */
  timeline: (candidateId: string): Promise<TimelineEvent[]> =>
    http
      .get<ApiResponse<TimelineEvent[]>>(`/candidates/${candidateId}/timeline`)
      .then((r) => r.data),

  /** Ask the medical team to look at this candidate (or remind them). */
  alertMedical: (
    onboardingId: string,
  ): Promise<{ ok: boolean; notified: number }> =>
    http
      .post<ApiResponse<{ ok: boolean; notified: number }>>(
        `/onboarding/${onboardingId}/alert-medical`,
        {},
      )
      .then((r) => r.data),

  // --- medical officer ---
  medicalQueue: (): Promise<MedicalQueueItem[]> =>
    http
      .get<ApiResponse<MedicalQueueItem[]>>('/onboarding/medical-queue')
      .then((r) => r.data),

  setMedical: (
    onboardingId: string,
    body: { status: MedicalStatus; note?: string; manual?: boolean },
  ): Promise<{ ok: boolean }> =>
    http
      .patch<ApiResponse<{ ok: boolean }>>(
        `/onboarding/${onboardingId}/medical`,
        body,
      )
      .then((r) => r.data),

  getMedicalExam: (onboardingId: string): Promise<MedicalExam> =>
    http
      .get<ApiResponse<MedicalExam>>(`/onboarding/${onboardingId}/medical-exam`)
      .then((r) => r.data),

  upsertMedicalExam: (
    onboardingId: string,
    body: Partial<MedicalExam>,
  ): Promise<MedicalExam> =>
    http
      .patch<ApiResponse<MedicalExam>>(
        `/onboarding/${onboardingId}/medical-exam`,
        body,
      )
      .then((r) => r.data),

  uploadMedicalReport: (
    onboardingId: string,
    file: File,
  ): Promise<{ id: string; label: string; url: string; mimeType: string; createdAt: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    return http
      .post<
        ApiResponse<{
          id: string;
          label: string;
          url: string;
          mimeType: string;
          createdAt: string;
        }>
      >(`/onboarding/${onboardingId}/medical-report`, fd, MULTIPART)
      .then((r) => r.data);
  },

  // --- public (candidate, by token) ---
  publicGet: (token: string): Promise<PublicOnboarding> =>
    http
      .get<ApiResponse<PublicOnboarding>>(`/onboarding/public/${token}`)
      .then((r) => r.data),

  publicUpload: (
    token: string,
    label: string,
    file: File,
  ): Promise<{ ok: boolean }> => {
    const fd = new FormData();
    fd.append('label', label);
    fd.append('file', file);
    return http
      .post<ApiResponse<{ ok: boolean }>>(
        `/onboarding/public/${token}/docs`,
        fd,
        MULTIPART,
      )
      .then((r) => r.data);
  },

  publicAccept: (token: string): Promise<{ ok: boolean }> =>
    http
      .post<ApiResponse<{ ok: boolean }>>(
        `/onboarding/public/${token}/accept-offer`,
      )
      .then((r) => r.data),

  publicDecline: (
    token: string,
    reason: string,
  ): Promise<{ ok: boolean; alreadyDeclined: boolean }> =>
    http
      .post<ApiResponse<{ ok: boolean; alreadyDeclined: boolean }>>(
        `/onboarding/public/${token}/decline-offer`,
        { reason },
      )
      .then((r) => r.data),
};
