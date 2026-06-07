import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requisitionApi } from '../api/requisition.api';
import { requisitionKeys } from './useRequisitions';
import type {
  ApprovalDecision,
  PreferredSource,
  Requisition,
  UpdateRequisitionInput,
} from '../types/requisition.types';

/** Shared cache-sync helper for single-requisition mutations. */
function useSyncRequisition() {
  const queryClient = useQueryClient();
  return (updated: Requisition) => {
    queryClient.setQueryData(requisitionKeys.detail(updated.id), updated);
    void queryClient.invalidateQueries({ queryKey: requisitionKeys.all });
  };
}

/** Edit requisition details (allowed for the current approver while pending). */
export function useUpdateRequisition() {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateRequisitionInput;
    }) => requisitionApi.update(id, input),
    onSuccess: sync,
  });
}

/** Step 2 — act on the next pending sign-off in the chain. */
export function useApprovalAction() {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: ApprovalDecision;
      note: string;
    }) => requisitionApi.act(id, decision, note),
    onSuccess: sync,
  });
}

/** Step 3 — AI role-profile generation. */
export function useGenerateRoleProfile() {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: (id: string) => requisitionApi.generateRoleProfile(id),
    onSuccess: sync,
  });
}

/** Step 4 — publish to preferred candidate sources. */
export function usePostRequisition() {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: ({
      id,
      sources,
      closingDate,
    }: {
      id: string;
      sources: PreferredSource[];
      closingDate: string;
    }) => requisitionApi.post(id, sources, closingDate),
    onSuccess: sync,
  });
}
