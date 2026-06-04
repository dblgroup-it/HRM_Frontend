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
  detail: (id: string) => [...requisitionKeys.all, 'detail', id] as const,
};

export function useRequisitions(filters: RequisitionFilters) {
  return useQuery({
    queryKey: requisitionKeys.list(filters),
    queryFn: () => requisitionApi.list(filters),
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
