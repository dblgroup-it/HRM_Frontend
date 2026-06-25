import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { bdJobsApi } from '../api/bdjobs.api';
import type { BdJobsFormData } from '../types/bdjobs.types';
import { useDebounce } from '@shared/hooks';

export const bdJobsKeys = {
  post: (reqId: string) => ['bdjobs-post', reqId] as const,
  status: ['bdjobs-status'] as const,
};

export function useBdJobsStatus() {
  return useQuery({
    queryKey: bdJobsKeys.status,
    queryFn: () => bdJobsApi.getStatus(),
    staleTime: 60_000,
  });
}

export function useBdJobsPost(reqId: string) {
  return useQuery({
    queryKey: bdJobsKeys.post(reqId),
    queryFn: () => bdJobsApi.getPost(reqId),
    enabled: Boolean(reqId),
  });
}

export function useSearchBdJobsLocations(search: string) {
  return useQuery({
    queryKey: ['bdjobs-locations', search],
    queryFn: () => bdJobsApi.searchLocations(search || undefined),
    enabled: true,
    staleTime: 60_000,
  });
}

export function useBdJobsEduLevels() {
  return useQuery({
    queryKey: ['bdjobs-edu-levels'],
    queryFn: () => bdJobsApi.getEduLevels(),
    staleTime: Infinity,
  });
}

export function useBdJobsDegrees(eduLevelId: number | null) {
  return useQuery({
    queryKey: ['bdjobs-degrees', eduLevelId],
    queryFn: () => bdJobsApi.getDegrees(eduLevelId!),
    enabled: eduLevelId != null,
    staleTime: 60 * 60 * 1000,
  });
}

export function useSearchBdJobsIndustry(search: string) {
  const debounced = useDebounce(search, 300);
  return useQuery({
    queryKey: ['bdjobs-industry', debounced],
    queryFn: () => bdJobsApi.searchIndustry(debounced),
    enabled: debounced.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useSearchBdJobsSkills(search: string, catId?: number | null) {
  const debounced = useDebounce(search, 300);
  return useQuery({
    queryKey: ['bdjobs-skills', debounced, catId ?? null],
    queryFn: () => bdJobsApi.searchSkills(debounced, catId ?? undefined),
    enabled: debounced.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useBdJobsCategories() {
  return useQuery({
    queryKey: ['bdjobs-categories'],
    queryFn: () => bdJobsApi.getCategories(),
    staleTime: 24 * 60 * 60 * 1000, // categories rarely change
  });
}

export function usePostToBdJobs(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BdJobsFormData) => bdJobsApi.post(reqId, data),
    onSuccess: (result) => {
      qc.setQueryData(bdJobsKeys.post(reqId), result);
      if (result.note) {
        toast.info(result.note);
      } else if (result.status === 'posted') {
        toast.success('Job posted to BDJobs successfully!');
      }
    },
    onError: (e: unknown) => {
      const msg =
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Could not post to BDJobs';
      toast.error(msg);
    },
  });
}
