/**
 * "today" / "tomorrow" / "overdue" for a scheduled interview, by calendar day
 * in the viewer's own time zone.
 *
 * It used to round the hours up to whole days, so an interview three hours
 * away read "tomorrow" — on a card whose date said today.
 */
export function interviewUrgency(
  iso: string | null,
  now: Date = new Date()
): 'overdue' | 'today' | 'tomorrow' | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(at) - startOfDay(now)) / 86_400_000);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return null;
}
