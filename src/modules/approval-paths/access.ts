/** Minimal shape of the /me/permissions payload we rely on. */
export interface ApprovalPathPerms {
  isSuperUser?: boolean;
  roles?: { key: string; unitId: string | null; unitName?: string | null }[];
}

/**
 * Approval paths decide who signs off on every requisition in a unit, so
 * configuring them is deliberately narrower than Unit Config: Head of Talent Acquisition,
 * CHRO and super users only. Factory HR / SBU Head can configure their unit's
 * seats but must not be able to rewrite their own approval chain.
 */
export const APPROVAL_PATH_ROLE_KEYS = ['corporate_hr', 'chro'];

export function canConfigureApprovalPaths(
  perms: ApprovalPathPerms | undefined | null,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some((r) =>
    APPROVAL_PATH_ROLE_KEYS.includes(r.key),
  );
}
