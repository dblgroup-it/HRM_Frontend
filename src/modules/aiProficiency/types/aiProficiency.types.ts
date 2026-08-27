export interface AiProficiencyQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  marks: number;
  grades: string[];
}

export interface AiProficiencyBank {
  questions: AiProficiencyQuestion[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface AddQuestionInput {
  prompt: string;
  options: string[];
  answer: string;
  marks?: number;
  grades: string[];
}

export type UpdateQuestionInput = Partial<AddQuestionInput>;

export interface GenerateQuestionsInput {
  grade: string;
  count: number;
  topic?: string;
}

/** A candidate question the AI proposed — not yet saved to the bank. */
export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  answer: string;
  marks: number;
  grades: string[];
}

export interface BulkAddQuestionsInput {
  items: GeneratedQuestion[];
}

export type AiProficiencyStatus = 'pending' | 'submitted';

/** One time the candidate left the test tab/window or exited fullscreen. */
export interface AiProficiencyViolation {
  leftAt: string;
  returnedAt: string | null;
  endedTest: boolean;
}

export type AiProficiencyTerminationReason = 'candidate' | 'time_up' | 'violation' | null;

export interface AiProficiencyAttempt {
  id: string;
  jobGrade: string;
  status: AiProficiencyStatus;
  totalScore: number | null;
  maxScore: number;
  /** Not the same as maxScore when a question is worth more than 1 mark. */
  questionCount: number;
  timeLimitMinutes: number | null;
  violations: AiProficiencyViolation[];
  terminationReason: AiProficiencyTerminationReason;
  submittedAt: string | null;
  createdAt: string;
  link: string;
  attemptNumber: number;
  maxAttempts: number;
  attemptsRemaining: number;
}

export interface AssignTestInput {
  jobGrade: string;
  questionCount: number;
  notifyCandidate?: boolean;
  timeLimitMinutes?: number;
}

export interface AiProficiencyReviewQuestion {
  id: string;
  prompt: string;
  options: string[];
  marks: number;
  correctAnswer: string;
  candidateAnswer: string | null;
  isCorrect: boolean;
}

export interface AiProficiencyReview {
  jobGrade: string;
  submittedAt: string | null;
  totalScore: number | null;
  maxScore: number;
  terminationReason: AiProficiencyTerminationReason;
  violations: AiProficiencyViolation[];
  questions: AiProficiencyReviewQuestion[];
}

export interface PublicAiProficiencyQuestion {
  id: string;
  prompt: string;
  options: string[];
  marks: number;
}

export interface PublicAiProficiencyData {
  status: string;
  alreadySubmitted: boolean;
  questions: PublicAiProficiencyQuestion[];
  totalScore: number | null;
  maxScore: number;
  timeLimitMinutes: number | null;
  startedAt: string | null;
  /** Authoritative count — survives a page refresh mid-test. */
  violationCount: number;
}
