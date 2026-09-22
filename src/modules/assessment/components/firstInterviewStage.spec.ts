import { describe, expect, it } from 'vitest';

import { isFirstInterviewDone } from './firstInterviewStage';

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
