import type {
  CandidateStats,
  RequisitionStatus,
} from './types/requisition.types';

export type RequisitionTabKey =
  | 'details'
  | 'analysis'
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

  /**
   * Profile & Posting is not everyone's tab any more — the requisitioner
   * does not get it — so every route to it has to ask whether this viewer
   * actually has one. Choosing a tab that is not on the bar left the page
   * with nothing rendered at all.
   */
  const posting = (): RequisitionTabKey =>
    has('posting') ? 'posting' : has('approvals') ? 'approvals' : 'details';

  if (status === 'posted') {
    if (!has('recruitment') || !driveReady) return posting();
    if ((stats?.selected ?? 0) > 0 && has('onboarding')) return 'onboarding';
    // The interviews panel lists the interview stage and nothing else, so a
    // requisition whose last candidate has moved past it must not open there
    // — that landed people on an empty page with a "1" on the tab.
    if ((stats?.interview ?? 0) > 0 && has('interviews')) return 'interviews';
    return 'recruitment';
  }
  if (status === 'approved' || status === 'profile_generated') return posting();
  // A requisition waiting on its job analysis opens on the tab that holds it
  // — that IS the work at this stage, and whoever it is addressed to should
  // not have to find it.
  if (status === 'pending_job_analysis' && has('analysis')) return 'analysis';
  if (status === 'draft' || status === 'pending_job_analysis') return 'details';
  return 'approvals';
}
