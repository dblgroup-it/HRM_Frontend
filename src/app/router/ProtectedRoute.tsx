import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '@modules/auth';
import { ChangePasswordRequiredPage } from '@modules/auth/pages/ChangePasswordRequiredPage';
import { ROUTES } from './paths';

/**
 * Guards the authenticated area. Unauthenticated users are redirected to
 * login, preserving the attempted path so they return after signing in.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
    );
  }

  // An account still holding a provisioned password gets one screen and
  // nothing else. The backend enforces the same restriction independently —
  // this is so the user is told why, not a security control in itself.
  if (mustChangePassword) {
    return <ChangePasswordRequiredPage />;
  }

  return <Outlet />;
}

/** Inverse guard: keeps signed-in users away from the login screen. */
export function PublicOnlyRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
