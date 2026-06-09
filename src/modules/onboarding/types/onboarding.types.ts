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

export interface OnboardingView {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  token: string;
  submissionLink: string;
  /** docs_pending | docs_submitted | offer_sent | offer_accepted | medical | hr_final | onboarded */
  status: string;
  offerSentAt: string | null;
  offerAcceptedAt: string | null;
  medicalStatus: MedicalStatus;
  medicalNote: string;
  medicalClearedAt: string | null;
  hrVerifiedAt: string | null;
  archivedAt: string | null;
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
  requisitionId: string;
  designation: string;
  code: string;
  unit: string;
  department: string;
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
