import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { candidatesApi } from '../api/candidates.api';
import type {
  BulkCreateCandidatesResult,
  CandidateFilters,
  CreateCandidateInput,
  EmailCandidateInput,
  UpdateCandidateInput,
} from '../types/candidate.types';

export const candidateKeys = {
  all: ['candidates'] as const,
  list: (reqId: string) => ['candidates', 'list', reqId] as const,
  workspace: (reqId: string) => ['candidates', 'workspace', reqId] as const,
  talentPool: ['candidates', 'talent-pool'] as const,
  talentBankMatches: (reqId: string) => ['candidates', 'talent-bank-matches', reqId] as const,
};

function errMsg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

function errStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const s = (error as { status?: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return undefined;
}

export function useRecruitmentWorkspace(reqId: string, enabled = true) {
  return useQuery({
    queryKey: candidateKeys.workspace(reqId),
    queryFn: () => candidatesApi.workspace(reqId),
    enabled: Boolean(reqId) && enabled,
  });
}

export function useCandidates(reqId: string, filters: CandidateFilters = {}, enabled = true) {
  return useQuery({
    queryKey: [...candidateKeys.list(reqId), filters],
    queryFn: () => candidatesApi.list(reqId, filters),
    enabled: Boolean(reqId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useScreeningStatus(reqId: string, active: boolean) {
  return useQuery({
    queryKey: ['screening-status', reqId],
    queryFn: () => candidatesApi.screeningStatus(reqId),
    enabled: Boolean(reqId) && active,
    refetchInterval: active ? 2_000 : false,
  });
}

export function useExportCandidates(reqId: string) {
  return useMutation({
    mutationFn: (filters: CandidateFilters) => candidatesApi.exportCsv(reqId, filters),
    onSuccess: () => toast.success('CSV downloaded'),
    onError: (error) => toast.error(errMsg(error, 'Could not export candidates')),
  });
}

export function useBulkReject(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (maxScore: number) => candidatesApi.bulkReject(reqId, maxScore),
    onSuccess: (result) => {
      invalidatePipeline(qc, reqId);
      toast.success(`Rejected ${result.rejected} candidate${result.rejected === 1 ? '' : 's'}`);
    },
    onError: (error) => toast.error(errMsg(error, 'Could not bulk-reject candidates')),
  });
}

export function useTalentPool() {
  return useQuery({
    queryKey: candidateKeys.talentPool,
    queryFn: () => candidatesApi.talentPool(),
  });
}

export function useTalentBankSearch() {
  return useMutation({
    mutationFn: (query: string) => candidatesApi.talentBankSearch(query),
  });
}

export function useCopyToRequisition() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (vars: { id: string; requisitionId: string; force?: boolean }) =>
      candidatesApi.copyToRequisition(vars.id, vars.requisitionId, vars.force),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['requisitions'] });
      qc.invalidateQueries({ queryKey: candidateKeys.list(vars.requisitionId) });
      // Refetches with the fresh, server-truth pipelineStatus per match (so a
      // row correctly flips to "Already added" without relying on local state).
      qc.invalidateQueries({ queryKey: candidateKeys.talentBankMatches(vars.requisitionId) });
      toast.success(
        vars.force
          ? 'Candidate added again to the requisition pipeline'
          : 'Candidate added to the requisition pipeline',
      );
    },
    onError: (error, vars) => {
      const message = errMsg(error, 'Could not add candidate to requisition');
      // A duplicate-email conflict is a soft guard — let HR override it with
      // one click instead of hard-blocking (the "already joined" rule stays
      // a hard block, that one's never offered a retry). Guard against the
      // toast's action being clicked more than once while the retry is in flight.
      if (errStatus(error) === 409 && !vars.force) {
        toast.error(message, {
          action: {
            label: 'Add anyway',
            onClick: () => {
              if (!mutation.isPending) mutation.mutate({ ...vars, force: true });
            },
          },
        });
        return;
      }
      toast.error(message);
    },
  });
  return mutation;
}

