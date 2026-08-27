import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { salaryFixationApi } from '../api/salaryFixation.api';
import type { UpsertSalaryFixationInput } from '../types/salaryFixation.types';

export const salaryFixationKeys = {
  detail: (candidateId: string) => ['salary-fixation', candidateId] as const,
};

function errMsg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

export function useSalaryFixation(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: salaryFixationKeys.detail(candidateId),
    queryFn: () => salaryFixationApi.get(candidateId),
    enabled: Boolean(candidateId) && enabled,
  });
}

/** Fetch many candidates' salary-fixation records in parallel, sharing the
 * same cache entries as useSalaryFixation — used to group/sort a candidate
 * list by screening status without a waterfall of per-row fetches. */
export function useSalaryFixationsBulk(candidateIds: string[]) {
  return useQueries({
    queries: candidateIds.map((id) => ({
      queryKey: salaryFixationKeys.detail(id),
      queryFn: () => salaryFixationApi.get(id),
    })),
  });
}

export function useUpsertSalaryFixation(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertSalaryFixationInput) =>
      salaryFixationApi.upsert(candidateId, input),
    onSuccess: (data) => {
      qc.setQueryData(salaryFixationKeys.detail(candidateId), data);
    },
    onError: (error) => toast.error(errMsg(error, 'Could not save')),
  });
}

export function useMarkOffered(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => salaryFixationApi.markOffered(candidateId),
    onSuccess: (data) => {
      qc.setQueryData(salaryFixationKeys.detail(candidateId), data);
      toast.success('Marked as offered');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not mark as offered')),
  });
}

export function useFinalizeSalaryFixation(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => salaryFixationApi.finalize(candidateId),
    onSuccess: (data) => {
      qc.setQueryData(salaryFixationKeys.detail(candidateId), data);
      toast.success('Salary fixation finalized');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not finalize')),
  });
}
