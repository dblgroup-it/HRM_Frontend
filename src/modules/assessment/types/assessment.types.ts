export interface CommitteeMemberView {
  id: string;
  userId: string;
  name: string;
  employeeCode: string;
  designation: string | null;
  department: string | null;
  role: string;
}

/** One of the 10 fixed, policy-defined evaluation criteria — used both for
 * the hiring-decision scorecard and salary fixation. */
export interface EvaluationCriterionView {
  key: string;
  label: string;
  hint?: string;
  max: number;
  options: [number, string][];
}

export interface AssessmentSetup {
  committee: CommitteeMemberView[];
  aiEnabled: boolean;
  deliberationNotes: string | null;
}

export interface ScorecardEntry {
  candidateId: string;
  candidateName: string;
  stage: string;
  cvScore: number | null;
  aiProficiencyScore: number | null;
  interviewAvg: number | null;
  combined: number | null;
}

export interface EvaluationSummaryResult {
  summary: string;
}

// --- Interviews (Stage 2) ---

export type InterviewKindKey = 'first' | 'second' | 'final';
export type InterviewModeKey = 'online' | 'offline' | 'physical';
export type InterviewStatusKey = 'scheduled' | 'completed' | 'cancelled';

export interface InterviewPanelistView {
  id: string;
  userId: string;
  name: string;
  designation: string | null;
  hasMarked: boolean;
  tokenStatus: 'sent' | 'opened' | 'submitted' | null;
  evalLink: string | null;
}

export interface PublicEvalInterview {
  kind: string;
  mode: string;
  scheduledAt: string | null;
  location: string;
  designation: string;
  unit: string;
}

export interface PublicEvalData {
  status: string;
  alreadySubmitted: boolean;
  panelistName: string;
  candidate: { name: string };
  interview: PublicEvalInterview;
  criteria: EvaluationCriterionView[];
  submittedEval: {
    scores: Record<string, number>;
    comments: string;
    total: number;
  } | null;
}

export interface EvaluationView {
  evaluatorId: string;
  evaluatorName: string;
  scores: Record<string, number>;
  total: number;
  comments: string;
}

export interface BulkScheduleInput {
  candidateIds: string[];
  kind: InterviewKindKey;
  mode: InterviewModeKey;
  scheduledAts?: string[];
  location?: string;
  panelistUserIds: string[];
  notifyCandidate?: boolean;
  notifyPanel?: boolean;
}

export interface InterviewRoundView {
  id: string;
  candidateId: string;
  candidateName: string;
  kind: InterviewKindKey;
  mode: InterviewModeKey;
  scheduledAt: string | null;
  location: string;
  status: InterviewStatusKey;
  meetLink: string | null;
  calendarSynced: boolean;
  criteria: EvaluationCriterionView[];
  panelists: InterviewPanelistView[];
  evaluations: EvaluationView[];
  evaluationCount: number;
}

// --- "My Interviews" (committee marking, Stage 3) ---

export interface MyInterviewRound {
  id: string;
  kind: InterviewKindKey;
  mode: InterviewModeKey;
  scheduledAt: string | null;
  location: string;
  meetLink: string | null;
  status: InterviewStatusKey;
  candidate: { id: string; name: string; email: string; phone: string };
  requisition: { id: string; code: string; designation: string; unit: string };
  criteria: EvaluationCriterionView[];
  myEvaluation: {
    scores: Record<string, number>;
    comments: string;
    total: number;
  } | null;
}

export interface SubmitEvaluationInput {
  scores: Record<string, number>;
  comments?: string;
}

export interface ScheduleInterviewInput {
  kind: InterviewKindKey;
  mode: InterviewModeKey;
  scheduledAt?: string;
  location?: string;
  panelistUserIds: string[];
  notifyCandidate?: boolean;
  notifyPanel?: boolean;
}
