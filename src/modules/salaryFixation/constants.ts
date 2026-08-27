import type { JobGrade } from './types/salaryFixation.types';

export const JOB_GRADES: JobGrade[] = [
  'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9',
  'M10', 'M11', 'M12', 'M13', 'M14', 'M15',
  'T1', 'T2', 'TM1', 'TM2', 'SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6', 'BM2',
];

/**
 * Display only — the backend is authoritative for band/salary computation.
 * M1-M7 are the official HR "Salary Matrix General Stream" policy figures
 * (`verified: true`). Everything else is an extrapolation pending an
 * official HR document (`verified: false`) — see the matching comment in
 * `HRM_Backend/src/modules/salary-fixation/salary-fixation.constants.ts`.
 */
export const GRADES: Record<JobGrade, { min: number; max: number; verified: boolean }> = {
  M1: { min: 20_000, max: 35_000, verified: true },
  M2: { min: 30_000, max: 45_000, verified: true },
  M3: { min: 37_500, max: 60_000, verified: true },
  M4: { min: 50_000, max: 80_000, verified: true },
  M5: { min: 70_000, max: 100_000, verified: true },
  M6: { min: 85_000, max: 130_000, verified: true },
  M7: { min: 110_000, max: 170_000, verified: true },
  M8: { min: 145_000, max: 220_000, verified: false },
  M9: { min: 190_000, max: 285_000, verified: false },
  M10: { min: 245_000, max: 370_000, verified: false },
  M11: { min: 320_000, max: 480_000, verified: false },
  M12: { min: 415_000, max: 625_000, verified: false },
  M13: { min: 540_000, max: 810_000, verified: false },
  M14: { min: 700_000, max: 1_050_000, verified: false },
  M15: { min: 910_000, max: 1_365_000, verified: false },
  T1: { min: 30_000, max: 45_000, verified: false },
  T2: { min: 37_500, max: 60_000, verified: false },
  TM1: { min: 50_000, max: 80_000, verified: false },
  TM2: { min: 70_000, max: 100_000, verified: false },
  SM1: { min: 50_000, max: 80_000, verified: false },
  SM2: { min: 70_000, max: 100_000, verified: false },
  SM3: { min: 85_000, max: 130_000, verified: false },
  SM4: { min: 110_000, max: 170_000, verified: false },
  SM5: { min: 145_000, max: 220_000, verified: false },
  SM6: { min: 190_000, max: 285_000, verified: false },
  BM2: { min: 85_000, max: 130_000, verified: false },
};

export function gradeLabel(grade: JobGrade): string {
  const g = GRADES[grade];
  return `${g.min.toLocaleString('en-IN')} – ${g.max.toLocaleString('en-IN')}`;
}

export const BANDS = Array.from({ length: 11 }, (_, i) => i + 1);

export interface ScreeningResult {
  status: 'not_conducted' | 'pending' | 'pass' | 'fail';
  pct: number | null;
}

/** Instant local feedback for the screening badges as HR types — the
 * backend recomputes this authoritatively on every save. `passPct` is the
 * admin-configured minimum (Settings → Screening), not a fixed number. */
export function evaluateScreeningTest(
  total: number | null | undefined,
  obtained: number | null | undefined,
  conducted: boolean,
  passPct: number,
): ScreeningResult {
  if (!conducted) return { status: 'not_conducted', pct: null };
  if (total == null || obtained == null) return { status: 'pending', pct: null };
  if (total <= 0 || obtained < 0 || obtained > total) {
    return { status: 'pending', pct: null };
  }
  const pct = (obtained / total) * 100;
  return { status: pct >= passPct ? 'pass' : 'fail', pct };
}
