/**
 * Has the first interview finished with this candidate?
 *
 * The delegated interviewer's job ends when the candidate leaves the first
 * round — whether they were put through, turned down, or have since been
 * hired. Everything after that belongs to Head of Talent Acquisition.
 *
 * This existed as `stage === 'final' || stage === 'rejected'`, inlined in two
 * places, and it was wrong in the same way in both: a candidate who was put
 * through moves on from `final` to `selected`, so people who had already been
 * *hired* sat on the interviewer's board for ever — under "Decision due" if
 * their first round was marked completed, and back under "To schedule" if the
 * interview had been arranged elsewhere and they had no first round at all.
 * Asking for a verdict on somebody who started last week is not a small
 * cosmetic slip: it is a queue that cannot be emptied.
 *
 * Written as "which stages are still open" rather than "which are done", so a
 * stage added later is treated as finished rather than silently reappearing
 * on somebody's board.
 */
const OPEN_STAGES = new Set([
  'applied',
  'ai_shortlisted',
  'shortlisted',
  'interview',
]);

export function isFirstInterviewDone(stage: string): boolean {
  return !OPEN_STAGES.has(stage);
}
