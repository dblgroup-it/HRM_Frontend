/** Minimal shape of the /me/permissions payload we rely on. */
export interface AiSettingsPerms {
  isSuperUser?: boolean;
  roles?: { key: string; unitId: string | null; unitName?: string | null }[];
}

/** AI Settings (and the Screening Pass Marks card on the same page) is
 * visible to Corporate HR / CHRO — both GLOBAL roles, so no unit scoping
 * needed — and super users. */
export function canAccessAiSettings(
  perms: AiSettingsPerms | undefined | null,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some(
    (r) => r.key === 'corporate_hr' || r.key === 'chro',
  );
}
