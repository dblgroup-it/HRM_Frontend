/** Minimal shape of the /me/permissions payload we rely on. */
export interface EmployeeAdminPerms {
  isSuperUser?: boolean;
  roles?: { key: string }[];
}

/**
 * The roles that may edit an employee record or manage someone's e-signature.
 *
 * Mirrors EMPLOYEE_ADMIN_ROLES on the server, which is the actual gate — this
 * only decides whether the controls are shown. Editing an employee record was
 * once possible for any signed-in user because there was no check anywhere;
 * the server check is the fix, and this exists so nobody is offered a button
 * that will refuse them.
 */
export const EMPLOYEE_ADMIN_ROLE_KEYS = [
  'corporate_hr',
  'chro',
  'corporate_recruiter',
];

export function canAdministerEmployees(
  perms: EmployeeAdminPerms | undefined | null,
): boolean {
  if (!perms) return false;
  if (perms.isSuperUser) return true;
  return (perms.roles ?? []).some((r) =>
    EMPLOYEE_ADMIN_ROLE_KEYS.includes(r.key),
  );
}
