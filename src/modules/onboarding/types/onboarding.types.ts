import type { Facilities } from '@modules/requisition/types/requisition.types';

export type DocStatus = 'pending' | 'verified' | 'rejected';
export type MedicalStatus = 'pending' | 'submitted' | 'cleared' | 'rejected';

export interface OnboardingDoc {
  id: string;
  label: string;
  url: string;
  mimeType: string;
  status: DocStatus;
  aiExtract: { summary?: string; fields?: Record<string, string> } | null;
  createdAt: string;
}

export type CrossCheckSeverity = 'info' | 'warning' | 'critical';
export type CrossCheckVerdict = 'consistent' | 'minor_issues' | 'discrepancies';

export interface CrossCheckFinding {
  doc: string;
  severity: CrossCheckSeverity;
  detail: string;
}

export interface CrossCheckResult {
  verdict: CrossCheckVerdict;
  overview: string;
  findings: CrossCheckFinding[];
  /** Missing/'ai' = the AI cross-check ran; 'manual' = HR recorded their own verdict instead. */
  source?: 'ai' | 'manual';
  /** Set only when source is 'manual'. */
  reviewedBy?: string;
}

export interface OnboardingView {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  token: string;
  submissionLink: string;
  /** docs_pending | docs_submitted | offer_sent | offer_accepted | medical | hr_final | onboarded */
  status: string;
  /** HR skipped waiting for the candidate to submit documents. */
  docsSkippedAt: string | null;
  /** HR skipped individually verifying every submitted document. */
  verificationSkippedAt: string | null;
  offerSentAt: string | null;
  /** 'junior' or 'senior' — DBL issues two house letter formats. */
  offerFormat: 'junior' | 'senior' | null;
  /** The level this candidate is hired at; null until settled. */
  fixedDesignation?: string | null;
  offerRef: string | null;
  offerJoiningDate: string | null;
  offerJobLocation: string | null;
  offerProbationMonths: number | null;
  offerNoticeDays: number | null;
  offerBenefits: string[];
  candidateAddress: string | null;
  appointmentRef: string | null;
  appointmentSentAt: string | null;
  offerAcceptedAt: string | null;
  /** The candidate turned the offer down; the reason is shown to HR. */
  offerDeclinedAt: string | null;
  offerDeclineReason: string | null;
  /** Required documents nobody has collected yet (empty once HR waives it). */
  missingDocs: string[];
  /** Collected, but still waiting on HR to look at them. */
  pendingDocs: string[];
  /** Code of Conduct acknowledgement — sent to the candidate, signed by them. */
  cocSentAt: string | null;
  cocSignedAt: string | null;
  cocUrl: string | null;
  /** What the candidate told us at acceptance. */
  offerJoiningTentative: string | null;
  /** Their hand-signed copy of the offer, when they returned one. */
  offerSignedUrl: string | null;
  medicalStatus: MedicalStatus;
  medicalNote: string;
  medicalClearedAt: string | null;
  /** What was put forward while a finding waits with the Central Medical Officer. */
  medicalProposed?: 'cleared' | 'rejected' | null;
  medicalSubmittedAt?: string | null;
  /**
   * The Central Medical Officer's note.
   *
   * Present on a returned candidate, and the only record of why it came back —
   * a candidate reappearing in the queue unexplained is the most confusing
   * thing this layer could do.
   */
  medicalCmoNote?: string | null;
  /** The pre-employment test letter: reference, appointment, and when sent. */
  medicalRefNo?: string | null;
  medicalExamAt?: string | null;
  medicalLetterSentAt?: string | null;
  /** Tracked per side — either send can fail on its own. */
  medicalLetterTeamSentAt?: string | null;
  medicalLetterCandidateSentAt?: string | null;
  medicalApprovedAt?: string | null;
  /** Cleared from a paper check rather than the structured report. */
  medicalManual: boolean;
  /** When the medical team was alerted that this candidate is waiting. */
  medicalNotifiedAt: string | null;
  medicalClearedByName: string | null;
  hrVerifiedAt: string | null;
  crossCheck: CrossCheckResult | null;
  crossCheckedAt: string | null;
  archivedAt: string | null;
  archiveFolderUrl: string | null;
  itEmail: string;
  itAssetId: string;
  itNotifiedAt: string | null;
  docs: OnboardingDoc[];
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingCandidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  source: string;
  /** The DBL employee ID the recruiter assigned, once they have. */
  employeeId: string | null;
  matchScore: number | null;
  matchSummary: string;
  requisitionId: string;
  designation: string;
  code: string;
  unit: string;
  department: string;
  /** From Salary Fixation, once finalized — null until then. */
  proposedSalary: number | null;
  salaryJobGrade: string | null;
  /** Laptop/Desktop, Transport, Dormitory, Seating — requested + HR's confirm/skip decision. */
  facilities: Facilities | null;
  /** Fixed appointment terms HR attached on the requisition. */
  specialNotes: string[];
  /** The Corporate Recruiter assigned to this requisition, if any. */
  recruiterId: string | null;
}

export interface OnboardingResult {
  aiConfigured: boolean;
  aiProvider: string;
  mailConfigured: boolean;
  itWebhook: boolean;
  requiredDocs: string[];
  /**
   * Uploaded like the rest, but absent never blocks anything — progress and
   * the "all collected" gate count only the required list.
   */
  optionalDocs?: string[];
  candidate: OnboardingCandidate;
  onboarding: OnboardingView | null;
}

