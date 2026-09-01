/** Minimal shape of the /me/permissions payload we rely on. */
export interface UnitConfigPerms {
  isSuperUser?: boolean;
  roles?: { key: string; unitId: string | null; unitName?: string | null }[];
}

/** Dynamic RBAC roles allowed to manage unit configuration — global roles
 * (corporate_hr, chro) see/edit every unit; factory_hr and sbu_head are
 * scoped to the unit(s) they're actually assigned to (enforced server-side,
 * this is just the "can they see the page at all" check). */
export const UNIT_CONFIG_ROLE_KEYS = ['corporate_hr', 'chro', 'factory_hr', 'sbu_head'];

export function canAccessUnitConfig(
  perms: UnitConfigPerms | undefined | null,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some((r) => UNIT_CONFIG_ROLE_KEYS.includes(r.key));
}

/** Loose match on unit name — mirrors the backend's normalizeUnitName intent
 * (trailing punctuation / case drift) closely enough for a client-side
 * display check; the backend is still the source of truth on every write. */
function sameUnitName(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\.+$/, '');
  return norm(a) === norm(b);
}

/**
 * Can this user edit THIS SPECIFIC unit's configuration? Corporate HR/CHRO
 * (global) and super users can edit any unit; Factory HR/SBU Head only the
 * unit(s) they actually hold that role for — same rule the backend enforces,
 * so the UI doesn't offer controls a write would just get rejected for.
 */
export function canEditUnit(
  perms: UnitConfigPerms | undefined | null,
  unitName: string,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some(
    (r) =>
      UNIT_CONFIG_ROLE_KEYS.includes(r.key) &&
      (r.unitId === null || sameUnitName(r.unitName ?? '', unitName)),
  );
}

/** Creating a brand-new unit is restricted to the global roles / super user —
 * Factory HR and SBU Head manage the unit(s) they're already assigned to. */
export function canCreateUnit(
  perms: UnitConfigPerms | undefined | null,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some(
    (r) => r.key === 'corporate_hr' || r.key === 'chro',
  );
}
