/**
 * How a place in the HR layering is written, everywhere it appears.
 *
 * "First priority" rather than "HR1": the order is read by HR people deciding
 * who covers whom, not by whoever wrote the column, and it has to survive being
 * printed in a sentence ("addressed to you as second priority for this unit").
 */
const WORDS = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
];

/** "First priority" — null when this person has no position in the order. */
export function priorityLabel(priority?: number | null): string | null {
  if (!priority || priority < 1) return null;
  const word = WORDS[priority - 1];
  return word ? `${word} priority` : `Priority ${priority}`;
}

/** The same thing where a column is narrow: "1st priority". */
export function priorityShortLabel(priority?: number | null): string | null {
  if (!priority || priority < 1) return null;
  return `${priority}${ordinalSuffix(priority)} priority`;
}

function ordinalSuffix(n: number): string {
  const teens = n % 100;
  if (teens >= 11 && teens <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
