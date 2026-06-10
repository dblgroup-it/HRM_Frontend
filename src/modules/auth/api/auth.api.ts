import { ENV, MOCK_LATENCY } from '@shared/constants';
import { http } from '@shared/api';
import { delay } from '@shared/utils';
import type { ApiResponse } from '@shared/types';

import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  LoginResult,
} from '../types/auth.types';

/** Seed account for the mock authentication flow. */
const DEMO_USER: AuthUser = {
  id: 'usr_001',
  name: 'Ayesha Rahman',
  email: 'admin@dbl-group.com',
  role: 'admin',
  jobTitle: 'Head of People Operations',
  department: 'Human Resources',
  avatarUrl: null,
};

const DEMO_PASSWORD = 'password123';

async function mockLogin(credentials: LoginCredentials): Promise<AuthSession> {
  await delay(MOCK_LATENCY);

  const emailMatches =
    credentials.email.trim().toLowerCase() === DEMO_USER.email;
  if (!emailMatches || credentials.password !== DEMO_PASSWORD) {
    throw new Error('Invalid email or password. Try the demo credentials.');
  }

  return {
    user: DEMO_USER,
    token: `mock.jwt.${btoa(DEMO_USER.email ?? '')}.${Date.now()}`,
  };
}

async function mockMe(): Promise<AuthUser> {
  await delay(MOCK_LATENCY / 2);
  return DEMO_USER;
}

/**
 * Auth API service.
 *
 * Routes through the mock layer when `VITE_USE_MOCK_API` is true, otherwise
 * issues real HTTP requests through the shared axios client.
 */
export const authApi = {
  login(credentials: LoginCredentials): Promise<LoginResult> {
    if (ENV.USE_MOCK_API) return mockLogin(credentials);
    return http
      .post<ApiResponse<LoginResult>>('/auth/login', {
        identifier: credentials.email,
        password: credentials.password,
      })
      .then((res) => res.data);
  },

  /** Second login step — verify a 2FA code with the challenge token. */
  verifyTwoFactor(input: {
    challengeToken: string;
    code: string;
  }): Promise<AuthSession> {
    return http
      .post<ApiResponse<AuthSession>>('/auth/login/2fa', input)
      .then((res) => res.data);
  },

  me(): Promise<AuthUser> {
    if (ENV.USE_MOCK_API) return mockMe();
    return http.get<ApiResponse<AuthUser>>('/auth/me').then((res) => res.data);
  },

  uploadAvatar(file: File): Promise<{ avatarUrl: string | null }> {
    const fd = new FormData();
    fd.append('image', file);
    return http
      .post<ApiResponse<{ avatarUrl: string | null }>>('/users/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data);
  },

  deleteAvatar(): Promise<{ avatarUrl: string | null }> {
    return http
      .delete<ApiResponse<{ avatarUrl: string | null }>>('/users/me/avatar')
      .then((res) => res.data);
  },

  logout(): Promise<void> {
    // JWT is stateless — the session is cleared client-side; no server call.
    return delay(0);
  },
};

export const DEMO_CREDENTIALS = {
  email: 'admin@dbl-group.com',
  password: DEMO_PASSWORD,
} as const;
