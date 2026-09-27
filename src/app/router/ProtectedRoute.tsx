import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '@modules/auth';
import { useMyPermissions } from '@modules/rbac';
import { FullPageSpinner } from '@shared/components/ui';
import { ChangePasswordRequiredPage } from '@modules/auth/pages/ChangePasswordRequiredPage';
import { ROUTES } from './paths';

/**
 * Guards the authenticated area. Unauthenticated users are redirected to
 * login, preserving the attempted path so they return after signing in.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const sessionVerified = useAuthStore((s) => s.sessionVerified);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
    );
  }

  // A session restored from storage is checked once before anything else
  // loads: the permissions the layout needs anyway, as the one request. If
  // the server refuses it (signed out elsewhere, password changed) the HTTP
  // client clears the session and this redirects — one 401, instead of the
  // dashboard, the bell and the live connection each collecting their own.
  if (!sessionVerified) return <VerifyingSession />;

  // An account still holding a provisioned password gets one screen and
  // nothing else. The backend enforces the same restriction independently —
  // this is so the user is told why, not a security control in itself.
  if (mustChangePassword) {
    return <ChangePasswordRequiredPage />;
  }

  return <Outlet />;
}

/** The one check, and nothing else, while a restored session is confirmed. */
function VerifyingSession() {
  const { isSuccess } = useMyPermissions();
  const markVerified = useAuthStore((s) => s.markVerified);
  useEffect(() => {
    if (isSuccess) markVerified();
  }, [isSuccess, markVerified]);
  return <FullPageSpinner />;
}

/** Inverse guard: keeps signed-in users away from the login screen. */
export function PublicOnlyRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
