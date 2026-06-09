import type { RequisitionDrive } from '@modules/requisition/types/requisition.types';

export type CandidateStage =
  | 'applied'
  | 'ai_shortlisted'
  | 'shortlisted'
  | 'interview'
  | 'final'
  | 'selected'
  | 'rejected';

export interface Candidate {
  id: string;
  requisitionId: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  stage: CandidateStage;
  cvFileId: string | null;
  cvUrl: string | null;
  notes: string;
  /** AI CV-screening match score (0-100) + rationale, null until screened. */
  matchScore: number | null;
  matchSummary: string;
  screenedAt: string | null;
  talentPool: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A talent-pool candidate with its originating requisition. */
export interface TalentPoolCandidate extends Candidate {
  requisition: {
    id: string;
    code: string;
    designation: string;
    unit: string;
    department: string;
  };
}

/** Drive workspace status for a requisition. */
export interface RecruitmentWorkspace {
  connected: boolean;
  mailConfigured?: boolean;
  aiScreening?: boolean;
  drive: RequisitionDrive | null;
}

export interface EmailCandidateInput {
  subject: string;
  message: string;
}

/** Public job info shown on the application page. */
export interface PublicJobInfo {
  code: string;
  designation: string;
  unitFactory: string;
  department: string;
  placeOfPosting: string;
  requiredPosts: number;
  employmentNature: string;
}

export interface PublicApplyInput {
  name: string;
  email: string;
  phone?: string;
}

export interface CreateCandidateInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface UpdateCandidateInput {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  stage?: CandidateStage;
  talentPool?: boolean;
}
