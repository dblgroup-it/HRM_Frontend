import type { RequisitionDrive } from '@modules/requisition/types/requisition.types';

export type CandidateStage =
  | 'applied'
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
  createdAt: string;
  updatedAt: string;
}

/** Drive workspace status for a requisition. */
export interface RecruitmentWorkspace {
  connected: boolean;
  mailConfigured?: boolean;
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
}
