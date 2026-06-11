import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { candidatesApi } from '../api/candidates.api';
import type {
  CreateCandidateInput,
  EmailCandidateInput,
  UpdateCandidateInput,
} from '../types/candidate.types';

export const candidateKeys = {
  all: ['candidates'] as const,
  list: (reqId: string) => ['candidates', 'list', reqId] as const,
  workspace: (reqId: string) => ['candidates', 'workspace', reqId] as const,
  talentPool: ['candidates', 'talent-pool'] as const,
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

export function useTalentPool() {
  return useQuery({
    queryKey: candidateKeys.talentPool,
    queryFn: () => candidatesApi.talentPool(),
  });
}

/** Toggle a candidate's talent-pool flag from anywhere (e.g. the Talent Pool page). */
export function useToggleTalentPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; talentPool: boolean }) =>
      candidatesApi.update(vars.id, { talentPool: vars.talentPool }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: candidateKeys.talentPool });
      qc.invalidateQueries({ queryKey: candidateKeys.all });
      toast.success('Talent pool updated');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not update')),
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
  qc.invalidateQueries({ queryKey: candidateKeys.talentPool });
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

export function useEmailCandidate(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: EmailCandidateInput }) =>
      candidatesApi.email(vars.id, vars.input),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: candidateKeys.list(reqId) });
      toast.success(`Email sent to ${res.to}`);
    },
    onError: (error) => toast.error(errMsg(error, 'Could not send the email')),
  });
}

/** AI-screen all un-screened applied CVs in this requisition. */
export function useScreenAll(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => candidatesApi.screenAll(reqId),
    onSuccess: (result) => {
      invalidatePipeline(qc, reqId);
      toast.success(
        result.screened === 0
          ? 'No new CVs to screen'
          : `Screened ${result.screened} CV${result.screened > 1 ? 's' : ''} — ${result.shortlisted} AI-shortlisted`,
      );
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not run AI screening')),
  });
}

/** Screen (or re-screen) a single candidate. */
export function useScreenCandidate(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => candidatesApi.screen(id),
    onSuccess: () => {
      invalidatePipeline(qc, reqId);
      toast.success('CV screened');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not screen the CV')),
  });
}

/** AI side-by-side comparison of interview/final-stage candidates. */
export function useCompareFinalists(reqId: string) {
  return useMutation({
    mutationFn: () => candidatesApi.compareFinalists(reqId),
    onError: (error) =>
      toast.error(errMsg(error, 'Could not run the AI comparison')),
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
