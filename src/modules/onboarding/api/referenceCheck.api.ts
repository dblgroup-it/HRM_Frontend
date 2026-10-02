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

  /**
   * AI drafts "Overall comments" from the ratings and answers so far. Only
   * the fields the draft reads are sent — the API refuses unknown ones.
   */
  draftComment: (
    candidateId: string,
    input: ReferenceCheckInput,
  ): Promise<{ comment: string }> =>
    http
      .post<ApiResponse<{ comment: string }>>(
        `/candidates/${candidateId}/reference-checks/draft-comment`,
        {
          ratings: Object.fromEntries(
            Object.entries(input.ratings ?? {}).filter(([, v]) => Boolean(v)),
          ),
          refereeName: input.refereeName || undefined,
          refereeDesignation: input.refereeDesignation || undefined,
          refereeOrganization: input.refereeOrganization || undefined,
          relationship: input.relationship || undefined,
          knownDuration: input.knownDuration || undefined,
          strengths: input.strengths || undefined,
          weaknesses: input.weaknesses || undefined,
          handover: input.handover || undefined,
          rehireEligible: input.rehireEligible || undefined,
          concerns: input.concerns || undefined,
          overallComments: input.overallComments || undefined,
        },
      )
      .then((r) => r.data),

  /** The completed form. Streamed by the API, so it needs no Google account. */
  pdfPath: (candidateId: string, id: string) =>
    `/api/candidates/${candidateId}/reference-checks/${id}/pdf`,
};
