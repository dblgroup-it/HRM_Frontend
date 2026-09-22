import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { requisitionApi } from '../api/requisition.api';
import type {
  CreateRequisitionPayload,
  RequisitionFilters,
} from '../types/requisition.types';

export const requisitionKeys = {
  all: ['requisitions'] as const,
  list: (filters: RequisitionFilters) =>
    [...requisitionKeys.all, 'list', filters] as const,
  stats: (filters: RequisitionFilters) =>
    [...requisitionKeys.all, 'stats', filters] as const,
  detail: (id: string) => [...requisitionKeys.all, 'detail', id] as const,
  jobAnalysisOwner: (id: string) =>
    [...requisitionKeys.all, 'job-analysis-owner', id] as const,
};

export function useRequisitions(filters: RequisitionFilters) {
  return useQuery({
    queryKey: requisitionKeys.list(filters),
    queryFn: () => requisitionApi.list(filters),
    placeholderData: keepPreviousData,
  });
}

/**
 * Who owns this requisition's job analysis, and may the viewer write it.
 *
 * Only asked while the requisition is actually waiting on one — the answer is
 * about a stage, not about the requisition for its whole life.
 */
export function useJobAnalysisOwnership(id: string, enabled: boolean) {
  return useQuery({
    queryKey: requisitionKeys.jobAnalysisOwner(id),
    queryFn: () => requisitionApi.jobAnalysisOwnership(id),
    enabled,
  });
}

/** Status counts for the tiles/chips (counted in the DB, not by paging rows). */
export function useRequisitionStats(filters: RequisitionFilters) {
  return useQuery({
    queryKey: requisitionKeys.stats(filters),
    queryFn: () => requisitionApi.stats(filters),
    placeholderData: keepPreviousData,
  });
}

export function useRequisition(id: string) {
  return useQuery({
    queryKey: requisitionKeys.detail(id),
    queryFn: () => requisitionApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreateRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRequisitionPayload) =>
      requisitionApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: requisitionKeys.all });
    },
  });
}

export function useUploadAttachment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => requisitionApi.uploadAttachment(id, file),
    onSuccess: (req) => {
      queryClient.setQueryData(requisitionKeys.detail(id), req);
      void queryClient.invalidateQueries({ queryKey: requisitionKeys.all });
    },
  });
}

export function useRemoveAttachment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => requisitionApi.removeAttachment(id, fileId),
    onSuccess: (req) => {
      queryClient.setQueryData(requisitionKeys.detail(id), req);
      void queryClient.invalidateQueries({ queryKey: requisitionKeys.all });
    },
  });
}
