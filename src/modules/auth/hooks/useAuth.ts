import { useCallback } from 'react';

import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/auth.api';

/** Convenience accessor for auth state plus a logout action. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clearSession);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  return { user, token, isAuthenticated, logout };
}
