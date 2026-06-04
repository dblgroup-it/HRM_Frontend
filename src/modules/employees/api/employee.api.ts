import { ENV, MOCK_LATENCY } from '@shared/constants';
import { http } from '@shared/api';
import { delay } from '@shared/utils';
import type { ApiResponse, Paginated } from '@shared/types';

import type { Employee, EmployeeFilters } from '../types/employee.types';
import { MOCK_EMPLOYEES } from '../data/employees.mock';

function applyFilters(
  source: Employee[],
  filters: EmployeeFilters
): Paginated<Employee> {
  const { search, department, status, page = 1, pageSize = 8 } = filters;

  let items = [...source];

  if (search) {
    const term = search.toLowerCase();
    items = items.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term) ||
        e.employeeCode.toLowerCase().includes(term) ||
        e.jobTitle.toLowerCase().includes(term)
    );
  }

  if (department && department !== 'all') {
    items = items.filter((e) => e.department === department);
  }

  if (status && status !== 'all') {
    items = items.filter((e) => e.status === status);
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return {
    items: paged,
    meta: { page, pageSize, total, totalPages },
  };
}

export const employeeApi = {
  list(filters: EmployeeFilters = {}): Promise<Paginated<Employee>> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() =>
        applyFilters(MOCK_EMPLOYEES, filters)
      );
    }
    return http
      .get<ApiResponse<Paginated<Employee>>>('/employees', { params: filters })
      .then((res) => res.data);
  },

  getById(id: string): Promise<Employee> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() => {
        const found = MOCK_EMPLOYEES.find((e) => e.id === id);
        if (!found) throw new Error('Employee not found');
        return found;
      });
    }
    return http
      .get<ApiResponse<Employee>>(`/employees/${id}`)
      .then((res) => res.data);
  },
};
