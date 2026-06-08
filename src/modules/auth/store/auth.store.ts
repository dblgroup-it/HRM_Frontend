import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { STORAGE_KEYS } from '@shared/constants';

import type { AuthSession, AuthUser } from '../types/auth.types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  clearSession: () => void;
}

/**
 * Global auth store, persisted to localStorage under `STORAGE_KEYS.AUTH`.
 * The HTTP client reads the same key to attach the bearer token.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setSession: (session) =>
        set({
          user: session.user,
          token: session.token,
          isAuthenticated: true,
        }),
      updateUser: (patch) =>
        set((state) =>
          state.user ? { user: { ...state.user, ...patch } } : state
        ),
      clearSession: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: STORAGE_KEYS.AUTH,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
