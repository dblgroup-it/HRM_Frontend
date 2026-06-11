import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  Candidate,
  CreateCandidateInput,
  EmailCandidateInput,
  FinalistComparison,
  PublicApplyInput,
  PublicJobInfo,
  RecruitmentWorkspace,
  TalentPoolCandidate,
  UpdateCandidateInput,
} from '../types/candidate.types';

/** Axios regenerates the multipart boundary when the type is set to this. */
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

function toFormData(input: CreateCandidateInput, cv?: File): FormData {
  const fd = new FormData();
  fd.append('name', input.name);
  if (input.email) fd.append('email', input.email);
  if (input.phone) fd.append('phone', input.phone);
  if (input.notes) fd.append('notes', input.notes);
  if (cv) fd.append('cv', cv);
  return fd;
}

export const candidatesApi = {
  workspace: (reqId: string): Promise<RecruitmentWorkspace> =>
    http
      .get<ApiResponse<RecruitmentWorkspace>>(`/requisitions/${reqId}/recruitment`)
      .then((r) => r.data),

  setupWorkspace: (reqId: string): Promise<RecruitmentWorkspace> =>
    http
      .post<ApiResponse<RecruitmentWorkspace>>(
        `/requisitions/${reqId}/recruitment/setup`,
      )
      .then((r) => r.data),

  list: (reqId: string): Promise<Candidate[]> =>
    http
      .get<ApiResponse<Candidate[]>>(`/requisitions/${reqId}/candidates`)
      .then((r) => r.data),

  talentPool: (): Promise<TalentPoolCandidate[]> =>
    http
      .get<ApiResponse<TalentPoolCandidate[]>>('/candidates/talent-pool')
      .then((r) => r.data),

  syncDrive: (
    reqId: string,
  ): Promise<{ imported: number; candidates: Candidate[] }> =>
    http
      .post<ApiResponse<{ imported: number; candidates: Candidate[] }>>(
        `/requisitions/${reqId}/candidates/sync-drive`,
      )
      .then((r) => r.data),

  create: (
    reqId: string,
    input: CreateCandidateInput,
    cv?: File,
  ): Promise<Candidate> =>
    http
      .post<ApiResponse<Candidate>>(
        `/requisitions/${reqId}/candidates`,
        toFormData(input, cv),
        MULTIPART,
      )
      .then((r) => r.data),

  update: (id: string, input: UpdateCandidateInput): Promise<Candidate> =>
    http
      .patch<ApiResponse<Candidate>>(`/candidates/${id}`, input)
      .then((r) => r.data),

  screen: (id: string): Promise<Candidate> =>
    http
      .post<ApiResponse<Candidate>>(`/candidates/${id}/screen`, undefined, {
        timeout: 90_000,
      })
      .then((r) => r.data),

  screenAll: (
    reqId: string,
  ): Promise<{ screened: number; shortlisted: number; candidates: Candidate[] }> =>
    http
      .post<
        ApiResponse<{
          screened: number;
          shortlisted: number;
          candidates: Candidate[];
        }>
      >(`/requisitions/${reqId}/candidates/screen`, undefined, {
        // Bulk screening runs sequentially through every CV — allow plenty.
        timeout: 600_000,
      })
      .then((r) => r.data),

  compareFinalists: (reqId: string): Promise<FinalistComparison> =>
    http
      .post<ApiResponse<FinalistComparison>>(
        `/requisitions/${reqId}/candidates/compare`,
        undefined,
        { timeout: 120_000 },
      )
      .then((r) => r.data),

  uploadCv: (id: string, cv: File): Promise<Candidate> => {
    const fd = new FormData();
    fd.append('cv', cv);
    return http
      .post<ApiResponse<Candidate>>(`/candidates/${id}/cv`, fd, MULTIPART)
      .then((r) => r.data);
  },

  remove: (id: string): Promise<{ id: string }> =>
    http.delete<ApiResponse<{ id: string }>>(`/candidates/${id}`).then((r) => r.data),

  email: (
    id: string,
    input: EmailCandidateInput,
  ): Promise<{ sent: boolean; to: string }> =>
    http
      .post<ApiResponse<{ sent: boolean; to: string }>>(
        `/candidates/${id}/email`,
        input,
      )
      .then((r) => r.data),

  // --- public application page (no auth) ---
  jobInfo: (reqId: string): Promise<PublicJobInfo> =>
    http.get<ApiResponse<PublicJobInfo>>(`/apply/${reqId}`).then((r) => r.data),

  apply: (
    reqId: string,
    input: PublicApplyInput,
    cv: File,
  ): Promise<{ ok: boolean }> => {
    const fd = new FormData();
    fd.append('name', input.name);
    fd.append('email', input.email);
    if (input.phone) fd.append('phone', input.phone);
    fd.append('cv', cv);
    return http
      .post<ApiResponse<{ ok: boolean }>>(`/apply/${reqId}`, fd, MULTIPART)
      .then((r) => r.data);
  },
};
