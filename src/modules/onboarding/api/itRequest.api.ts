import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  ItRequestAnswer,
  ItRequestDraft,
  ItRequestInput,
  ItRequestPreview,
  ItRequestPublic,
  ItRequestSettings,
  ItRequestView,
} from '../types/itRequest.types';

/** "Notify IT" — the recruiting side. */
export const itRequestApi = {
  draft: (candidateId: string): Promise<ItRequestDraft> =>
    http
      .get<ApiResponse<ItRequestDraft>>(
        `/candidates/${candidateId}/onboarding/it-request/draft`,
      )
      .then((r) => r.data),

  preview: (
    candidateId: string,
    input: ItRequestInput,
  ): Promise<ItRequestPreview> =>
    http
      .post<ApiResponse<ItRequestPreview>>(
        `/candidates/${candidateId}/onboarding/it-request/preview`,
        input,
      )
      .then((r) => r.data),

  send: (
    candidateId: string,
    input: ItRequestInput,
  ): Promise<{ request: ItRequestView }> =>
    http
      .post<ApiResponse<{ request: ItRequestView }>>(
        `/candidates/${candidateId}/onboarding/it-request`,
        input,
      )
      .then((r) => r.data),

  settings: (): Promise<ItRequestSettings> =>
    http
      .get<ApiResponse<ItRequestSettings>>('/settings/it-requests')
      .then((r) => r.data),

  saveSettings: (input: {
    recipients?: string;
    salutation?: string;
    platform?: string;
  }): Promise<ItRequestSettings> =>
    http
      .patch<ApiResponse<ItRequestSettings>>('/settings/it-requests', input)
      .then((r) => r.data),
};

/** Public — IT's link from the request email. */
export const itRequestPublicApi = {
  get: (token: string): Promise<ItRequestPublic> =>
    http
      .get<ApiResponse<ItRequestPublic>>(`/it-request/${token}`)
      .then((r) => r.data),

  complete: (
    token: string,
    answer: ItRequestAnswer,
  ): Promise<{ ok: boolean; alreadyCompleted: boolean }> =>
    http
      .post<ApiResponse<{ ok: boolean; alreadyCompleted: boolean }>>(
        `/it-request/${token}/complete`,
        answer,
      )
      .then((r) => r.data),
};
