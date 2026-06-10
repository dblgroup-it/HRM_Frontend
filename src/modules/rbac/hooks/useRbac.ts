import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rbacApi } from '../api/rbac.api';
import type {
  CreateAssignmentInput,
  CreateRoleInput,
} from '../types/rbac.types';

export const rbacKeys = {
  permissions: ['rbac', 'permissions'] as const,
  roles: ['rbac', 'roles'] as const,
  assignments: ['rbac', 'assignments'] as const,
};

/** Current user's effective roles + accessible units (for gating). */
export function useMyPermissions() {
  return useQuery({
    queryKey: rbacKeys.permissions,
    queryFn: () => rbacApi.myPermissions(),
    staleTime: 5 * 60_000,
  });
}

export function useRoles() {
  return useQuery({ queryKey: rbacKeys.roles, queryFn: () => rbacApi.listRoles() });
}

export function useAssignments() {
  return useQuery({
    queryKey: rbacKeys.assignments,
    queryFn: () => rbacApi.listAssignments(),
  });
}

function useRbacInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: rbacKeys.roles });
    void queryClient.invalidateQueries({ queryKey: rbacKeys.assignments });
    void queryClient.invalidateQueries({ queryKey: rbacKeys.permissions });
  };
}

export function useCreateRole() {
  const invalidate = useRbacInvalidation();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => rbacApi.createRole(input),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useRbacInvalidation();
  return useMutation({
    mutationFn: (id: string) => rbacApi.deleteRole(id),
    onSuccess: invalidate,
  });
}

export function useCreateAssignment() {
  const invalidate = useRbacInvalidation();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) =>
      rbacApi.createAssignment(input),
    onSuccess: invalidate,
  });
}

export function useDeleteAssignment() {
  const invalidate = useRbacInvalidation();
  return useMutation({
    mutationFn: (id: string) => rbacApi.deleteAssignment(id),
    onSuccess: invalidate,
  });
}

/** Super-user only: reset a user's password to its default. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (userId: string) => rbacApi.resetPassword(userId),
  });
}
