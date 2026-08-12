import { useEffect, useRef } from 'react';

import { useAuthStore } from '@modules/auth';
import { AUTH_UNAUTHORIZED_EVENT } from '@shared/constants';

/**
 * Listens for the 401 signal dispatched by httpClient and clears the live
 * auth store — `ProtectedRoute` reacts to `isAuthenticated` flipping to
 * false and redirects to login on its own, no manual navigation needed here.
 */
export function AuthSync() {
  // Multiple in-flight requests can all 401 at once; only react to the first.
  const handledRef = useRef(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (handledRef.current) return;
      handledRef.current = true;
      useAuthStore.getState().clearSession();
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  // Reset the guard once the user is authenticated again (fresh login).
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (isAuthenticated) handledRef.current = false;
  }, [isAuthenticated]);

  return null;
}
