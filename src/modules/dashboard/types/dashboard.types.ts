import type { RequisitionStatus } from '@modules/requisition';

export interface DashboardStat {
  key: string;
  label: string;
  value: number;
  /** % change vs. previous period. */
  trend?: number;
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

export interface RequisitionSnapshot {
  id: string;
  code: string;
  designation: string;
  unitFactory: string;
  department: string;
  status: RequisitionStatus;
  requiredPosts: number;
  updatedAt: string;
  /**
   * Why this requisition is the viewer's to run, when it is: assigned to
   * them, or handed to them while its recruiter is on leave.
   */
  mine?: 'recruiter' | 'cover' | null;
  /** Whose work they are covering, and until when. */
  coveringFor?: string | null;
  coverUntil?: string | null;
}

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  activeUnits: number;
  totalUnits: number;
  sanctionedSeats: number;
  filledSeats: number;
  vacantSeats: number;
  openRequisitions: number;
}

export interface DashboardData {
  stats: DashboardStat[];
  summary: DashboardSummary;
  departments: DepartmentHeadcount[];
  recentHires: RecentHire[];
  requisitions: RequisitionSnapshot[];
  /** What this person is personally running — assigned, or covering. */
  myRecruitment: RequisitionSnapshot[];
}
