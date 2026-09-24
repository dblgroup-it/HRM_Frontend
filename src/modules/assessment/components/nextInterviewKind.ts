import type { InterviewKindKey } from '../types/assessment.types';

/**
 * What the rule reads off a candidate. Loose on purpose: some callers pass a
 * full pipeline row, others only an id and a name (the delegate's board),
 * and those fall back to a first interview.
 */
type Row = {
  id?: string;
  name?: string;
  stage?: string;
  completedRounds?: string[];
  firstRoundByFactory?: boolean;
  firstInterviewHold?: unknown;
};

/**
 * The interview a candidate is due next.
 *
 * The first counts as done when it was held, when the candidate has already
 * been put through to Final, or when the factory ran it and has given its
 * verdict (the hold is gone) — a factory round is not always marked
 * completed before the verdict is.
 */
export function nextInterviewKind(c: Row): InterviewKindKey {
  const done = new Set(c.completedRounds ?? []);
  if (c.stage === 'final' || (c.firstRoundByFactory && !c.firstInterviewHold)) {
    done.add('first');
  }
  if (!done.has('first')) return 'first';
  if (!done.has('second')) return 'second';
  return 'final';
}

const ORDER: InterviewKindKey[] = ['first', 'second', 'final'];

/**
 * One interview type for a whole batch: the one most of them are due, the
 * later one on a tie. Also who in the batch is due something else, so the
 * modal can name them rather than let the server refuse them one by one.
 */
export function suggestBatchKind(
  rows: (Row & { name: string })[],
): { kind: InterviewKindKey; others: { name: string; due: InterviewKindKey }[] } {
  const count = new Map<InterviewKindKey, number>();
  const due = rows.map((r) => ({ name: r.name, due: nextInterviewKind(r) }));
  for (const d of due) count.set(d.due, (count.get(d.due) ?? 0) + 1);
  let kind: InterviewKindKey = 'first';
  let best = -1;
  for (const k of ORDER) {
    const n = count.get(k) ?? 0;
    if (n > 0 && n >= best) {
      kind = k;
      best = n;
    }
  }
  return { kind, others: due.filter((d) => d.due !== kind) };
}
