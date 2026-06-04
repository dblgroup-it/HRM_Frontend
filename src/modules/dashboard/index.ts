export { default as DashboardPage } from './pages/DashboardPage';
export { useDashboard, dashboardKeys } from './hooks/useDashboard';
export { dashboardApi } from './api/dashboard.api';
export type {
  DashboardData,
  DashboardStat,
  DepartmentHeadcount,
  RecentHire,
  ActivityItem,
  AttendanceSummary,
} from './types/dashboard.types';
