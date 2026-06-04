import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { employeeApi } from '../api/employee.api';
import type { EmployeeFilters } from '../types/employee.types';

export const employeeKeys = {
  all: ['employees'] as const,
  list: (filters: EmployeeFilters) =>
    [...employeeKeys.all, 'list', filters] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
};

/** Paginated, filterable employee list. */
export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => employeeApi.list(filters),
    placeholderData: keepPreviousData,
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
