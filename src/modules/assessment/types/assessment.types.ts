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

/** One screening test as the scorecard reports it — the mark and its working. */
export interface ScorecardTest {
  enabled: boolean;
  total: number | null;
  obtained: number | null;
  pct: number | null;
  passPct: number;
  status: 'skipped' | 'pending' | 'pass' | 'fail';
  /** The marked answer script, when one was attached. */
  sheetUrl: string | null;
}

/** What one panelist gave, in which round. */
export interface ScorecardInterviewer {
  evaluatorName: string;
  roundKind: string | null;
  total: number;
  max: number;
  pct: number;
  submittedAt: string;
}

export interface ScorecardEntry {
  candidateId: string;
  candidateName: string;
  stage: string;
  cvScore: number | null;
  aiProficiencyScore: number | null;
  interviewAvg: number | null;
  combined: number | null;
  written: ScorecardTest;
  computer: ScorecardTest;
  aiTest: ScorecardTest;
  interviewers: ScorecardInterviewer[];
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
  candidate: { name: string; cvUrl: string | null };
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
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string;
    cvUrl: string | null;
  };
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


/** A shortlisted candidate handed to someone to run the first interview. */
export interface DelegatedCandidate {
  id: string;
  note: string | null;
  createdAt: string;
  delegatedBy: { id: string; name: string } | null;
  /** Others this candidate was handed to as well. */
  alsoAssignedTo: string[];
  requisition: {
    id: string;
    code: string;
    designation: string;
    unitFactory: string;
    department: string;
  };
  candidate: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    stage: string;
    cvUrl: string | null;
    rejectedAt: string | null;
    /** 'first_interview' when a factory-side interviewer turned them down. */
    rejectionStage: string | null;
    rejectionReason: string | null;
    rejectedByName: string | null;
  };
  rounds: {
    id: string;
    kind: string;
    status: string;
    scheduledAt: string | null;
    mode: string;
    location: string | null;
    /** A meeting link was issued, so the session runs online. */
    online: boolean;
    panelists: number;
  }[];
  /** Enabled screening tests only, so a card can show them without a fetch. */
  tests: DelegatedTest[];
}

/** One screening test as it stands for a delegated candidate. */
export interface DelegatedTest {
  key: string;
  label: string;
  total: number | null;
  obtained: number | null;
  /** null means not marked yet, which is not the same as failing. */
  passed: boolean | null;
}

export interface InterviewDelegation {
  id: string;
  note: string | null;
  createdAt: string;
  delegatedTo: { id: string; name: string; employeeCode: string };
  delegatedBy: { id: string; name: string } | null;
  /** 1 on the first send; above that the interviewer has been chased. */
  sendCount: number;
  lastSentAt: string;
  resent: boolean;
  /** Whole days since the most recent send. */
  waitingDays: number;
  stage: DelegationStage;
  stageLabel: string;
  /** Nothing further is owed by the interviewer. */
  complete: boolean;
  scheduledAt: string | null;
}

/**
 * The hand-marked screening picture for one candidate.
 *
 * Deliberately carries no salary fields — whoever ran the first interview may
 * enter marks, but band and proposed salary stay with Head of Talent Acquisition.
 */
export interface ScreeningTests {
  candidateId: string;
  writtenTestEnabled: boolean;
  writtenTestTotal: number | null;
  writtenTestObtained: number | null;
  writtenTestPassPct: number;
  /** The marked answer script, when one was attached. Served by the API. */
  writtenTestSheetUrl: string | null;
  /** This reader has marked it once already and may not change it. */
  writtenTestLocked: boolean;
  computerTestEnabled: boolean;
  computerTestTotal: number | null;
  computerTestObtained: number | null;
  computerTestPassPct: number;
  computerTestSheetUrl: string | null;
  computerTestLocked: boolean;
  aiTestEnabled: boolean;
  aiTestTotal: number | null;
  aiTestObtained: number | null;
  aiTestPassPct: number;
}

export interface ScreeningTestsInput {
  writtenTestEnabled?: boolean;
  writtenTestTotal?: number | null;
  writtenTestObtained?: number | null;
  computerTestEnabled?: boolean;
  computerTestTotal?: number | null;
  computerTestObtained?: number | null;
  aiTestEnabled?: boolean;
}

/**
 * The testing brief attached to a hand-off.
 *
 * Which tests these candidates must sit and out of how many marks — set by
 * Head of Talent Acquisition at send time. Obtained marks are not part of it: those are the
 * interviewer's to record afterwards.
 */
export interface DelegationTests {
  writtenTestEnabled?: boolean;
  writtenTestTotal?: number | null;
  computerTestEnabled?: boolean;
  computerTestTotal?: number | null;
  aiTestEnabled?: boolean;
}

/**
 * How far a delegated candidate has got. Ordered: each is further along than
 * the one before. Mirrors `delegation-progress.ts` on the backend — the two
 * must agree or the board and the interviewer's own list tell different
 * stories about the same candidate.
 */
export type DelegationStage =
  | 'sent'
  | 'scheduled'
  | 'interviewed'
  | 'marked'
  | 'decided';

/** What one interviewer is currently carrying, across all requisitions. */
export interface DelegateWorkload {
  userId: string;
  holds: number;
  /** Handed over with nothing arranged — the number that matters when picking. */
  waiting: number;
  inProgress: number;
  done: number;
  oldestWaitingDays: number;
  resent: number;
}

/** One row of the requisition delegation scoreboard. */
export interface DelegationBoardRow {
  id: string;
  candidate: { id: string; name: string; stage: string };
  delegatedTo: { id: string; name: string; employeeCode: string };
  delegatedBy: { id: string; name: string } | null;
  note: string | null;
  firstSentAt: string;
  lastSentAt: string;
  sendCount: number;
  resent: boolean;
  waitingDays: number;
  stage: DelegationStage;
  stageLabel: string;
  complete: boolean;
  scheduledAt: string | null;
}

export interface DelegationBoard {
  total: number;
  waiting: number;
  inProgress: number;
  done: number;
  delegates: {
    delegateId: string;
    delegate: { id: string; name: string; employeeCode: string };
    holds: number;
    waiting: number;
    done: number;
    oldestWaitingDays: number;
    candidates: DelegationBoardRow[];
  }[];
  items: DelegationBoardRow[];
}
