import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { referenceCheckApi } from '../api/referenceCheck.api';
import type { ReferenceCheckInput } from '../types/referenceCheck.types';

const key = (candidateId: string) =>
  ['reference-checks', candidateId] as const;

export function useReferenceChecks(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: key(candidateId),
    queryFn: () => referenceCheckApi.list(candidateId),
    enabled: enabled && Boolean(candidateId),
  });
}

function message(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

export function useSaveReferenceCheck(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ReferenceCheckInput }) =>
      id
        ? referenceCheckApi.update(candidateId, id, input)
        : referenceCheckApi.create(candidateId, input),
    onSuccess: (data) => {
      qc.setQueryData(key(candidateId), data);
      toast.success('Reference check saved');
    },
    onError: (e) => toast.error(message(e, 'Could not save the reference check')),
  });
}

export function useDeleteReferenceCheck(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => referenceCheckApi.remove(candidateId, id),
    onSuccess: (data) => {
      qc.setQueryData(key(candidateId), data);
      toast.success('Reference check removed');
    },
    onError: (e) => toast.error(message(e, 'Could not remove it')),
  });
}
