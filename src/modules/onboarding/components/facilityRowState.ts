import type {
  FacilityProvisioningItem,
  ProvisioningRecipientStatus,
} from '../types/facilityProvisioning.types';

export type FacilityRowStatus = 'not_sent' | 'pending' | 'declined' | 'confirmed';

export interface FacilityRowState {
  status: FacilityRowStatus;
  /** Recipients who have not answered either way — the only ones still being waited on. */
  pendingRecipients: ProvisioningRecipientStatus[];
  /** Somebody refused and nobody has since arranged it. */
  refused: boolean;
  arranged: boolean;
}

/**
 * What HR sees for one facility.
 *
 * A facility can be sent to several people and any one of them confirming is
 * enough, so a confirmation always wins over a refusal — and a refusal only
 * becomes the row's headline once nobody else is still able to answer.
 */
export function facilityRowState(item: FacilityProvisioningItem): FacilityRowState {
  const arranged = Boolean(item.confirmedAt);
  const pendingRecipients = item.recipients.filter((r) => !r.confirmedAt && !r.declinedAt);
  const refused = !arranged && Boolean(item.declinedAt);

  const status: FacilityRowStatus = arranged
    ? 'confirmed'
    : refused && pendingRecipients.length === 0
      ? 'declined'
      : item.recipients.length > 0
        ? 'pending'
        : 'not_sent';

  return { status, pendingRecipients, refused, arranged };
}
