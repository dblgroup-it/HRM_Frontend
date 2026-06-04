import type { ID } from '@shared/types';

export type SeatCategory = 'officer' | 'staff' | 'worker';

/** A sanctioned position in the unit/department organogram. */
export interface OrganogramSeat {
  id: ID;
  unit: string;
  department: string;
  designation: string;
  category: SeatCategory;
  /** Headcount approved in the organogram. */
  sanctioned: number;
  /** Currently occupied. */
  filled: number;
}

/** Department rollup for the browse view. */
export interface OrganogramDepartment {
  department: string;
  seats: OrganogramSeat[];
  sanctioned: number;
  filled: number;
  vacant: number;
}

export interface OrganogramUnit {
  unit: string;
  departments: OrganogramDepartment[];
  sanctioned: number;
  filled: number;
  vacant: number;
}

/**
 * Result of checking the organogram for a requested position.
 * Drives the New vs Existing (replacement) decision.
 */
export interface SeatLookupResult {
  /** True when a sanctioned position exists for this designation. */
  inOrganogram: boolean;
  /** Vacant count (sanctioned − filled) for the matched seat. */
  vacant: number;
  /** 'existing' when a vacant sanctioned seat is available, else 'new'. */
  requirement: 'existing' | 'new';
  seat: OrganogramSeat | null;
}
