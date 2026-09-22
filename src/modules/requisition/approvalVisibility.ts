import type { Requisition } from './types/requisition.types';

/** Minimal shape of the /me/permissions payload this needs. */
interface Perms {
  isSuperUser?: boolean;
  roles?: { key: string; unitId: string | null; unitName?: string | null }[];
}

/** The steps that belong to corporate rather than to the unit. */
const CORPORATE_STEP_ROLES = new Set(['corporate_hr', 'chro']);

/**
 * Should this viewer be shown the corporate end of the sign-off chain?
 *
 * The requisitioner and the unit's Factory HR raise and prepare a
 * requisition; whether Head of Talent Acquisition or the CHRO then signs it,
 * and which of them, is corporate business. They see the chain as far as
 * their own unit takes it, and that it has been approved — not the internal
 * step, its named holders, or their remarks in the activity log.
 *
 * Presentation, not an access boundary: the API still returns the whole
 * chain to anyone who may read the requisition. If this needs to be
 * enforced rather than merely not-shown, it has to move to the serializer —
 * which is harder than it looks, because the realtime broadcast pushes one
 * serialized record to every connected client at once.
 *
 * Holding a corporate role wins: somebody who is both Factory HR and Head of
 * Talent Acquisition is Head of Talent Acquisition here, and a recruiter
 * running the hire needs the whole picture.
 */
export function hidesCorporateChain(
  perms: Perms | undefined | null,
  myUserId: string | null | undefined,
  requisition: Pick<Requisition, 'raisedById' | 'unitFactory' | 'recruiter'>,
): boolean {
  if (perms?.isSuperUser) return false;
  const unit = requisition.unitFactory.toLowerCase();
  const roles = perms?.roles ?? [];
  const holds = (key: string) =>
    roles.some(
      (r) =>
        r.key === key &&
        (r.unitId === null || (r.unitName ?? '').toLowerCase() === unit),
    );

  if (holds('corporate_hr') || holds('chro')) return false;
  if (roles.some((r) => r.key === 'corporate_recruiter')) return false;
  if (myUserId && requisition.recruiter?.id === myUserId) return false;

  const isRaiser = !!myUserId && requisition.raisedById === myUserId;
  return isRaiser || holds('factory_hr') || holds('requisition_raiser');
}

/**
 * The chain as this viewer should read it, and the names it hides.
 *
 * The names come back because the activity log is keyed on actor names, not
 * on roles — hiding the step but leaving "Md. Al Amin approved" in the
 * history underneath would defeat the point.
 */
export function visibleChain(
  requisition: Requisition,
  hideCorporate: boolean,
): { chain: Requisition['approvalChain']; hiddenNames: Set<string> } {
  if (!hideCorporate) {
    return { chain: requisition.approvalChain, hiddenNames: new Set() };
  }
  const hiddenNames = new Set<string>();
  /**
   * The recruiter and whoever is standing in for them.
   *
   * They are not on the chain, so filtering the chain alone left their
   * entries in the history underneath it — and those entries are the most
   * corporate thing on the page: which recruiter has the file, and that one
   * of them is on leave until a date. Who is recruiting the vacancy is not
   * something the person who asked for the headcount needs to track.
   */
  for (const person of [requisition.recruiter, requisition.cover]) {
    const name = person?.name?.trim();
    if (name) hiddenNames.add(name.toLowerCase());
  }
  const chain = requisition.approvalChain.filter((step) => {
    if (!step.role || !CORPORATE_STEP_ROLES.has(step.role)) return true;
    // `assignee` on a role-routed step is every holder, comma-joined.
    for (const name of (step.assignee ?? '').split(',')) {
      const trimmed = name.trim();
      if (trimmed) hiddenNames.add(trimmed.toLowerCase());
    }
    return false;
  });
  return { chain, hiddenNames };
}

/** The activity log with the hidden approvers' entries taken out. */
export function visibleActivity(
  requisition: Requisition,
  hiddenNames: Set<string>,
): Requisition['activityLog'] {
  if (hiddenNames.size === 0) return requisition.activityLog;
  return requisition.activityLog.filter(
    (entry) => !hiddenNames.has((entry.actor ?? '').trim().toLowerCase()),
  );
}
