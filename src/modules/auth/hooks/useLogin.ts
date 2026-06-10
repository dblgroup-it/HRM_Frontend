import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import {
  isTwoFactorChallenge,
  type LoginCredentials,
} from '../types/auth.types';

/**
 * Login mutation. Hydrates the auth store on a full success; if the account has
 * 2FA, returns the challenge instead (the form then asks for a code).
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (result) => {
      if (isTwoFactorChallenge(result)) return; // form handles the code step
      queryClient.clear();
      setSession(result);
    },
  });
}

/** Second login step — verify the 2FA code and start the session. */
export function useVerifyTwoFactor() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { challengeToken: string; code: string }) =>
      authApi.verifyTwoFactor(input),
    onSuccess: (session) => {
      queryClient.clear();
      setSession(session);
    },
  });
}
