import type { RequisitionDrive } from '@modules/requisition/types/requisition.types';

export type CandidateStage =
  | 'applied'
  | 'ai_shortlisted'
  | 'shortlisted'
  | 'interview'
  | 'final'
  | 'selected'
  | 'rejected';

export interface MatchCriterion {
  label: string;
  weight: number;
  requirement: string;
  applicant: string;
  score: number;
}

/** Whoever a candidate's first interview is currently out with. */
export interface FirstInterviewHold {
  delegates: { id: string; name: string }[];
}

export interface Candidate {
  id: string;
  requisitionId: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  stage: CandidateStage;
  /** Set when an employee referred them; null otherwise. */
  referral?: CandidateReferral | null;
  cvFileId: string | null;
  cvUrl: string | null;
  /**
   * A CV can be rendered from stored data even though no file was sent —
   * every Bdjobs applicant, who applies as fields rather than a document.
   */
  hasGeneratedCv?: boolean;
  notes: string;
  salaryExpectation: number | null;
  /** Finalized salary fixation result — null until Salary Fixation is finalized for this candidate. */
  proposedSalary: number | null;
  salaryJobGrade: string | null;
  /** docs_pending | docs_submitted | offer_sent | offer_accepted | medical | hr_final | onboarded — null until onboarding starts. */
  onboardingStatus: string | null;
  /** AI CV-screening match score (0-100) + rationale, null until screened. */
  matchScore: number | null;
  matchSummary: string;
  matchDetails: MatchCriterion[] | null;
  screenedAt: string | null;
  viewedAt: string | null;
  /** How many requisitions this candidate's email has been used to apply to. */
  applyCount: number;
  talentPool: boolean;
  isRedFlagged: boolean;
  redFlagReason: string | null;
  redFlaggedAt: string | null;
  rejectedAt: string | null;
  /** Where the rejection happened — 'first_interview' is a factory-side call. */
  rejectionStage: string | null;
  rejectionReason: string | null;
  /** Who turned them down, when the query supplies it. */
  rejectedByName: string | null;
  /**
   * Set while this candidate's first interview is out with somebody else.
   *
   * Scheduling a first round advances a candidate to the Interview stage, so
   * a candidate handed to a factory colleague turns up on the recruiter's own
   * Interviews tab — which used to offer full reschedule / edit / reject
   * controls over a round the recruiter had deliberately asked somebody else
   * to run. While this is set the tab shows the candidate but leaves the
   * round alone; it clears when the delegate records their verdict, or when
   * the hand-off is withdrawn.
   */
  firstInterviewHold: FirstInterviewHold | null;
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
  /** Employee referral — the referrer's employee code from the directory. */
  referredByCode?: string;
}

/** Who referred a candidate, as they were when the referral was made. */
export interface CandidateReferral {
  employeeCode: string;
  name: string;
  designation: string | null;
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

export interface TalentBankSearchHit extends TalentPoolCandidate {
  relevance: number;
  reason: string;
}

export interface TalentBankSearchResponse {
  results: TalentBankSearchHit[];
  summary: string;
  query: string;
}

/** A Talent Bank candidate the AI has automatically matched to a requisition. */
export interface TalentBankMatchCandidate extends TalentBankSearchHit {
  matchedAt: string;
  /** Live status against THIS requisition's own pipeline. */
  pipelineStatus: 'not_added' | 'in_pipeline' | 'removed';
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
  salaryExpectation?: number | null;
}
