export type AssessmentTypeKey = 'written' | 'excel' | 'skill' | 'viva';

export interface CommitteeMemberView {
  id: string;
  userId: string;
  name: string;
  employeeCode: string;
  designation: string | null;
  department: string | null;
  role: string;
}

export interface RubricCriterionView {
  id: string;
  label: string;
  maxScore: number;
}

export interface AssessmentComponentView {
  id: string;
  type: AssessmentTypeKey;
  maxScore: number;
}

export interface InterviewQuestion {
  category: string;
  question: string;
}

export interface AssessmentSetup {
  committee: CommitteeMemberView[];
  rubric: RubricCriterionView[];
  plan: AssessmentComponentView[];
  aiEnabled: boolean;
  autoEvalSummary: boolean;
  interviewQuestions: InterviewQuestion[];
  deliberationNotes: string | null;
}

export interface ScorecardEntry {
  candidateId: string;
  candidateName: string;
  stage: string;
  cvScore: number | null;
  examScores: Record<string, number>;
  interviewAvg: number | null;
  combined: number | null;
}

export interface EvaluationSummaryResult {
  summary: string;
}

export interface RubricCriterionInput {
  label: string;
  maxScore: number;
}

export interface AssessmentComponentInput {
  type: AssessmentTypeKey;
  maxScore: number;
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
  questionsSentAt: string | null;
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
  rubric: { id: string; label: string; maxScore: number }[];
  interviewQuestions: InterviewQuestion[];
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

// --- Online exams (Stage 5) ---

export type ExamTypeKey = 'written' | 'excel';
export type ExamQuestionKindKey = 'mcq' | 'text';

export interface ExamQuestionView {
  id: string;
  examType: ExamTypeKey;
  kind: ExamQuestionKindKey;
  prompt: string;
  options: string[] | null;
  answer: string;
  marks: number;
}

export interface ExamBank {
  aiProvider: string | null;
  questions: ExamQuestionView[];
}

export interface AddExamQuestionInput {
  examType: ExamTypeKey;
  kind: ExamQuestionKindKey;
  prompt: string;
  options?: string[];
  answer?: string;
  marks: number;
}

export interface ExamGrade {
  score: number;
  feedback: string;
}

export interface ExamAttemptView {
  id: string;
  examType: ExamTypeKey;
  token: string;
  status: string;
  autoScore: number | null;
  totalScore: number | null;
  maxScore: number;
  submittedAt: string | null;
  createdAt: string;
  link: string;
  grades: Record<string, ExamGrade> | null;
}

export interface ExamAttemptsResult {
  aiProvider: string | null;
  attempts: ExamAttemptView[];
}

export interface PublicExamQuestion {
  id: string;
  kind: ExamQuestionKindKey;
  prompt: string;
  options: string[] | null;
  marks: number;
}

export interface PublicExam {
  status: string;
  examType: ExamTypeKey;
  candidateName: string;
  designation: string;
  code: string;
  questions: PublicExamQuestion[];
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
