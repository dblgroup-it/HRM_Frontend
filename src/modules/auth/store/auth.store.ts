import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { STORAGE_KEYS } from '@shared/constants';
import { tokenExpired } from '@shared/api/tokenExpiry';

import type { AuthSession, AuthUser } from '../types/auth.types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Mirrors the backend's own restriction — see AuthSession. */
  mustChangePassword: boolean;
  /**
   * The server has accepted this session since the page loaded. A fresh
   * sign-in is verified by definition; a session restored from storage is
   * not until ProtectedRoute's one check passes. Never persisted.
   */
  sessionVerified: boolean;
  markVerified: () => void;
  setSession: (session: AuthSession) => void;
  /** Called after a successful change: swaps in the fresh token and unblocks. */
  passwordChanged: (token: string) => void;
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
      mustChangePassword: false,
      sessionVerified: false,
      markVerified: () => set({ sessionVerified: true }),
      setSession: (session) =>
        set({
          user: session.user,
          token: session.token,
          isAuthenticated: true,
          mustChangePassword: session.mustChangePassword ?? false,
          sessionVerified: true,
        }),
      passwordChanged: (token) => set({ token, mustChangePassword: false }),
      updateUser: (patch) =>
        set((state) =>
          state.user ? { user: { ...state.user, ...patch } } : state
        ),
      clearSession: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          mustChangePassword: false,
          sessionVerified: false,
        }),
    }),
    {
      name: STORAGE_KEYS.AUTH,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
      }),
      // Yesterday's session is dropped on load, before anything can send it.
      onRehydrateStorage: () => (state) => {
        if (state?.token && tokenExpired(state.token)) state.clearSession();
      },
    }
  )
);
