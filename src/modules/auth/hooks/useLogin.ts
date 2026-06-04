import { useMutation } from '@tanstack/react-query';

import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import type { LoginCredentials } from '../types/auth.types';

/** Login mutation that hydrates the auth store on success. */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (session) => setSession(session),
  });
}
