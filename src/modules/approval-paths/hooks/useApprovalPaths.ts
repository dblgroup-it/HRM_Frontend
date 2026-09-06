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
    mutationFn: ({ unitId, raiserId }: { unitId: string; raiserId: string }) =>
      approvalPathsApi.addRaiser(unitId, raiserId),
    onSuccess: invalidate,
  });
}

export function useRemoveRaiser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ unitId, raiserId }: { unitId: string; raiserId: string }) =>
      approvalPathsApi.removeRaiser(unitId, raiserId),
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
    }: {
      unitId: string;
      raiserId: string;
      levels: ApprovalPathLevelInput[];
    }) => approvalPathsApi.replace(unitId, raiserId, levels),
    onSuccess: invalidate,
  });
}
