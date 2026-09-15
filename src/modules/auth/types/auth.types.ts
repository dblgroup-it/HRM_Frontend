import type { ID } from '@shared/types';

export type UserRole = 'admin' | 'hr_manager' | 'management' | 'employee';

export interface AuthUser {
  id: ID;
  employeeCode?: string;
  name: string;
  email: string | null;
  phone?: string | null;
  role: UserRole;
  jobTitle: string | null;
  department: string | null;
  unit?: string | null;
  avatarUrl?: string | null;
  /** The user's e-signature, or null when they have none. */
  signatureUrl?: string | null;
  /** True when they uploaded it themselves — HR may not then replace it. */
  signatureSelfUploaded?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  /**
   * The account still holds a password somebody else chose for it — the
   * employee code it was provisioned with, or an administrator's reset. The
   * backend refuses every other endpoint until it is changed, so the app sends
   * the user straight to the change-password screen.
   */
  mustChangePassword?: boolean;
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
