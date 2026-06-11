import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  MedicalQueueItem,
  MedicalStatus,
  OnboardingResult,
  OnboardingView,
  PublicOnboarding,
} from '../types/onboarding.types';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export const onboardingApi = {
  get: (candidateId: string): Promise<OnboardingResult> =>
    http
      .get<ApiResponse<OnboardingResult>>(`/candidates/${candidateId}/onboarding`)
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

  sendOffer: (candidateId: string): Promise<{ onboarding: OnboardingView }> =>
    http
      .post<ApiResponse<{ onboarding: OnboardingView }>>(
        `/candidates/${candidateId}/onboarding/offer`,
      )
      .then((r) => r.data),

  hrVerify: (candidateId: string): Promise<{ onboarding: OnboardingView }> =>
    http
      .post<ApiResponse<{ onboarding: OnboardingView }>>(
        `/candidates/${candidateId}/onboarding/hr-verify`,
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

  // --- medical officer ---
  medicalQueue: (): Promise<MedicalQueueItem[]> =>
    http
      .get<ApiResponse<MedicalQueueItem[]>>('/onboarding/medical-queue')
      .then((r) => r.data),

  setMedical: (
    onboardingId: string,
    body: { status: MedicalStatus; note?: string },
  ): Promise<{ ok: boolean }> =>
    http
      .patch<ApiResponse<{ ok: boolean }>>(
        `/onboarding/${onboardingId}/medical`,
        body,
      )
      .then((r) => r.data),

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
};
