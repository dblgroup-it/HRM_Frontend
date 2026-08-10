import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { employeeApi, type UpdateEmployeeInput } from '../api/employee.api';
import type { EmployeeFilters } from '../types/employee.types';

function errMsg(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: string }).message);
  return fallback;
}

export const employeeKeys = {
  all: ['employees'] as const,
  list: (filters: EmployeeFilters) =>
    [...employeeKeys.all, 'list', filters] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
};

/** Paginated, filterable employee list. */
export function useEmployees(
  filters: EmployeeFilters,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => employeeApi.list(filters),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

/** Single employee by id. */
export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateEmployeeInput) => employeeApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success('Employee updated');
    },
    onError: (e) => toast.error(errMsg(e, 'Could not update employee')),
  });
}
