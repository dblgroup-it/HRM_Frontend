import { describe, expect, it } from 'vitest';

import { isDelegationDone, isFirstInterviewDone } from './firstInterviewStage';

/**
 * The bug this pins: a candidate put through the first interview moves on
 * from `final` to `selected`, and the board only ever checked for `final` or
 * `rejected` — so people who had already been hired stayed on the delegated
 * interviewer's board asking for a verdict, and the queue could not be
 * emptied.
 */
describe('isFirstInterviewDone', () => {
  it('keeps a candidate who is still being interviewed', () => {
    for (const stage of ['applied', 'ai_shortlisted', 'shortlisted', 'interview']) {
      expect(isFirstInterviewDone(stage)).toBe(false);
    }
  });

  it('lets go of everyone past it — including the ones now hired', () => {
    for (const stage of ['final', 'selected', 'rejected']) {
      expect(isFirstInterviewDone(stage)).toBe(true);
    }
  });

  it('treats an unknown stage as finished rather than reopening the queue', () => {
    // A stage added later belongs to whoever owns that part of the process.
    // Defaulting to "still mine" would put it back on an interviewer's board.
    expect(isFirstInterviewDone('offer_sent')).toBe(true);
  });
});

describe('isDelegationDone', () => {
  it('keeps a finished hand-off finished when the candidate is back at Interview', () => {
    // The recruiter booked the second round: stage is Interview again, but
    // the factory's part ended — it must not reappear on their board.
    expect(
      isDelegationDone({
        completedAt: '2026-10-01T09:00:00.000Z',
        candidate: { stage: 'interview' },
      }),
    ).toBe(true);
  });

  it('is open while the hand-off is not finished', () => {
    expect(
      isDelegationDone({ completedAt: null, candidate: { stage: 'interview' } }),
    ).toBe(false);
  });

  it('still reads older rows from the stage', () => {
    expect(isDelegationDone({ candidate: { stage: 'final' } })).toBe(true);
  });
});
