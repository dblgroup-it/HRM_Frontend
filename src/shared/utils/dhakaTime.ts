/**
 * Interview times are Dhaka time (GMT+6), whoever is looking.
 *
 * A `datetime-local` box has no zone: the browser reads what is typed in the
 * computer's own zone, and a bare "2026-10-01T11:30" sent to the API is read
 * in the server's. Both happen to be Dhaka most days — and the day they are
 * not (a laptop set to UTC, a recruiter travelling) every interview lands six
 * hours out. So the boxes always mean GMT+6, and times go to the API with the
 * offset attached. Bangladesh has no daylight saving, so the offset is fixed.
 */
export const DHAKA_OFFSET = '+06:00';
const OFFSET_MS = 6 * 60 * 60 * 1000;

/** "2026-10-01T11:30" typed in a box → an ISO instant in GMT+6. */
export function dhakaInputToIso(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const withSeconds = /T\d{2}:\d{2}$/.test(v) ? `${v}:00` : v;
  return `${withSeconds}${DHAKA_OFFSET}`;
}

/** An ISO instant → the "2026-10-01T11:30" a box shows, in GMT+6. */
export function isoToDhakaInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + OFFSET_MS);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}
