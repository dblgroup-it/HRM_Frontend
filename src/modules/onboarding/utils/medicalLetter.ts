import type { MedicalAgeBand } from '../types/onboarding.types';

/** The two test lists, as the send and request screens offer them. */
export const MEDICAL_BANDS: [MedicalAgeBand, string, string][] = [
  ['below_40', 'Below 40', '7 tests'],
  ['above_40', '40 & above', '8 tests · adds S/Creatinine'],
];

/** "2026-08-29T10:30" for a datetime-local input. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
