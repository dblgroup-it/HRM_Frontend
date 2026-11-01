import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rbacApi } from '../api/rbac.api';
import type {
  CreateAssignmentInput,
  CreateRoleInput,
  SetLayeringOrderInput,
} from '../types/rbac.types';

export const rbacKeys = {
  permissions: ['rbac', 'permissions'] as const,
  roles: ['rbac', 'roles'] as const,
  assignments: ['rbac', 'assignments'] as const,
  hrLayering: ['rbac', 'hr-layering'] as const,
  defaultPasswordAudience: ['rbac', 'default-password', 'audience'] as const,
  defaultPasswordRun: ['rbac', 'default-password', 'run'] as const,
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
    // Granting or removing Factory HR changes a unit's layering — and the tab
    // used to keep showing the old queue until a browser reload.
    void queryClient.invalidateQueries({ queryKey: rbacKeys.hrLayering });
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

/** Every unit's Factory HR layering, for the HR Layering tab. */
export function useHrLayering() {
  return useQuery({
    queryKey: rbacKeys.hrLayering,
    queryFn: () => rbacApi.hrLayering(),
    // Always fresh on opening the tab: another admin may have granted or
    // removed someone since, and who is on leave changes by itself.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

/**
 * Reorder a unit's layering. Requisition routing reads it immediately, so the
 * requisition views are refreshed alongside the assignment list.
 */
export function useSetLayeringOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetLayeringOrderInput) =>
      rbacApi.setLayeringOrder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rbacKeys.assignments });
      void queryClient.invalidateQueries({ queryKey: rbacKeys.hrLayering });
      void queryClient.invalidateQueries({ queryKey: ['requisitions'] });
    },
  });
}

export function useDeleteAssignment() {
  const invalidate = useRbacInvalidation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rbacApi.deleteAssignment(id),
    onSuccess: () => {
      invalidate();
      // The chain may have changed with it.
      void queryClient.invalidateQueries({ queryKey: ['approval-paths'] });
      // A removed Factory HR's job analyses go back to the unit's queue.
      void queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Super-user only: reset a user's password to its default. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (userId: string) => rbacApi.resetPassword(userId),
  });
}

/**
 * Who would be emailed their sign-in details. Checking each password takes a
 * few seconds on the server, so it is asked once, when the dialog opens.
 */
export function useDefaultPasswordAudience(enabled: boolean) {
  return useQuery({
    queryKey: rbacKeys.defaultPasswordAudience,
    queryFn: () => rbacApi.defaultPasswordAudience(),
    enabled,
    staleTime: 0,
  });
}

/** The bulk send's progress, every two seconds while it runs. */
export function useDefaultPasswordRun(enabled: boolean) {
  return useQuery({
    queryKey: rbacKeys.defaultPasswordRun,
    queryFn: () => rbacApi.defaultPasswordRun(),
    enabled,
    refetchInterval: (q) =>
      q.state.data?.run && !q.state.data.run.finishedAt ? 2_000 : false,
  });
}

export function useSendDefaultPasswordNotices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rbacApi.sendDefaultPasswordNotices(),
    onSuccess: (run) => {
      queryClient.setQueryData(rbacKeys.defaultPasswordRun, { run });
    },
  });
}
