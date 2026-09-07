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

export type BoardVoteStatus = 'pending' | 'approved' | 'rejected';
export type BoardApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface BoardVote {
  stage: BoardApprovalStage;
  id: string;
  status: BoardVoteStatus;
  notes: string | null;
  respondedAt: string | null;
  tokenExpiresAt: string;
  member: { id: string; name: string; email: string | null };
}

export type BoardApprovalStage = 'corporate_hr' | 'chro' | 'board';

export interface BoardApproval {
  id: string;
  status: BoardApprovalStatus;
  /** Which link of the chain is being waited on. */
  currentStage: BoardApprovalStage;
  rejectedReason: string | null;
  rejectedAt: string | null;
  /** The people named to sign the first two links. */
  corporateHr: { id: string; name: string } | null;
  chro: { id: string; name: string } | null;
  /** How many board members are queued for the final link. */
  boardMemberCount: number;
  createdAt: string;
  updatedAt: string;
  requestedBy: { id: string; name: string };
  hrApprovedBy: { id: string; name: string } | null;
  hrApprovalNote: string | null;
  hrApprovalAttachmentUrl: string | null;
  hrApprovalAttachmentName: string | null;
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
    /** The figure this chain signs off on. Replaces the AI match score. */
    salary: number | null;
  };
  /** Which link of the chain this link belongs to. */
  stage?: 'corporate_hr' | 'chro' | 'board';
  stageLabel?: string;
  decision?: 'approved' | 'rejected';
}
