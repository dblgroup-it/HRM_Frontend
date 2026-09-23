import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';
import type {
  BoardApproval,
  BoardGroup,
  SheetApprovers,
  SheetDetail,
  SheetSummary,
  SheetVoteInfo,
  SheetRow,
  VotePageInfo,
} from '../types/board.types';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export const boardApi = {
  /* Groups */
  listGroups: (): Promise<BoardGroup[]> =>
    http.get<ApiResponse<BoardGroup[]>>('/board-groups').then((r) => r.data),

  createGroup: (name: string, description?: string): Promise<BoardGroup> =>
    http.post<ApiResponse<BoardGroup>>('/board-groups', { name, description }).then((r) => r.data),

  updateGroup: (id: string, name?: string, description?: string): Promise<BoardGroup> =>
    http.patch<ApiResponse<BoardGroup>>(`/board-groups/${id}`, { name, description }).then((r) => r.data),

  deleteGroup: (id: string): Promise<{ ok: boolean }> =>
    http.delete<ApiResponse<{ ok: boolean }>>(`/board-groups/${id}`).then((r) => r.data),

  addMembers: (groupId: string, userIds: string[]): Promise<BoardGroup> =>
    http.post<ApiResponse<BoardGroup>>(`/board-groups/${groupId}/members`, { userIds }).then((r) => r.data),

  removeMember: (groupId: string, userId: string): Promise<BoardGroup> =>
    http.delete<ApiResponse<BoardGroup>>(`/board-groups/${groupId}/members/${userId}`).then((r) => r.data),

  /* Hiring Approval Sheets */
  hrInbox: (): Promise<SheetRow[]> =>
    http.get<ApiResponse<SheetRow[]>>('/board-approvals/inbox').then((r) => r.data),

  sheetApprovers: (): Promise<SheetApprovers> =>
    http.get<ApiResponse<SheetApprovers>>('/board-sheets/approvers').then((r) => r.data),

  /**
   * Download one sheet as a styled workbook.
   *
   * Built server-side with ExcelJS — a real .xlsx, not a CSV with a
   * spreadsheet name. Fetched directly rather than through the axios client,
   * which unwraps JSON and would corrupt a binary body.
   */
  exportSheet: async (batchId: string): Promise<void> => {
    const base =
      (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
      'http://localhost:4000/api';
    let token: string | null = null;
    try {
      const raw = localStorage.getItem('hrm.auth');
      token = raw
        ? ((JSON.parse(raw) as { state?: { token?: string } }).state?.token ??
          null)
        : null;
    } catch {
      /* an unreadable store just means no token */
    }
    const res = await fetch(`${base}/board-sheets/${batchId}/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Could not build the Excel file');

    const blob = await res.blob();
    const name =
      /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ??
      `${batchId}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoked late — Safari cancels the download if the URL goes too early.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  sheetDetail: (batchId: string): Promise<SheetDetail> =>
    http
      .get<ApiResponse<SheetDetail>>(`/board-sheets/${batchId}`)
      .then((r) => r.data),

  resendSheet: (
    batchId: string,
  ): Promise<{ sent: number; skipped: string[]; stage: string; reference: string }> =>
    http
      .post<ApiResponse<{ sent: number; skipped: string[]; stage: string; reference: string }>>(
        `/board-sheets/${batchId}/resend`,
      )
      .then((r) => r.data),

  updateSheetRow: (
    approvalId: string,
    patch: {
      education?: string | null;
      totalExperience?: string | null;
      lastOrganization?: string | null;
    },
  ): Promise<{ ok: boolean }> =>
    http
      .patch<ApiResponse<{ ok: boolean }>>(
        `/board-approvals/${approvalId}/sheet-row`,
        patch,
      )
      .then((r) => r.data),

  listSheets: (): Promise<SheetSummary[]> =>
    http.get<ApiResponse<SheetSummary[]>>('/board-sheets').then((r) => r.data),

  sendSheet: (
    approvalIds: string[],
    chroId: string,
    boardMemberIds: string[],
  ): Promise<{ id: string; reference: string; candidates: number }> =>
    http
      .post<ApiResponse<{ id: string; reference: string; candidates: number }>>(
        '/board-sheets',
        { approvalIds, chroId, boardMemberIds },
      )
      .then((r) => r.data),

  getSheet: (token: string): Promise<SheetVoteInfo> =>
    http.get<ApiResponse<SheetVoteInfo>>(`/board-sheet/${token}`).then((r) => r.data),

  submitSheet: (
    token: string,
    decision: 'approved' | 'rejected',
    notes?: string,
  ): Promise<{ ok: boolean; alreadyVoted: boolean }> =>
    http
      .post<ApiResponse<{ ok: boolean; alreadyVoted: boolean }>>(
        `/board-sheet/${token}`,
        { decision, notes },
      )
      .then((r) => r.data),

  /* Approval */
  /** Hand the candidate to Head of Talent Acquisition — nobody is chosen here. */
  sendForApproval: (candidateId: string): Promise<BoardApproval> =>
    http
      .post<ApiResponse<BoardApproval>>(
        `/candidates/${candidateId}/board-approval`,
        {},
      )
      .then((r) => r.data),

  getApprovalStatus: (candidateId: string): Promise<BoardApproval | null> =>
    http.get<ApiResponse<BoardApproval | null>>(`/candidates/${candidateId}/board-approval`).then((r) => r.data),

  hrApprove: (candidateId: string, file: File, note?: string): Promise<BoardApproval> => {
    const fd = new FormData();
    fd.append('file', file);
    if (note) fd.append('note', note);
    return http
      .post<ApiResponse<BoardApproval>>(`/candidates/${candidateId}/board-approval/hr-approve`, fd, MULTIPART)
      .then((r) => r.data);
  },

  /* Public vote */
  getVoteInfo: (token: string): Promise<VotePageInfo> =>
    http.get<ApiResponse<VotePageInfo>>(`/board-vote/${token}`).then((r) => r.data),

  submitVote: (
    token: string,
    notes?: string,
    decision: 'approved' | 'rejected' = 'approved',
  ): Promise<{ ok: boolean; alreadyVoted: boolean }> =>
    http
      .post<ApiResponse<{ ok: boolean; alreadyVoted: boolean }>>(
        `/board-vote/${token}`,
        { notes, decision },
      )
      .then((r) => r.data),
};
