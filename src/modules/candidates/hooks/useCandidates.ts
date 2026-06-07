import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { candidatesApi } from '../api/candidates.api';
import type {
  CreateCandidateInput,
  UpdateCandidateInput,
} from '../types/candidate.types';

export const candidateKeys = {
  all: ['candidates'] as const,
  list: (reqId: string) => ['candidates', 'list', reqId] as const,
  workspace: (reqId: string) => ['candidates', 'workspace', reqId] as const,
};

function errMsg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

export function useRecruitmentWorkspace(reqId: string, enabled = true) {
  return useQuery({
    queryKey: candidateKeys.workspace(reqId),
    queryFn: () => candidatesApi.workspace(reqId),
    enabled: Boolean(reqId) && enabled,
  });
}

export function useCandidates(reqId: string, enabled = true) {
  return useQuery({
    queryKey: candidateKeys.list(reqId),
    queryFn: () => candidatesApi.list(reqId),
    enabled: Boolean(reqId) && enabled,
  });
}

export function useSetupWorkspace(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => candidatesApi.setupWorkspace(reqId),
    onSuccess: (ws) => {
      qc.setQueryData(candidateKeys.workspace(reqId), ws);
      qc.invalidateQueries({ queryKey: ['requisitions'] });
      toast.success('Recruitment folders created in Google Drive');
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not set up the Drive folders')),
  });
}

/** Refresh both the candidate list and the requisition (its stage counts). */
function invalidatePipeline(
  qc: ReturnType<typeof useQueryClient>,
  reqId: string,
) {
  qc.invalidateQueries({ queryKey: candidateKeys.list(reqId) });
  qc.invalidateQueries({ queryKey: ['requisitions'] });
}

export function useCreateCandidate(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { input: CreateCandidateInput; cv?: File }) =>
      candidatesApi.create(reqId, vars.input, vars.cv),
    onSuccess: () => {
      invalidatePipeline(qc, reqId);
      toast.success('Candidate added');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not add the candidate')),
  });
}

export function useUpdateCandidate(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: UpdateCandidateInput }) =>
      candidatesApi.update(vars.id, vars.input),
    onSuccess: () => invalidatePipeline(qc, reqId),
    onError: (error) =>
      toast.error(errMsg(error, 'Could not update the candidate')),
  });
}

export function useUploadCv(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; cv: File }) =>
      candidatesApi.uploadCv(vars.id, vars.cv),
    onSuccess: () => {
      invalidatePipeline(qc, reqId);
      toast.success('CV uploaded to Drive');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not upload the CV')),
  });
}

export function useRemoveCandidate(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => candidatesApi.remove(id),
    onSuccess: () => {
      invalidatePipeline(qc, reqId);
      toast.success('Candidate removed');
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not remove the candidate')),
  });
}

export function useSyncDrive(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => candidatesApi.syncDrive(reqId),
    onSuccess: (result) => {
      invalidatePipeline(qc, reqId);
      if (result.imported > 0) {
        toast.success(
          `Imported ${result.imported} CV${result.imported > 1 ? 's' : ''} from Drive`,
        );
      }
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not sync CVs from Drive')),
  });
}
