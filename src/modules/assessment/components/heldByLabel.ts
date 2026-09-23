import type { FirstInterviewHold } from '@modules/candidates';

/**
 * "With Md. Karim", for a candidate whose first interview is out.
 *
 * Its own module because the panel that renders it must export only
 * components or Fast Refresh stops working — the same reason
 * `delegationBoardState` sits beside its board.
 *
 * Names every holder rather than the first one. A candidate handed to two
 * people is handed to two people, and "with Md. Karim" when Nusrat is the one
 * actually arranging it sends the recruiter to the wrong desk.
 */
export function heldByLabel(hold: FirstInterviewHold): string {
  const names = hold.delegates.map((d) => d.name).filter(Boolean);
  if (names.length === 0) return 'another interviewer';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} and ${names.length - 1} others`;
}
