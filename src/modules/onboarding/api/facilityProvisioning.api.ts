import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  FacilityConfirmInfo,
  FacilityProvisioningStatus,
  NotifyFacilityInput,
  SuggestedRecipient,
} from '../types/facilityProvisioning.types';

export const facilityProvisioningApi = {
  getStatus: (candidateId: string): Promise<FacilityProvisioningStatus> =>
    http
      .get<ApiResponse<FacilityProvisioningStatus>>(
        `/candidates/${candidateId}/facility-provisioning`,
      )
      .then((r) => r.data),

  suggest: (candidateId: string, key: string): Promise<SuggestedRecipient[]> =>
    http
      .get<ApiResponse<SuggestedRecipient[]>>(
        `/candidates/${candidateId}/facility-provisioning/${key}/suggest`,
      )
      .then((r) => r.data),

  notify: (
    candidateId: string,
    key: string,
    input: NotifyFacilityInput,
  ): Promise<FacilityProvisioningStatus> =>
    http
      .post<ApiResponse<FacilityProvisioningStatus>>(
        `/candidates/${candidateId}/facility-provisioning/${key}/notify`,
        input,
      )
      .then((r) => r.data),
};

/** Public — the Admin/IT recipient's one-time confirmation link. */
export const facilityConfirmApi = {
  get: (token: string): Promise<FacilityConfirmInfo> =>
    http
      .get<ApiResponse<FacilityConfirmInfo>>(`/facility-provisioning/${token}`)
      .then((r) => r.data),

  confirm: (token: string, note?: string): Promise<{ ok: boolean; alreadyConfirmed: boolean }> =>
    http
      .post<ApiResponse<{ ok: boolean; alreadyConfirmed: boolean }>>(
        `/facility-provisioning/${token}/confirm`,
        { note },
      )
      .then((r) => r.data),

  decline: (token: string, reason: string): Promise<{ ok: boolean; alreadyDeclined: boolean }> =>
    http
      .post<ApiResponse<{ ok: boolean; alreadyDeclined: boolean }>>(
        `/facility-provisioning/${token}/decline`,
        { reason },
      )
      .then((r) => r.data),
};
