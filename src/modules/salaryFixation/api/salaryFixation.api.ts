import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  SalaryFixation,
  UpsertSalaryFixationInput,
} from '../types/salaryFixation.types';

export const salaryFixationApi = {
  get: (candidateId: string): Promise<SalaryFixation> =>
    http
      .get<ApiResponse<SalaryFixation>>(`/candidates/${candidateId}/salary-fixation`)
      .then((r) => r.data),

  upsert: (
    candidateId: string,
    input: UpsertSalaryFixationInput,
  ): Promise<SalaryFixation> =>
    http
      .patch<ApiResponse<SalaryFixation>>(
        `/candidates/${candidateId}/salary-fixation`,
        input,
      )
      .then((r) => r.data),

  markOffered: (candidateId: string): Promise<SalaryFixation> =>
    http
      .post<ApiResponse<SalaryFixation>>(
        `/candidates/${candidateId}/salary-fixation/offer`,
        undefined,
      )
      .then((r) => r.data),

  finalize: (candidateId: string): Promise<SalaryFixation> =>
    http
      .post<ApiResponse<SalaryFixation>>(
        `/candidates/${candidateId}/salary-fixation/finalize`,
        undefined,
      )
      .then((r) => r.data),
};
