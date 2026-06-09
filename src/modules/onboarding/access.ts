/** Minimal shape of the /me/permissions payload we rely on. */
export interface RecruitmentPerms {
  isSuperUser?: boolean;
  roles?: { key: string; unitId: string | null; unitName?: string | null }[];
}

/** Either role name is treated as "medical" (matches the backend). */
export const MEDICAL_ROLE_KEYS = ['medical_officer', 'medical_team'];

/**
 * Medical clearance (Phase 5) is visible to Medical Officers / Medical Team
 * members and super users.
 */
export function canAccessMedical(
  perms: RecruitmentPerms | undefined | null,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some((r) => MEDICAL_ROLE_KEYS.includes(r.key));
}