/** AI-matched Talent Bank suggestions for one requisition ("Talent Bank Matches" tab). */
export function useTalentBankMatches(reqId: string, enabled = true) {
  return useQuery({
    queryKey: candidateKeys.talentBankMatches(reqId),
    queryFn: () => candidatesApi.talentBankMatches(reqId),
    enabled: Boolean(reqId) && enabled,
  });
}

export function useSyncTalentBankMatches(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => candidatesApi.syncTalentBankMatches(reqId),
    onSuccess: (matches) => {
      qc.setQueryData(candidateKeys.talentBankMatches(reqId), matches);
      toast.success('Talent Bank matches refreshed');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not refresh Talent Bank matches')),
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
  // A candidate leaving/re-entering this pipeline changes the Talent Bank
  // Matches modal's per-match pipelineStatus (in_pipeline/removed/not_added).
  qc.invalidateQueries({ queryKey: candidateKeys.talentBankMatches(reqId) });
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

export function useBulkCreateCandidates(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      cvSource: string;
      files: File[];
      names: string[];
    }) => {
      // In batches, each well under nginx's 20 MB request cap — eight 3 MB
      // CVs in one request is a 413 the API never even sees.
      const merged: BulkCreateCandidatesResult = { created: [], failed: [] };
      for (const idx of bulkBatches(input.files)) {
        const r = await candidatesApi.createMany(reqId, {
          cvSource: input.cvSource,
          files: idx.map((i) => input.files[i]),
          names: idx.map((i) => input.names[i]),
        });
        merged.created.push(...r.created);
        merged.failed.push(...r.failed);
      }
      return merged;
    },
    onSuccess: (result) => {
      invalidatePipeline(qc, reqId);
      const n = result.created.length;
      if (n) toast.success(`Added ${n} candidate${n === 1 ? '' : 's'}`);
      if (result.failed.length) {
        toast.warning(
          `${result.failed.length} CV${result.failed.length === 1 ? '' : 's'} not added — ${result.failed[0].fileName}: ${result.failed[0].error}`,
        );
      }
    },
    onError: (error) => toast.error(errMsg(error, 'Could not add the CVs')),
  });
}

/** Up to 15 MB and 10 files per request — see useBulkCreateCandidates. */
const BULK_BATCH_BYTES = 15 * 1024 * 1024;
const BULK_BATCH_FILES = 10;

/** File indexes grouped into batches, in order. */
function bulkBatches(files: File[]): number[][] {
  const batches: number[][] = [];
  let current: number[] = [];
  let bytes = 0;
  files.forEach((f, i) => {
    if (
      current.length &&
      (bytes + f.size > BULK_BATCH_BYTES || current.length >= BULK_BATCH_FILES)
    ) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(i);
    bytes += f.size;
  });
  if (current.length) batches.push(current);
  return batches;
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

/** Silently mark a candidate as viewed (fire-and-forget, no toast). */
export function useMarkViewed() {
  return useMutation({
    mutationFn: (id: string) => candidatesApi.markViewed(id),
  });
}

/** Kick off AI screening for a requisition (returns immediately, runs in background). */
export function useScreenAll(reqId: string) {
  return useMutation({
    mutationFn: () => candidatesApi.screenAll(reqId),
    onError: (error) => toast.error(errMsg(error, 'Could not start AI screening')),
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

export function useFlagCandidate(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      candidatesApi.flag(id, reason),
    onSuccess: () => {
      invalidatePipeline(qc, reqId);
      toast.success('Candidate red-flagged');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not flag the candidate')),
  });
}

export function useUnflagCandidate(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => candidatesApi.unflag(id),
    onSuccess: () => {
      invalidatePipeline(qc, reqId);
      toast.success('Red flag removed');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not remove flag')),
  });
}
