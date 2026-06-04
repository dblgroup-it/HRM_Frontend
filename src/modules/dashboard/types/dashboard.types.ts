export interface DashboardStat {
  key: string;
  label: string;
  value: number;
  /** % change vs. previous period. */
  trend: number;
}

export interface DepartmentHeadcount {
  department: string;
  headcount: number;
  /** Share of total, 0–100. */
  percentage: number;
}

export interface RecentHire {
  id: string;
  name: string;
  jobTitle: string;
  department: string;
  joinedAt: string;
  avatarUrl?: string | null;
}

export interface ActivityItem {
  id: string;
  type: 'leave' | 'hire' | 'payroll' | 'attendance';
  message: string;
  timestamp: string;
}

export interface AttendanceSummary {
  present: number;
  remote: number;
  onLeave: number;
  absent: number;
}

export interface DashboardData {
  stats: DashboardStat[];
  departments: DepartmentHeadcount[];
  recentHires: RecentHire[];
  activity: ActivityItem[];
  attendance: AttendanceSummary;
}
