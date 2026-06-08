/** Minimal shape of the /me/permissions payload we rely on. */
export interface RecruitmentPerms {
  isSuperUser?: boolean;
  roles?: { key: string; unitId: string | null; unitName?: string | null }[];
}

/**
 * Recruitment (the candidate pipeline) is visible only to Corporate HR, CHRO
 * and super users. Pass `unitName` to scope the check to a requisition's unit;
 * omit it to ask "can this user see recruitment anywhere?" (for nav gating).
 */
export function canAccessRecruitment(
  perms: RecruitmentPerms | undefined | null,
  unitName?: string,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  const unit = unitName?.toLowerCase();
  return (perms.roles ?? []).some(
    (r) =>
      (r.key === 'corporate_hr' || r.key === 'chro') &&
      (!unit ||
        r.unitId === null ||
        (r.unitName ?? '').toLowerCase() === unit),
  );
}
