interface Perms {
  isSuperUser?: boolean;
  roles?: { key: string }[];
}

/**
 * HR Insights are for management, Corporate HR / CHRO and super users.
 * `role` is the User.role (admin / hr_manager / management / employee).
 */
export function canAccessInsights(
  perms: Perms | undefined | null,
  role?: string,
): boolean {
  if (perms?.isSuperUser) return true;
  if (role && ['admin', 'hr_manager', 'management'].includes(role)) return true;
  return (perms?.roles ?? []).some(
    (r) => r.key === 'corporate_hr' || r.key === 'chro' || r.key === 'super_user',
  );
}
