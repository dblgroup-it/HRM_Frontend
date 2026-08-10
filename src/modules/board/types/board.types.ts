export interface BoardMember {
  id: string;
  name: string;
  email: string | null;
  employeeCode: string;
  employee: { designation: string | null; department: string | null } | null;
}

export interface BoardGroupMembership {
  userId: string;
  groupId: string;
  addedAt: string;
  user: BoardMember;
}

export interface BoardGroup {
  id: string;
  name: string;
  description: string | null;
  members: BoardGroupMembership[];
  createdAt: string;
  updatedAt: string;
}

export type BoardVoteStatus = 'pending' | 'approved';
export type BoardApprovalStatus = 'pending' | 'approved';

export interface BoardVote {
  id: string;
  status: BoardVoteStatus;
  notes: string | null;
  respondedAt: string | null;
  tokenExpiresAt: string;
  member: { id: string; name: string; email: string | null };
}

export interface BoardApproval {
  id: string;
  status: BoardApprovalStatus;
  createdAt: string;
  updatedAt: string;
  requestedBy: { id: string; name: string };
  hrApprovedBy: { id: string; name: string } | null;
  hrApprovalNote: string | null;
  hrApprovedAt: string | null;
  votes: BoardVote[];
}

export interface VotePageInfo {
  alreadyVoted: boolean;
  memberName: string;
  candidate?: {
    name: string;
    designation: string;
    unit: string;
    department: string;
    code: string;
    cvUrl: string | null;
    matchScore: number | null;
    matchSummary: string | null;
  };
}
