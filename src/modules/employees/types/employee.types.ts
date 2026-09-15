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
  /** The person's e-signature, or null when they have none. */
  signatureUrl?: string | null;
  /** True when they uploaded it themselves; HR may not then replace it. */
  signatureSelfUploaded?: boolean;
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
  /**
   * False when this person has no login yet (no roles granted, not an admin).
   * Naming them as an approver provisions one automatically.
   */
  hasSystemAccess?: boolean;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  /** Restrict to one factory / unit — used when delegating interviews. */
  unit?: string;
  status?: EmploymentStatus | 'all';
  page?: number;
  pageSize?: number;
}
