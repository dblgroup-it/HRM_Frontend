import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { approvalPathsApi } from '../api/approvalPaths.api';
import type { ApprovalPathLevelInput } from '../types/approval-path.types';

export const approvalPathKeys = {
  all: ['approval-paths'] as const,
};

export function useApprovalPaths() {
  return useQuery({
    queryKey: approvalPathKeys.all,
    queryFn: () => approvalPathsApi.list(),
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: approvalPathKeys.all });
  };
}

export function useAddRaiser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      unitId,
      raiserId,
      department = '',
    }: {
      unitId: string;
      raiserId: string;
      department?: string;
    }) => approvalPathsApi.addRaiser(unitId, raiserId, department),
    onSuccess: invalidate,
  });
}

export function useRemoveRaiser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      unitId,
      raiserId,
      department = '',
      all = false,
    }: {
      unitId: string;
      raiserId: string;
      department?: string;
      all?: boolean;
    }) => approvalPathsApi.removeRaiser(unitId, raiserId, department, all),
    onSuccess: invalidate,
  });
}

export function useSaveApprovalPath() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      unitId,
      raiserId,
      levels,
      department = '',
    }: {
      unitId: string;
      raiserId: string;
      levels: ApprovalPathLevelInput[];
      department?: string;
    }) => approvalPathsApi.replace(unitId, raiserId, levels, department),
    onSuccess: invalidate,
  });
}
