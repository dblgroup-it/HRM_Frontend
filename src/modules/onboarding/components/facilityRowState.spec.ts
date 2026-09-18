import { describe, expect, it } from 'vitest';

import { facilityRowState } from './facilityRowState';
import type {
  FacilityProvisioningItem,
  ProvisioningRecipientStatus,
} from '../types/facilityProvisioning.types';

const recipient = (
  over: Partial<ProvisioningRecipientStatus> = {},
): ProvisioningRecipientStatus => ({
  recipientName: 'A. Person',
  recipientEmail: 'a@example.invalid',
  sentAt: '2026-09-18T10:00:00.000Z',
  confirmedAt: null,
  confirmNote: null,
  declinedAt: null,
  declineReason: null,
  ...over,
});

const item = (over: Partial<FacilityProvisioningItem> = {}): FacilityProvisioningItem => ({
  key: 'transport',
  label: 'Transport Facility',
  kind: 'admin',
  recipients: [],
  confirmedBy: null,
  confirmedAt: null,
  confirmNote: null,
  declinedBy: null,
  declinedAt: null,
  declineReason: null,
  ...over,
});

describe('facilityRowState', () => {
  it('is not_sent before anyone is notified', () => {
    expect(facilityRowState(item()).status).toBe('not_sent');
  });

  it('is pending while a recipient has not answered', () => {
    const state = facilityRowState(item({ recipients: [recipient()] }));
    expect(state.status).toBe('pending');
    expect(state.pendingRecipients).toHaveLength(1);
  });

  it('is declined once the only recipient refuses', () => {
    const state = facilityRowState(
      item({
        recipients: [recipient({ declinedAt: '2026-09-18T11:00:00.000Z', declineReason: 'No stock' })],
        declinedBy: 'A. Person',
        declinedAt: '2026-09-18T11:00:00.000Z',
        declineReason: 'No stock',
      }),
    );
    expect(state.status).toBe('declined');
    expect(state.refused).toBe(true);
    // Someone who has answered is not someone we are still waiting on.
    expect(state.pendingRecipients).toHaveLength(0);
  });

  it('stays pending when one refuses but another still can answer', () => {
    const state = facilityRowState(
      item({
        recipients: [
          recipient({ recipientName: 'A', declinedAt: '2026-09-18T11:00:00.000Z', declineReason: 'No stock' }),
          recipient({ recipientName: 'B' }),
        ],
        declinedBy: 'A',
        declinedAt: '2026-09-18T11:00:00.000Z',
        declineReason: 'No stock',
      }),
    );
    expect(state.status).toBe('pending');
    // HR still needs to read why A said no, even though B might yet arrange it.
    expect(state.refused).toBe(true);
    expect(state.pendingRecipients.map((r) => r.recipientName)).toEqual(['B']);
  });

  it('a confirmation outranks an earlier refusal by someone else', () => {
    const state = facilityRowState(
      item({
        recipients: [
          recipient({ recipientName: 'A', declinedAt: '2026-09-18T11:00:00.000Z', declineReason: 'No stock' }),
          recipient({ recipientName: 'B', confirmedAt: '2026-09-18T12:00:00.000Z' }),
        ],
        confirmedBy: 'B',
        confirmedAt: '2026-09-18T12:00:00.000Z',
        declinedBy: null,
        declinedAt: null,
        declineReason: null,
      }),
    );
    expect(state.status).toBe('confirmed');
    expect(state.refused).toBe(false);
  });
});
