import type {
  CandidateStats,
  RequisitionStatus,
} from './types/requisition.types';

export type RequisitionTabKey =
  | 'details'
  | 'approvals'
  | 'posting'
  | 'recruitment'
  | 'assessment'
  | 'interviews'
  | 'onboarding';

/**
 * The tab a requisition opens on when nothing asked for one.
 *
 * Before posting it follows the status, as it always has. Once posted it
 * follows the candidates: a requisition with someone selected is being
 * onboarded, one with people in interview (or the final round) is being
 * interviewed, and opening either on Recruitment sent the person running it
 * one click away from their work on every reload.
 *
 * Only a tab this viewer actually has is ever chosen — Interviews and
 * Onboarding are Corporate HR's and the recruiter's, so everyone else falls
 * through to what they got before.
 */
export function defaultRequisitionTab({
  status,
  driveReady,
  stats,
  available,
}: {
  status: RequisitionStatus;
  /** The Drive workspace exists — Recruitment is empty until it does. */
  driveReady: boolean;
  stats?: CandidateStats;
  available: readonly RequisitionTabKey[];
}): RequisitionTabKey {
  const has = (k: RequisitionTabKey) => available.includes(k);

  if (status === 'posted') {
    if (!has('recruitment') || !driveReady) return 'posting';
    if ((stats?.selected ?? 0) > 0 && has('onboarding')) return 'onboarding';
    if ((stats?.interview ?? 0) + (stats?.final ?? 0) > 0 && has('interviews')) {
      return 'interviews';
    }
    return 'recruitment';
  }
  if (status === 'approved' || status === 'profile_generated') return 'posting';
  if (status === 'draft') return 'details';
  return 'approvals';
}