/** One thing that happened to this hire, for the printed record. */
export interface TimelineEvent {
  at: string;
  phase: 'requisition' | 'recruitment' | 'assessment' | 'approval' | 'onboarding';
  title: string;
  detail?: string;
  actor?: string;
}

export interface MedicalExam {
  dateOfBirth: string | null;
  dutyPosition: string;
  refNo: string;
  registrationNo: string;
  examDate: string | null;
  issueDate: string | null;
  consultantName: string;
  height: string;
  weight: string;
  pulse: string;
  bloodPressure: string;
  visionRightEye: string;
  visionLeftEye: string;
  visionWithGlass: boolean | null;
  colorVisionYellow: string;
  colorVisionRed: string;
  colorVisionGreen: string;
  colorVisionBlue: string;
  hearingRightEar: string;
  hearingLeftEar: string;
  speech: string;
  extremities: string;
  noAnemiaJaundiceEtc: boolean | null;
  stableNormotensiveNondiabetic: boolean | null;
  urineTestClear: boolean | null;
  hepatitisBNegative: boolean | null;
  liverFunctionNormal: boolean | null;
  pastIllnessHistory: string;
  familyHistoryDmHtn: boolean | null;
  familyHistoryDetail: string;
  bloodGroup: string;
  fitToJoin: boolean | null;
  remarks: string;
}

export interface MedicalQueueItem extends OnboardingView {
  candidate: {
    id: string;
    name: string;
    email: string;
    /** What to SHOW — the settled level if there is one, else the primary. */
    designation: string;
    /** The requisition's own primary, so the picker can offer the full list. */
    requisitionDesignation?: string;
    /** Other levels this requisition was raised for; empty on most. */
    alternateDesignations?: string[];
    /** The level settled for this person; null until chosen. */
    fixedDesignation?: string | null;
    unit: string;
    department: string;
    location: string;
  };
}

export interface PublicOnboarding {
  candidateName: string;
  code: string;
  designation: string;
  unit: string;
  status: string;
  requiredDocs: string[];
  /**
   * Uploaded like the rest, but absent never blocks anything — progress and
   * the "all collected" gate count only the required list.
   */
  optionalDocs?: string[];
  offerSentAt: string | null;
  offerAcceptedAt: string | null;
  offerDeclinedAt: string | null;
  offerDeclineReason: string | null;
  cocSentAt: string | null;
  cocSignedAt: string | null;
  /** What the candidate told us at acceptance. */
  offerJoiningTentative: string | null;
  /** They have returned a signed copy of the offer. */
  offerSignedAt: boolean;
  /** Their signature is among their documents — the forms sign with it. */
  signatureOnFile: boolean;
  submitted: { id: string; label: string; status: DocStatus }[];
}

/** The terms printed on an offer letter. */
export interface OfferLetterInput {
  format: 'junior' | 'senior';
  salutation?: string;
  address?: string;
  reference?: string;
  joiningDate?: string;
  jobLocation?: string;
  benefits?: string[];
  probationMonths?: number;
  noticeDays?: number;
}

export interface AppointmentLetterInput {
  reference?: string;
  joiningDate?: string;
  address?: string;
}

/** What the Central Medical Officer can do with a submitted finding. */
export type CmoDecision = 'approve' | 'reject' | 'return';

/** One row of the Central Medical Officer's queue. */
export interface MedicalApprovalRow {
  onboardingId: string;
  candidateId: string;
  candidateName: string;
  requisition: {
    id: string;
    code: string;
    designation: string;
    unitFactory: string;
    department: string;
  };
  /** What the examining officer put forward — what is being confirmed. */
  proposed: 'cleared' | 'rejected' | null;
  note: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
  /** The full clinical record. The CMO is medical; they read all of it. */
  exam: MedicalExam | null;
}

/** A bulk decision reports per record — some rows may already be handled. */
export interface MedicalBulkResult {
  decided: number;
  skipped: number;
  results: {
    onboardingId: string;
    ok: boolean;
    status?: string;
    error?: string;
  }[];
}

/** Which pre-employment test list applies. The two differ by an actual test. */
export type MedicalAgeBand = 'below_40' | 'above_40';

/** What the send screen needs before the medical test letter can go out. */
export interface MedicalLetterDraft {
  candidateName: string;
  candidateEmail: string | null;
  unitName: string;
  dateOfBirth: string | null;
  /** Null when there is no usable date of birth — HR must then choose. */
  suggestedBand: MedicalAgeBand | null;
  /** Set once a letter has been sent; a re-send repeats it. */
  refNo: string | null;
  examAt: string | null;
  /** Pre-filled: what this candidate's last letter used, else the default. */
  venue: string;
  band: MedicalAgeBand | null;
  sentAt: string | null;
  teamSentAt: string | null;
  candidateSentAt: string | null;
  /** Resolved from the medical roles — shown before sending, not after. */
  recipients: { name: string; email: string | null; hasEmail: boolean }[];
}

export interface SendMedicalLetterResult {
  refNo: string;
  sent: string[];
  failed: { to: string; reason: string }[];
  skippedNoEmail: string[];
  letterHtml: string;
}
