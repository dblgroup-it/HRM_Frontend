import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '@modules/auth';
import { ROUTES } from './paths';

/**
 * Guards the authenticated area. Unauthenticated users are redirected to
 * login, preserving the attempted path so they return after signing in.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
    );
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
