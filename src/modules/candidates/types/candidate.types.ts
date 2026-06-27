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
  salaryExpectation: string;
  /** AI CV-screening match score (0-100) + rationale, null until screened. */
  matchScore: number | null;
  matchSummary: string;
  screenedAt: string | null;
  viewedAt: string | null;
  /** How many requisitions this candidate's email has been used to apply to. */
  applyCount: number;
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

/** AI side-by-side ranking of interview/final-stage candidates. */
export interface FinalistRanking {
  id: string;
  name: string;
  stage: string;
  matchScore: number | null;
  rank: number;
  strengths: string[];
  risks: string[];
  verdict: string;
}

export interface FinalistComparison {
  recommendation: string;
  ranking: FinalistRanking[];
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

export interface CareerListing {
  id: string;
  code: string;
  designation: string;
  department: string;
  unitFactory: string;
  placeOfPosting: string;
  employmentNature: string;
  requiredPosts: number;
  summary: string | null;
  postedAt: string;
}

export interface ApplicationStatus {
  requisitionId: string;
  code: string;
  designation: string;
  unitFactory: string;
  stage: string;
  appliedAt: string;
}

export interface PublicApplyInput {
  name: string;
  email: string;
  phone?: string;
  salaryExpectation?: string;
}

export interface CreateCandidateInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface ApplyHistoryEntry {
  candidateId: string;
  requisitionId: string;
  code: string;
  designation: string;
  department: string;
  unitFactory: string;
  postedAt: string;
  appliedAt: string;
  viewed: boolean;
  stage: string;
}

export interface ApplyHistory {
  name: string;
  email: string | null;
  total: number;
  applications: ApplyHistoryEntry[];
}

export interface CandidateFilters {
  page?: number;
  pageSize?: number;
  stage?: string;
  minScore?: number | null;
  search?: string;
  sortBy?: 'recent' | 'match' | 'name';
}

export interface CandidateStats {
  total: number;
  notViewed: number;
  finalists: number;
  stageCounts: Record<string, number>;
  band90: number;
  band75: number;
  band50: number;
  band25: number;
  unscreened: number;
}

export interface CandidateMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CandidatePage {
  items: Candidate[];
  meta: CandidateMeta;
  stats: CandidateStats;
}

export interface ScreeningStatus {
  active: boolean;
  done: number;
  total: number;
  shortlisted: number;
}

export interface UpdateCandidateInput {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  stage?: CandidateStage;
  talentPool?: boolean;
}
