import type { RecruitmentPerms } from '@modules/onboarding/access';

/** Signs off Factory HR's first-interview finalists for their unit. */
export const FACTORY_HR_HEAD_ROLE_KEY = 'factory_hr_head';

/** May this user open the Factory HR Head's approval queue? */
export function canApproveFirstInterviews(
  perms: RecruitmentPerms | undefined | null,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some((r) => r.key === FACTORY_HR_HEAD_ROLE_KEY);
}
