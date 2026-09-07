import type { Facilities } from '@modules/requisition/types/requisition.types';

export type DocStatus = 'pending' | 'verified' | 'rejected';
export type MedicalStatus = 'pending' | 'cleared' | 'rejected';

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
  offerAcceptedAt: string | null;
  medicalStatus: MedicalStatus;
  medicalNote: string;
  medicalClearedAt: string | null;
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
  /** The Corporate Recruiter assigned to this requisition, if any. */
  recruiterId: string | null;
}

export interface OnboardingResult {
  aiConfigured: boolean;
  aiProvider: string;
  mailConfigured: boolean;
  itWebhook: boolean;
  requiredDocs: string[];
  candidate: OnboardingCandidate;
  onboarding: OnboardingView | null;
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
    designation: string;
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
  offerSentAt: string | null;
  offerAcceptedAt: string | null;
  submitted: { id: string; label: string; status: DocStatus }[];
}
