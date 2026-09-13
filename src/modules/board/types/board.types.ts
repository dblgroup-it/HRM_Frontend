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

/** One line of a Hiring Approval Sheet — the paper form's columns. */
export interface SheetRow {
  approvalId: string;
  candidateId: string;
  name: string;
  cvUrl: string | null;
  position: string;
  department: string;
  unit: string;
  /** Read from the CV screening extract unless HR corrected it. */
  education: string | null;
  totalExperience: string | null;
  lastOrganization: string | null;
  /** True while Education is still the AI's uncorrected reading. */
  educationFromCv: boolean;
  requisitionCode: string;
  /** "New" or "Replacement". */
  requirement: string;
  /** The manager the vacancy was raised for. */
  team: string;
  salary: number | null;
  /** Who is being replaced, or "New". */
  remark: string;
  /** The vacancy's own sign-off chain, written as one line. */
  approvalChain: string;
  forwardedBy: string;
  forwardedAt: string;
}

/** What the CHRO or a board member sees when they open a sheet link. */
export interface SheetVoteInfo {
  reference: string;
  memberName: string;
  stageLabel: string;
  preparedBy: string;
  status: BoardVoteStatus;
  alreadyVoted: boolean;
  batchStatus: BoardApprovalStatus;
  rejectedReason: string | null;
  rows: SheetRow[];
}

/** A sheet Head of Talent Acquisition has sent, and how far it has got. */
/** One sent sheet with its rows — for printing or exporting. */
export interface SheetDetail {
  id: string;
  reference: string;
  status: BoardApprovalStatus;
  currentStage: BoardApprovalStage;
  preparedBy: string;
  chroName: string | null;
  createdAt: string;
  rows: SheetRow[];
  votes: {
    name: string;
    stage: BoardApprovalStage;
    status: BoardVoteStatus;
    notes: string | null;
    respondedAt: string | null;
  }[];
}

export interface SheetSummary {
  id: string;
  reference: string;
  status: BoardApprovalStatus;
  currentStage: BoardApprovalStage;
  chroName: string | null;
  preparedBy: string;
  candidateCount: number;
  candidateNames: string[];
  rejectedReason: string | null;
  createdAt: string;
  votes: {
    name: string;
    stage: BoardApprovalStage;
    status: BoardVoteStatus;
    notes: string | null;
    respondedAt: string | null;
  }[];
}

/** Who may sign a sheet. */
export interface SheetApprovers {
  chro: { id: string; name: string; employeeCode: string }[];
  groups: {
    id: string;
    name: string;
    members: { id: string; name: string; hasEmail: boolean }[];
  }[];
}
