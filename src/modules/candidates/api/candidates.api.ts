import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  ApplicationStatus,
  ApplyHistory,
  CareerListing,
  Candidate,
  CandidateFilters,
  CandidatePage,
  CreateCandidateInput,
  EmailCandidateInput,
  FinalistComparison,
  PublicApplyInput,
  PublicJobInfo,
  RecruitmentWorkspace,
  ScreeningStatus,
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

  list: (reqId: string, filters: CandidateFilters = {}): Promise<CandidatePage> => {
    const params: Record<string, string | number> = {};
    if (filters.page) params.page = filters.page;
    if (filters.pageSize) params.pageSize = filters.pageSize;
    if (filters.stage) params.stage = filters.stage;
    if (filters.minScore != null) params.minScore = filters.minScore;
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.sortBy) params.sortBy = filters.sortBy;
    return http
      .get<ApiResponse<CandidatePage>>(`/requisitions/${reqId}/candidates`, { params })
      .then((r) => r.data);
  },

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

  screenAll: (reqId: string): Promise<ScreeningStatus & { started: boolean; alreadyRunning: boolean }> =>
    http
      .post<ApiResponse<ScreeningStatus & { started: boolean; alreadyRunning: boolean }>>(
        `/requisitions/${reqId}/candidates/screen`,
        undefined,
        { timeout: 30_000 },
      )
      .then((r) => r.data),

  screeningStatus: (reqId: string): Promise<ScreeningStatus> =>
    http
      .get<ApiResponse<ScreeningStatus>>(`/requisitions/${reqId}/candidates/screening-status`)
      .then((r) => r.data),

  bulkReject: (reqId: string, maxScore: number): Promise<{ rejected: number }> =>
    http
      .post<ApiResponse<{ rejected: number }>>(`/requisitions/${reqId}/candidates/bulk-reject`, { maxScore })
      .then((r) => r.data),

  exportCsv: async (reqId: string, filters: CandidateFilters = {}): Promise<void> => {
    const params = new URLSearchParams();
    if (filters.stage) params.set('stage', filters.stage);
    if (filters.minScore != null) params.set('minScore', String(filters.minScore));
    if (filters.search?.trim()) params.set('search', filters.search.trim());
    if (filters.sortBy) params.set('sortBy', filters.sortBy);

    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000/api';
    const url = `${apiBase}/requisitions/${reqId}/candidates/export?${params}`;

    // Use fetch directly to handle binary response — the axios client unwraps JSON
    const authRaw = localStorage.getItem('hrm.auth');
    let token: string | null = null;
    try { token = authRaw ? (JSON.parse(authRaw) as { state?: { token?: string } }).state?.token ?? null : null; } catch { /* ignore */ }

    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') ?? '';
    const nameMatch = /filename="([^"]+)"/.exec(disposition);
    const filename = nameMatch?.[1] ?? `candidates-${reqId}.xlsx`;

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },

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

  markViewed: (id: string): Promise<{ ok: boolean }> =>
    http.patch<ApiResponse<{ ok: boolean }>>(`/candidates/${id}/view`, {}).then((r) => r.data),

  applyHistory: (id: string): Promise<ApplyHistory> =>
    http.get<ApiResponse<ApplyHistory>>(`/candidates/${id}/apply-history`).then((r) => r.data),

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
  listOpenJobs: (): Promise<CareerListing[]> =>
    http.get<ApiResponse<CareerListing[]>>('/apply/jobs').then((r) => r.data),

  applicationStatus: (email: string): Promise<ApplicationStatus[]> =>
    http
      .get<ApiResponse<ApplicationStatus[]>>('/apply/status', { params: { email } })
      .then((r) => r.data),

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
    if (input.salaryExpectation) fd.append('salaryExpectation', input.salaryExpectation);
    fd.append('cv', cv);
    return http
      .post<ApiResponse<{ ok: boolean }>>(`/apply/${reqId}`, fd, MULTIPART)
      .then((r) => r.data);
  },
};
