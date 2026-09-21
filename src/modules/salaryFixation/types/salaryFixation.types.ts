export type JobGrade =
  | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9'
  | 'M10' | 'M11' | 'M12' | 'M13' | 'M14' | 'M15'
  | 'T1' | 'T2' | 'TM1' | 'TM2' | 'SM1' | 'SM2' | 'SM3' | 'SM4' | 'SM5' | 'SM6' | 'BM2';

export type SalaryFixationStatus = 'draft' | 'screening_failed' | 'fixed';

/** One interviewer who has submitted salary-fixation scores from their own
 * interview-evaluation link — read-only, derived from Evaluation records. */
export interface CommitteeScore {
  evaluatorId: string;
  evaluatorName: string;
  /**
   * Which session this mark came from.
   *
   * One evaluator can appear more than once — sitting on both the first and
   * the final round is normal — so this, not evaluatorId, identifies a row.
   */
  roundId: string;
  roundKind: string;
  total: number;
  max: number;
  submittedAt: string;
}

export interface SalaryFixation {
  id: string | null;
  candidateId: string | null;
  jobGrade: JobGrade | null;
  /** null when no grade set yet; false = provisional band, pending an official HR figure. */
  jobGradeVerified: boolean | null;

  writtenTestEnabled: boolean;
  writtenTestTotal: number | null;
  writtenTestObtained: number | null;
  /** The marked answer script, when one was attached. Served by the API. */
  writtenTestSheetUrl: string | null;
  computerTestEnabled: boolean;
  computerTestTotal: number | null;
  computerTestObtained: number | null;
  computerTestSheetUrl: string | null;
  /** HR can skip Step 2 per candidate; defaults true (mandatory). */
  aiTestEnabled: boolean;
  aiTestTotal: number | null;
  aiTestObtained: number | null;

  /** Admin-configured minimum % to pass each test (Settings → Screening). */
  writtenTestPassPct: number;
  computerTestPassPct: number;
  aiTestPassPct: number;

  /** Committee scores, live-derived from Evaluation records — read-only. */
  interviewers: CommitteeScore[];

  averageScore: number | null;
  /** Max possible committee score (sum of the 10 fixed criteria) — the backend's single source of truth. */
  evaluationMax: number;
  computedBand: number | null;
  bandOverride: number | null;
  proposedSalary: number | null;
  /** HR's manual figure — takes precedence over the auto-computed proposedSalary when set. */
  proposedSalaryOverride: number | null;
  /**
   * What the candidate is on today — the floor any offer has to clear.
   * Taken in the interview room, usually by factory HR on the first round.
   */
  presentSalary: number | null;
  /** Allowances and perks they said their current package includes. */
  salaryBenefitsNote: string | null;
  /** What the candidate actually asked for — separate from what we're
   * proposing, so both sides of the negotiation are visible together.
   * Optional; updated as it comes up in interviews. */
  salaryExpectation: number | null;

  status: SalaryFixationStatus;

  /** A figure was formally communicated to the candidate — lighter-weight
   * than finalizing; doesn't require full committee scoring to be done. */
  offeredAt: string | null;
  offeredById: string | null;

  finalizedAt: string | null;
  finalizedById: string | null;

  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpsertSalaryFixationInput {
  jobGrade?: JobGrade;
  writtenTestEnabled?: boolean;
  writtenTestTotal?: number | null;
  writtenTestObtained?: number | null;
  computerTestEnabled?: boolean;
  computerTestTotal?: number | null;
  computerTestObtained?: number | null;
  aiTestEnabled?: boolean;
  aiTestTotal?: number | null;
  aiTestObtained?: number | null;
  bandOverride?: number | null;
  proposedSalaryOverride?: number | null;
}
