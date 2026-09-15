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

/** The second pair of eyes on every medical finding. Global, like the backend. */
export const CENTRAL_MEDICAL_ROLE_KEY = 'central_medical_officer';

/** May this user confirm submitted medical findings? */
export function canApproveMedical(
  perms: RecruitmentPerms | undefined | null,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some((r) => r.key === CENTRAL_MEDICAL_ROLE_KEY);
}

/**
 * Is this person here only for medical work?
 *
 * A Medical Officer or Central Medical Officer holding no recruitment role has
 * no business being offered the Organogram or the Requisitions list — they
 * cannot raise, approve or recruit, so those pages are a wall of other
 * people's work with nothing on them to act on. Anyone who also holds a
 * recruitment role keeps the full navigation.
 */
export function isMedicalOnly(
  perms: RecruitmentPerms | undefined | null,
): boolean {
  if (!perms || perms.isSuperUser) return false;
  const keys = (perms.roles ?? []).map((r) => r.key);
  if (!keys.length) return false;
  const medical = [...MEDICAL_ROLE_KEYS, CENTRAL_MEDICAL_ROLE_KEY];
  return keys.every((k) => medical.includes(k));
}

/**
 * Does this person actually hold a medical role — no super-user bypass?
 *
 * Distinct from canAccessMedical / canApproveMedical, which answer "may they
 * open this page" and therefore let a super user through, as super users are
 * let through everywhere.
 *
 * The dashboard asks a different question: "is this queue this person's work?"
 * A super user can open the medical pages and should be able to; putting the
 * queues on their dashboard would be filing someone else's job under their
 * name, on the one screen meant to show what is theirs to do.
 */
export function holdsMedicalExaminerRole(
  perms: RecruitmentPerms | undefined | null,
): boolean {
  return (perms?.roles ?? []).some((r) => MEDICAL_ROLE_KEYS.includes(r.key));
}

export function holdsCentralMedicalRole(
  perms: RecruitmentPerms | undefined | null,
): boolean {
  return (perms?.roles ?? []).some((r) => r.key === CENTRAL_MEDICAL_ROLE_KEY);
}
