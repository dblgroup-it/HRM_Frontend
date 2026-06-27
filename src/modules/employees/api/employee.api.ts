import { ENV, MOCK_LATENCY } from '@shared/constants';
import { http } from '@shared/api';
import { delay } from '@shared/utils';
import type { ApiResponse, Paginated } from '@shared/types';

import type {
  Employee,
  EmployeeFilters,
  EmploymentStatus,
} from '../types/employee.types';
import { MOCK_EMPLOYEES } from '../data/employees.mock';

/** Shape returned by the NestJS `/employees` endpoint. */
interface BackendEmployee {
  id: string;
  userId: string;
  employeeCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  department: string | null;
  section: string | null;
  grade: string | null;
  category: string | null;
  unitName: string | null;
  location: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  joiningDate: string | null;
  exitDate: string | null;
  lineManagerName: string | null;
  lineManagerCode: string | null;
  lineManagerId: string | null;
  avatarUrl: string | null;
  source: string;
  status: string;
}

function mapEmployee(e: BackendEmployee): Employee {
  const status: EmploymentStatus =
    e.status === 'INACTIVE' ? 'inactive' : 'active';
  return {
    id: e.id,
    userId: e.userId,
    employeeCode: e.employeeCode,
    name: e.name,
    email: e.email ?? '',
    phone: e.phone ?? '',
    jobTitle: e.designation ?? '—',
    department: e.department ?? '—',
    employmentType: 'full_time',
    status,
    location: e.unitName ?? '—',
    salary: 0,
    joinedAt: e.joiningDate ?? new Date().toISOString(),
    avatarUrl: e.avatarUrl ?? null,
    manager: e.lineManagerName ?? undefined,
    managerCode: e.lineManagerCode,
    managerId: e.lineManagerId,
    section: e.section,
    grade: e.grade,
    category: e.category,
    gender: e.gender,
    dateOfBirth: e.dateOfBirth,
    exitDate: e.exitDate,
  };
}

/** Build the query params the backend actually accepts (no `status`). */
function toParams(filters: EmployeeFilters) {
  return {
    page: filters.page,
    pageSize: filters.pageSize,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.department && filters.department !== 'all'
      ? { department: filters.department }
      : {}),
  };
}

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
      .get<ApiResponse<Paginated<BackendEmployee>>>('/employees', {
        params: toParams(filters),
      })
      .then((res) => ({
        items: res.data.items.map(mapEmployee),
        meta: res.data.meta,
      }));
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
      .get<ApiResponse<BackendEmployee>>(`/employees/${id}`)
      .then((res) => mapEmployee(res.data));
  },
};
