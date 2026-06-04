import { ENV, MOCK_LATENCY } from '@shared/constants';
import { http } from '@shared/api';
import { delay } from '@shared/utils';
import type { ApiResponse } from '@shared/types';

import type { AuthSession, AuthUser, LoginCredentials } from '../types/auth.types';

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
    token: `mock.jwt.${btoa(DEMO_USER.email)}.${Date.now()}`,
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
  login(credentials: LoginCredentials): Promise<AuthSession> {
    if (ENV.USE_MOCK_API) return mockLogin(credentials);
    return http
      .post<ApiResponse<AuthSession>>('/auth/login', credentials)
      .then((res) => res.data);
  },

  me(): Promise<AuthUser> {
    if (ENV.USE_MOCK_API) return mockMe();
    return http.get<ApiResponse<AuthUser>>('/auth/me').then((res) => res.data);
  },

  logout(): Promise<void> {
    if (ENV.USE_MOCK_API) return delay(200);
    return http.post('/auth/logout');
  },
};

export const DEMO_CREDENTIALS = {
  email: DEMO_USER.email,
  password: DEMO_PASSWORD,
} as const;
