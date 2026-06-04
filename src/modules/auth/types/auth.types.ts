import type { ID } from '@shared/types';

export type UserRole = 'admin' | 'hr_manager' | 'employee';

export interface AuthUser {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  jobTitle: string;
  department: string;
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
