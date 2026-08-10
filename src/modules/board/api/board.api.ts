import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';
import type { BoardApproval, BoardGroup, VotePageInfo } from '../types/board.types';

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
  sendForApproval: (candidateId: string, memberIds: string[]): Promise<BoardApproval> =>
    http.post<ApiResponse<BoardApproval>>(`/candidates/${candidateId}/board-approval`, { memberIds }).then((r) => r.data),

  getApprovalStatus: (candidateId: string): Promise<BoardApproval | null> =>
    http.get<ApiResponse<BoardApproval | null>>(`/candidates/${candidateId}/board-approval`).then((r) => r.data),

  hrApprove: (candidateId: string, note?: string): Promise<BoardApproval> =>
    http.post<ApiResponse<BoardApproval>>(`/candidates/${candidateId}/board-approval/hr-approve`, { note }).then((r) => r.data),

  /* Public vote */
  getVoteInfo: (token: string): Promise<VotePageInfo> =>
    http.get<ApiResponse<VotePageInfo>>(`/board-vote/${token}`).then((r) => r.data),

  submitVote: (token: string, notes?: string): Promise<{ ok: boolean; alreadyVoted: boolean }> =>
    http.post<ApiResponse<{ ok: boolean; alreadyVoted: boolean }>>(`/board-vote/${token}`, { notes }).then((r) => r.data),
};
