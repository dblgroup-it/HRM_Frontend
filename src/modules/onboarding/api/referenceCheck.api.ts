import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  ReferenceCheck,
  ReferenceCheckInput,
} from '../types/referenceCheck.types';

type List = { items: ReferenceCheck[] };

export const referenceCheckApi = {
  list: (candidateId: string): Promise<List> =>
    http
      .get<ApiResponse<List>>(`/candidates/${candidateId}/reference-checks`)
      .then((r) => r.data),

  create: (candidateId: string, input: ReferenceCheckInput): Promise<List> =>
    http
      .post<ApiResponse<List>>(
        `/candidates/${candidateId}/reference-checks`,
        input,
      )
      .then((r) => r.data),

  update: (
    candidateId: string,
    id: string,
    input: ReferenceCheckInput,
  ): Promise<List> =>
    http
      .patch<ApiResponse<List>>(
        `/candidates/${candidateId}/reference-checks/${id}`,
        input,
      )
      .then((r) => r.data),

  remove: (candidateId: string, id: string): Promise<List> =>
    http
      .delete<ApiResponse<List>>(
        `/candidates/${candidateId}/reference-checks/${id}`,
      )
      .then((r) => r.data),

  /** The completed form. Streamed by the API, so it needs no Google account. */
  pdfPath: (candidateId: string, id: string) =>
    `/api/candidates/${candidateId}/reference-checks/${id}/pdf`,
};
