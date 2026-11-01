import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  CreateAssignmentInput,
  CreateRoleInput,
  MyPermissions,
  Role,
  RoleAssignment,
  SetLayeringOrderInput,
  HrLayering,
  AssignmentRemoval,
  PasswordResetResult,
  DefaultPasswordAudience,
  DefaultPasswordRun,
} from '../types/rbac.types';

export const rbacApi = {
  myPermissions(): Promise<MyPermissions> {
    return http
      .get<ApiResponse<MyPermissions>>('/me/permissions')
      .then((res) => res.data);
  },

  listRoles(): Promise<Role[]> {
    return http.get<ApiResponse<Role[]>>('/roles').then((res) => res.data);
  },

  createRole(input: CreateRoleInput): Promise<Role> {
    return http
      .post<ApiResponse<Role>>('/roles', input)
      .then((res) => res.data);
  },

  deleteRole(id: string): Promise<{ id: string }> {
    return http
      .delete<ApiResponse<{ id: string }>>(`/roles/${id}`)
      .then((res) => res.data);
  },

  listAssignments(): Promise<RoleAssignment[]> {
    return http
      .get<ApiResponse<RoleAssignment[]>>('/role-assignments')
      .then((res) => res.data);
  },

  createAssignment(input: CreateAssignmentInput): Promise<RoleAssignment> {
    return http
      .post<ApiResponse<RoleAssignment>>('/role-assignments', input)
      .then((res) => res.data);
  },

  /** Each unit's Factory HR queue and the recruiter pool, with who is away. */
  hrLayering(): Promise<HrLayering> {
    return http
      .get<ApiResponse<HrLayering>>('/hr-layering')
      .then((res) => res.data);
  },

  /** Reorder a unit's layering (first priority, second priority, …). */
  setLayeringOrder(input: SetLayeringOrderInput): Promise<{ ok: boolean }> {
    return http
      .patch<ApiResponse<{ ok: boolean }>>('/role-assignments/order', input)
      .then((res) => res.data);
  },

  /**
   * Removing a role also clears what it was holding up in Approval Paths —
   * the result says how much, so the page can tell the person.
   */
  deleteAssignment(id: string): Promise<AssignmentRemoval> {
    return http
      .delete<ApiResponse<AssignmentRemoval>>(`/role-assignments/${id}`)
      .then((res) => res.data);
  },

  /** Super-user only: reset a user's password to the default (the server's
   *  DEFAULT_USER_PASSWORD, or the employee code), returned for the toast. */
  resetPassword(userId: string): Promise<PasswordResetResult> {
    return http
      .post<ApiResponse<PasswordResetResult>>(
        `/auth/users/${userId}/reset-password`,
      )
      .then((res) => res.data);
  },

  /** Who can sign in and still holds the default password. */
  defaultPasswordAudience(): Promise<DefaultPasswordAudience> {
    return http
      .get<ApiResponse<DefaultPasswordAudience>>(
        '/access-notices/default-password',
      )
      .then((res) => res.data);
  },

  /** The bulk send's progress. */
  defaultPasswordRun(): Promise<{ run: DefaultPasswordRun | null }> {
    return http
      .get<ApiResponse<{ run: DefaultPasswordRun | null }>>(
        '/access-notices/default-password/run',
      )
      .then((res) => res.data);
  },

  /** Email each of them their sign-in details, in the background. */
  sendDefaultPasswordNotices(): Promise<DefaultPasswordRun> {
    return http
      .post<ApiResponse<DefaultPasswordRun>>('/access-notices/default-password')
      .then((res) => res.data);
  },
};
