import { http } from '@shared/api';
import { ENV } from '@shared/constants';
import type { ApiResponse } from '@shared/types';

import { employeeApi } from '@modules/employees';
import { requisitionApi } from '@modules/requisition';
import { organogramApi } from '@modules/organogram';

import type {
  DashboardData,
  DashboardStat,
  DepartmentHeadcount,
  RecentHire,
  RequisitionSnapshot,
} from '../types/dashboard.types';

function buildDepartmentBreakdown(
  employees: Array<{ department: string; status: string }>
): DepartmentHeadcount[] {
  const total = employees.length;
  const counts = new Map<string, number>();

  for (const employee of employees) {
    const department = employee.department?.trim() || 'Unassigned';
    counts.set(department, (counts.get(department) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([department, headcount]) => ({
      department,
      headcount,
      percentage: total > 0 ? (headcount / total) * 100 : 0,
    }))
    .sort((a, b) => b.headcount - a.headcount)
    .slice(0, 7);
}

function buildRecentHires(
  employees: Array<{
    id: string;
    name: string;
    jobTitle: string;
    department: string;
    joinedAt: string;
    avatarUrl?: string | null;
  }>
): RecentHire[] {
  return [...employees]
    .sort((a, b) => +new Date(b.joinedAt) - +new Date(a.joinedAt))
    .slice(0, 7);
}

function buildRequisitionSnapshots(
  requisitions: Array<{
    id: string;
    code: string;
    designation: string;
    unitFactory: string;
    department: string;
    status: RequisitionSnapshot['status'];
    requiredPosts: number;
    updatedAt: string;
  }>
): RequisitionSnapshot[] {
  return [...requisitions]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 5);
}

function buildMockDashboard(): Promise<DashboardData> {
  return Promise.all([
    employeeApi.list({ page: 1, pageSize: 5000 }),
    requisitionApi.list({ page: 1, pageSize: 5000 }),
    organogramApi.units(),
  ]).then(([employees, requisitions, units]) => {
    const activeEmployees = employees.items.filter(
      (employee) => employee.status !== 'inactive'
    );
    const totalEmployees = employees.meta.total;
    const activeUnits = units.filter((unit) => unit.sanctioned > 0).length;
    const totalUnits = units.length;
    const sanctionedSeats = units.reduce((sum, unit) => sum + unit.sanctioned, 0);
    const filledSeats = units.reduce((sum, unit) => sum + unit.filled, 0);
    const vacantSeats = units.reduce((sum, unit) => sum + unit.vacant, 0);
    const openRequisitions = requisitions.items.filter((req) =>
      ['pending_approval', 'approved', 'profile_generated'].includes(req.status)
    ).length;

    const stats: DashboardStat[] = [
      { key: 'employees', label: 'Total Workforce', value: totalEmployees },
      { key: 'activeEmployees', label: 'Active Employees', value: activeEmployees.length },
      { key: 'openRequisitions', label: 'Open Requisitions', value: openRequisitions },
      { key: 'vacantSeats', label: 'Vacant Seats', value: vacantSeats },
    ];

    return {
      stats,
      summary: {
        totalEmployees,
        activeEmployees: activeEmployees.length,
        activeUnits,
        totalUnits,
        sanctionedSeats,
        filledSeats,
        vacantSeats,
        openRequisitions,
      },
      departments: buildDepartmentBreakdown(employees.items.map((e) => ({
        department: e.department,
        status: e.status,
      }))),
      recentHires: buildRecentHires(
        employees.items.map((e) => ({
          id: e.id,
          name: e.name,
          jobTitle: e.jobTitle,
          department: e.department,
          joinedAt: e.joinedAt,
          avatarUrl: e.avatarUrl ?? null,
        }))
      ),
      requisitions: buildRequisitionSnapshots(requisitions.items),
    };
  });
}

export const dashboardApi = {
  getDashboard(): Promise<DashboardData> {
    if (ENV.USE_MOCK_API) {
      return buildMockDashboard();
    }
    return http
      .get<ApiResponse<DashboardData>>('/dashboard')
      .then((res) => res.data);
  },
};
