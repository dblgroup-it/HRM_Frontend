export type ProvisioningKind = 'admin' | 'it';

export interface ProvisioningRecipientStatus {
  recipientName: string;
  recipientEmail: string;
  sentAt: string;
  confirmedAt: string | null;
  confirmNote: string | null;
  /** Set when this recipient refused; the reason is mandatory, so never empty. */
  declinedAt: string | null;
  declineReason: string | null;
}

export interface FacilityProvisioningItem {
  key: string;
  label: string;
  kind: ProvisioningKind;
  /** Everyone notified so far for this facility — may be more than one. */
  recipients: ProvisioningRecipientStatus[];
  /** Whoever confirmed first (any one recipient confirming is enough). */
  confirmedBy: string | null;
  confirmedAt: string | null;
  confirmNote: string | null;
  /** Latest recipient who refused and has not since confirmed — needs HR's attention. */
  declinedBy: string | null;
  declinedAt: string | null;
  declineReason: string | null;
}

export interface FacilityProvisioningStatus {
  items: FacilityProvisioningItem[];
}

export interface SuggestedRecipient {
  userId: string;
  name: string;
  email: string;
  designation: string | null;
  department: string | null;
}

/** One recipient to notify — pick a real employee (userId) or type name+email manually. */
export interface RecipientInput {
  userId?: string;
  name?: string;
  email?: string;
}

export interface NotifyFacilityInput {
  recipients: RecipientInput[];
}

/** Public — what the Admin/IT recipient sees at their confirmation link. */
export interface FacilityConfirmInfo {
  alreadyConfirmed: boolean;
  alreadyDeclined?: boolean;
  declineReason?: string | null;
  recipientName: string;
  facilityKey?: string;
  facilityLabel?: string;
  candidate?: {
    name: string;
    designation: string;
    unit: string;
    department: string;
    code: string;
  };
}
