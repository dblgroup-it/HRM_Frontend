import { ENV, MOCK_LATENCY } from '@shared/constants';
import { http } from '@shared/api';
import { delay } from '@shared/utils';
import type { ApiResponse } from '@shared/types';

import type { DashboardData } from '../types/dashboard.types';

const MOCK_DASHBOARD: DashboardData = {
  stats: [
    { key: 'employees', label: 'Total Employees', value: 1284, trend: 4.2 },
    { key: 'present', label: 'Present Today', value: 1147, trend: 1.8 },
    { key: 'onLeave', label: 'On Leave', value: 38, trend: -2.4 },
    { key: 'openRoles', label: 'Open Positions', value: 23, trend: 9.1 },
  ],
  departments: [
    { department: 'Production', headcount: 642, percentage: 50 },
    { department: 'Quality Assurance', headcount: 168, percentage: 13 },
    { department: 'Supply Chain', headcount: 142, percentage: 11 },
    { department: 'Human Resources', headcount: 96, percentage: 7.5 },
    { department: 'Finance', headcount: 88, percentage: 6.8 },
    { department: 'IT & Systems', headcount: 78, percentage: 6 },
    { department: 'Sales & Marketing', headcount: 70, percentage: 5.7 },
  ],
  recentHires: [
    {
      id: 'h1',
      name: 'Tanvir Ahmed',
      jobTitle: 'Production Supervisor',
      department: 'Production',
      joinedAt: '2026-05-28',
    },
    {
      id: 'h2',
      name: 'Nusrat Jahan',
      jobTitle: 'QA Engineer',
      department: 'Quality Assurance',
      joinedAt: '2026-05-25',
    },
    {
      id: 'h3',
      name: 'Rafiul Islam',
      jobTitle: 'Frontend Developer',
      department: 'IT & Systems',
      joinedAt: '2026-05-22',
    },
    {
      id: 'h4',
      name: 'Sadia Karim',
      jobTitle: 'HR Coordinator',
      department: 'Human Resources',
      joinedAt: '2026-05-20',
    },
  ],
  activity: [
    {
      id: 'a1',
      type: 'leave',
      message: 'Mehedi Hasan requested 3 days of annual leave',
      timestamp: '2026-06-04T08:15:00Z',
    },
    {
      id: 'a2',
      type: 'hire',
      message: 'Tanvir Ahmed joined as Production Supervisor',
      timestamp: '2026-06-04T06:40:00Z',
    },
    {
      id: 'a3',
      type: 'payroll',
      message: 'May payroll run completed for 1,284 employees',
      timestamp: '2026-06-03T17:05:00Z',
    },
    {
      id: 'a4',
      type: 'attendance',
      message: '12 employees clocked in remotely this morning',
      timestamp: '2026-06-03T09:20:00Z',
    },
  ],
  attendance: { present: 1147, remote: 64, onLeave: 38, absent: 35 },
};

export const dashboardApi = {
  getDashboard(): Promise<DashboardData> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() => MOCK_DASHBOARD);
    }
    return http
      .get<ApiResponse<DashboardData>>('/dashboard')
      .then((res) => res.data);
  },
};
