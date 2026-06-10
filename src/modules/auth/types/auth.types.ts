import type { ID } from '@shared/types';

export type UserRole = 'admin' | 'hr_manager' | 'management' | 'employee';

export interface AuthUser {
  id: ID;
  employeeCode?: string;
  name: string;
  email: string | null;
  role: UserRole;
  jobTitle: string | null;
  department: string | null;
  unit?: string | null;
  avatarUrl?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

/** Returned by login when the account has 2FA — prompts the code step. */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  method: 'email' | 'totp' | string;
  challengeToken: string;
  email?: string;
}

export type LoginResult = AuthSession | TwoFactorChallenge;

export function isTwoFactorChallenge(
  r: LoginResult,
): r is TwoFactorChallenge {
  return (r as TwoFactorChallenge).twoFactorRequired === true;
}
