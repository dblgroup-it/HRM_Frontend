import type { ID, ISODateString } from '@shared/types';

export type EmploymentStatus = 'active' | 'on_leave' | 'probation' | 'inactive';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';

export interface Employee {
  id: ID;
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
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  status?: EmploymentStatus | 'all';
  page?: number;
  pageSize?: number;
}
