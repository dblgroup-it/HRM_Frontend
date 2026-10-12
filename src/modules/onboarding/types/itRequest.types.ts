/** "Notify IT" — the request for a new hire's work email, and IT's answer. */

/** Somebody whose account IT is asked to delete. */
export interface ItLeaver {
  name: string;
  code: string | null;
  email: string;
  /** Resigned / Terminated / Retired… as the requisition recorded it. */
  reason: string | null;
}

export interface ItLeaverDone extends ItLeaver {
  deleted: boolean;
}

/** The request as the onboarding page shows it. */
export interface ItRequestView {
  id: string;
  sentTo: string;
  subject: string;
  sentAt: string;
  lastSentAt: string;
  sendCount: number;
  sentByName: string;
  preferredEmail: string | null;
  platform: string;
  deletions: ItLeaver[];
  expiresAt: string;
  completedAt: string | null;
  completedByName: string | null;
  createdEmail: string | null;
  deletionsDone: ItLeaverDone[] | null;
  completionNote: string | null;
  confirmationSentAt: string | null;
  closedAt: string | null;
  closedReason: string | null;
}

/** What the Notify IT dialog starts from. */
export interface ItRequestDraft {
  recipients: string[];
  salutation: string;
  requesterEmail: string | null;
  /** False while outgoing email is switched off — IT would get nothing. */
  deliverable: boolean;
  platforms: string[];
  employee: {
    name: string;
    employeeId: string | null;
    designation: string;
    department: string | null;
    unit: string;
    lineOfBusiness: string | null;
    joiningDate: string | null;
  };
  preferredEmail: string;
  platform: string;
  purpose: string;
  /** The people this hire replaces; `include` = ask IT to delete. */
  deletions: (ItLeaver & { include: boolean; found: boolean })[];
  previous: ItRequestView | null;
}

/** What HR settled in the dialog — also the body of a preview. */
export interface ItRequestInput {
  preferredEmail?: string;
  platform?: string;
  purpose?: string;
  deletions?: ItLeaver[];
}

export interface ItRequestPreview {
  subject: string;
  html: string;
  to: string[];
  cc: string | null;
}

/** IT's page, opened from the link in the email. */
export interface ItRequestPublic {
  state: 'open' | 'completed' | 'closed' | 'expired';
  salutation: string;
  requesterName: string;
  sentAt: string;
  expiresAt: string;
  employee: {
    name: string;
    employeeId: string | null;
    designation: string;
    department: string | null;
    unit: string;
    joiningDate: string | null;
  };
  preferredEmail: string | null;
  platform: string;
  purpose: string | null;
  deletions: ItLeaver[];
  completed: {
    at: string;
    byName: string | null;
    createdEmail: string | null;
    deletions: ItLeaverDone[];
  } | null;
  closedReason: string | null;
}

export interface ItRequestAnswer {
  createdEmail: string;
  completedByName: string;
  /** The addresses IT deleted. */
  deleted: string[];
  note?: string;
}

/** Integrations › IT account requests. */
export interface ItRequestSettings {
  recipients: string[];
  salutation: string;
  platform: string;
}
