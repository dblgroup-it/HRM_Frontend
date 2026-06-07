import type { ID, ISODateString } from '@shared/types';

export type EmploymentStatus = 'active' | 'on_leave' | 'probation' | 'inactive';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';

export interface Employee {
  id: ID;
  /** Login/user id — used when assigning access roles. */
  userId?: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  location: string;
  salary: number;
  joinedAt: ISODateString;
  avatarUrl?: string | null;
  manager?: string;
  managerCode?: string | null;
  managerId?: string | null;
  // Captured from ZingHR
  section?: string | null;
  grade?: string | null;
  category?: string | null;
  gender?: string | null;
  dateOfBirth?: ISODateString | null;
  exitDate?: ISODateString | null;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  status?: EmploymentStatus | 'all';
  page?: number;
  pageSize?: number;
}
