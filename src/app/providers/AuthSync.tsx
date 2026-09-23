import { useEffect, useRef } from 'react';

import { useAuthStore } from '@modules/auth';
import { AUTH_UNAUTHORIZED_EVENT, STORAGE_KEYS } from '@shared/constants';

function storedUserId(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: { user?: { id?: string } } };
    return parsed.state?.user?.id ?? null;
  } catch {
    return null;
  }
}

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

  /**
   * Another tab changed who is signed in.
   *
   * Every tab shares one stored session, and the HTTP client reads the token
   * from storage on each request — so signing in as someone else in a second
   * tab (to try out access just granted, say) silently turned this tab into
   * that person, and its admin-only calls started failing; signing out there
   * then threw this one out mid-task. Reload instead, so the page always
   * shows the identity its requests actually carry.
   */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.AUTH) return;
      const mine = useAuthStore.getState().user?.id ?? null;
      if (storedUserId(e.newValue) === mine) return;
      window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Reset the guard once the user is authenticated again (fresh login).
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (isAuthenticated) handledRef.current = false;
  }, [isAuthenticated]);

  return null;
}
