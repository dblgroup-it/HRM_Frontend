import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';
import type { BoardApproval, BoardGroup, VotePageInfo } from '../types/board.types';

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

  /* Approval */
  listChainApprovers: (
    candidateId: string,
  ): Promise<{
    corporateHr: { id: string; name: string; employeeCode: string }[];
    chro: { id: string; name: string; employeeCode: string }[];
    startsAt: 'corporate_hr' | 'chro' | 'board';
  }> =>
    http
      .get<ApiResponse<{
        corporateHr: { id: string; name: string; employeeCode: string }[];
        chro: { id: string; name: string; employeeCode: string }[];
        startsAt: 'corporate_hr' | 'chro' | 'board';
      }>>(`/candidates/${candidateId}/board-approval/approvers`)
      .then((r) => r.data),

  sendForApproval: (
    candidateId: string,
    memberIds: string[],
    corporateHrId?: string,
    chroId?: string,
  ): Promise<BoardApproval> =>
    http
      .post<ApiResponse<BoardApproval>>(
        `/candidates/${candidateId}/board-approval`,
        { memberIds, corporateHrId, chroId },
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
