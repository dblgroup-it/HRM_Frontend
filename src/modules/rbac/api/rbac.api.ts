import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  CreateAssignmentInput,
  CreateRoleInput,
  MyPermissions,
  Role,
  RoleAssignment,
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

  deleteAssignment(id: string): Promise<{ id: string }> {
    return http
      .delete<ApiResponse<{ id: string }>>(`/role-assignments/${id}`)
      .then((res) => res.data);
  },
};
