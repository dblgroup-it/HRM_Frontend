/** Minimal shape of the /me/permissions payload we rely on. */
export interface RecruitmentPerms {
  isSuperUser?: boolean;
  roles?: { key: string; unitId: string | null; unitName?: string | null }[];
}

/**
 * Recruitment (the candidate pipeline) is visible to Head of Talent Acquisition, CHRO and
 * super users — plus the Corporate Recruiter assigned to that requisition,
 * and whoever is standing in for them while they are on leave.
 *
 * Pass `unitName` to scope the check to a requisition's unit; omit it to ask
 * "can this user see recruitment anywhere?" (for nav gating). Pass
 * `assignment` so an assigned recruiter can reach their own requisition even
 * though they hold neither global role.
 *
 * The cover matters as much as the recruiter: the API lets a stand-in act on
 * everything the recruiter could (`PermissionsService.canRunRecruitment`), so
 * a page that checks only `recruiterId` hands them a requisition they can
 * open and no lifecycle to run on it. The server reports the cover only while
 * it actually applies, so a date check here would be second-guessing it.
 */
export function canAccessRecruitment(
  perms: RecruitmentPerms | undefined | null,
  unitName?: string,
  assignment?: {
    recruiterId?: string | null;
    /** The stand-in, as the requisition reports them (null once lapsed). */
    coverRecruiterId?: string | null;
    myUserId?: string | null;
  },
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  if (
    assignment?.myUserId &&
    (assignment.recruiterId === assignment.myUserId ||
      assignment.coverRecruiterId === assignment.myUserId)
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

/**
 * The candidate pipeline surfaces — Candidates and Talent Bank.
 *
 * Wider than `canAccessRecruitment` on purpose: a Corporate Recruiter reaches
 * these pages in their own right, because the requisitions they are assigned
 * to are only discoverable from here. What they actually see is scoped
 * server-side — the requisition list to what they are recruiting for, and the
 * Talent Bank being a shared pool by design.
 */
export function canViewCandidatePipeline(
  perms: RecruitmentPerms | undefined | null,
): boolean {
  return canAccessRecruitment(perms) || isCorporateRecruiter(perms);
}

/** True when this user holds the Corporate Recruiter role anywhere. */
export function isCorporateRecruiter(
  perms: RecruitmentPerms | undefined | null,
): boolean {
  if (!perms) return false;
  return (perms.roles ?? []).some((r) => r.key === 'corporate_recruiter');
}

/**
 * Head of Talent Acquisition (the `corporate_hr` role) or a super user — who
 * schedules and sends medical tests. Narrower than `canAccessRecruitment`,
 * which also admits the CHRO.
 */
export function isTalentAcquisitionHead(
  perms: RecruitmentPerms | undefined | null,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some((r) => r.key === 'corporate_hr');
}
