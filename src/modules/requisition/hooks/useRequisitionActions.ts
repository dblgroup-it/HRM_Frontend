import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requisitionApi } from '../api/requisition.api';
import { requisitionKeys } from './useRequisitions';
import type {
  ApprovalDecision,
  FacilityKey,
  JobAnalysisDraftInput,
  JobAnalysisInput,
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

/** Requisitioner resends a clarified requisition; the chain restarts at step 1. */
export function useResubmitRequisition() {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: (id: string) => requisitionApi.resubmit(id),
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
      specialNotes,
    }: {
      id: string;
      decisions?: {
        key: FacilityKey;
        status: 'confirmed' | 'skipped';
        hrNote?: string;
      }[];
      /** The complete list — omit to leave the existing notes untouched. */
      specialNotes?: string[];
    }) => requisitionApi.updateFacilities(id, decisions, specialNotes),
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

/** Head of Talent Acquisition nominates the recruiter who runs this requisition. */
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

/** Step 4 — publish to the DBL career page. */
export function usePostRequisition() {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: ({ id, closingDate }: { id: string; closingDate: string }) =>
      requisitionApi.post(id, closingDate),
    onSuccess: sync,
  });
}

/**
 * Stage 2 — the unit's Factory HR writes the job analysis. Submitting releases
 * the requisition to its approval chain; `submit: false` just saves progress.
 */
export function useSaveJobAnalysis(id: string) {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: (input: JobAnalysisInput) =>
      requisitionApi.saveJobAnalysis(id, input),
    onSuccess: sync,
  });
}

/**
 * Ask the AI to draft section B.
 *
 * Deliberately NOT a `useSyncRequisition` mutation: it writes nothing, it
 * hands back a draft for the writer to edit, and a requisition that quietly
 * changed under them because they pressed "draft" would be the opposite of
 * what this is for.
 */
export function useDraftJobAnalysis(id: string) {
  return useMutation({
    mutationFn: (input: JobAnalysisDraftInput) =>
      requisitionApi.draftJobAnalysis(id, input),
  });
}

/** Factory HR hands the requisition back to the raiser, with a reason. */
export function useReturnForChanges(id: string) {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: (note: string) => requisitionApi.returnForChanges(id, note),
    onSuccess: sync,
  });
}

/** The raiser amends a returned requisition and resends it. */
export function useResendForJobAnalysis(id: string) {
  const sync = useSyncRequisition();
  return useMutation({
    mutationFn: () => requisitionApi.resendForJobAnalysis(id),
    onSuccess: sync,
  });
}
