import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requisitionApi } from '../api/requisition.api';
import { requisitionKeys } from './useRequisitions';
import type {
  ApprovalDecision,
  FacilityKey,
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

/** HR (whoever's turn it currently is) confirms or skips facility requests. */
export function useUpdateFacilities() {
  const sync = useSyncRequisition();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decisions,
    }: {
      id: string;
      decisions: { key: FacilityKey; status: 'confirmed' | 'skipped'; hrNote?: string }[];
    }) => requisitionApi.updateFacilities(id, decisions),
    onSuccess: (updated) => {
      sync(updated);
      // FacilitiesPanel is also rendered on the Onboarding page, which reads
      // facilities through the ['onboarding', candidateId] cache — a
      // completely separate cache from the requisition one `sync` just
      // updated, so without this it kept showing the stale confirm/skip
      // state until a full page reload.
      void queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
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

/** Corporate HR nominates the recruiter who runs this requisition. */
export function useAssignRecruiter() {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: ({
      id,
      recruiterId,
    }: {
      id: string;
      recruiterId: string | null;
    }) => requisitionApi.assignRecruiter(id, recruiterId),
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

/** Step 3 — save manual edits to the role profile. */
export function useUpdateRoleProfile() {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: {
        summary: string;
        jobDescription: string;
        responsibilities: string[];
        requirements: string[];
      };
    }) => requisitionApi.updateRoleProfile(id, input),
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
