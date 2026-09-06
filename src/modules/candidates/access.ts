/** Minimal shape of the /me/permissions payload we rely on. */
export interface RecruitmentPerms {
  isSuperUser?: boolean;
  roles?: { key: string; unitId: string | null; unitName?: string | null }[];
}

/**
 * Recruitment (the candidate pipeline) is visible to Corporate HR, CHRO and
 * super users — plus the Corporate Recruiter assigned to that requisition.
 *
 * Pass `unitName` to scope the check to a requisition's unit; omit it to ask
 * "can this user see recruitment anywhere?" (for nav gating). Pass
 * `assignment` so an assigned recruiter can reach their own requisition even
 * though they hold neither global role.
 */
export function canAccessRecruitment(
  perms: RecruitmentPerms | undefined | null,
  unitName?: string,
  assignment?: { recruiterId?: string | null; myUserId?: string | null },
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  if (
    assignment?.recruiterId &&
    assignment.myUserId &&
    assignment.recruiterId === assignment.myUserId
  ) {
    return true;
  }
  const unit = unitName?.toLowerCase();
  return (perms.roles ?? []).some(
    (r) =>
      (r.key === 'corporate_hr' || r.key === 'chro') &&
      (!unit ||
        r.unitId === null ||
        (r.unitName ?? '').toLowerCase() === unit),
  );
}

/** True when this user holds the Corporate Recruiter role anywhere. */
export function isCorporateRecruiter(
  perms: RecruitmentPerms | undefined | null,
): boolean {
  if (!perms) return false;
  return (perms.roles ?? []).some((r) => r.key === 'corporate_recruiter');
}
