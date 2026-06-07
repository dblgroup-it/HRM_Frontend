export type SeatCategory = 'OFFICER' | 'STAFF' | 'WORKER';

export interface ConfigPosition {
  id: string;
  unitId: string;
  departmentId: string;
  designation: string;
  category: SeatCategory;
  sanctioned: number;
  filled: number;
}

export interface ConfigDepartment {
  id: string;
  unitId: string;
  name: string;
  positions: ConfigPosition[];
}

export interface ConfigUnit {
  id: string;
  name: string;
  isActive: boolean;
  departments: ConfigDepartment[];
  _count?: { employees: number };
}

export interface CreateUnitInput {
  name: string;
}

export interface UpsertPositionInput {
  designation: string;
  category?: SeatCategory;
  sanctioned: number;
  filled?: number;
}
