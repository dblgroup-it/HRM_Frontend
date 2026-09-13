/** A person referenced by an approval path — raiser or approver. */
export interface ApprovalPathPerson {
  id: string;
  name: string;
  employeeCode: string;
  designation: string | null;
  department: string | null;
}

/** One level of a raiser's chain — an ordered, named approver. */
export interface ApprovalPathLevel {
  id: string;
  orderIndex: number;
  userId: string;
  title: string;
  subtitle: string;
  approver: ApprovalPathPerson;
}

/**
 * One Requisition Raiser's chain for a unit.
 *
 * `levels` holds only the intermediate approvers — a Head of Talent Acquisition step is
 * always appended when a requisition is raised, so an empty list is valid and
 * means "straight to Head of Talent Acquisition".
 */
export interface RaiserApprovalPath {
  unitId: string;
  unitName: string;
  /**
   * Department this chain covers. '' is the unit-wide default, used whenever
   * the requisition's department has no chain of its own.
   */
  department: string;
  raiser: ApprovalPathPerson;
  levels: ApprovalPathLevel[];
  updatedAt: string | null;
}

/** A unit and every raiser nominated for it. */
export interface UnitApprovalPaths {
  unitId: string;
  unitName: string;
  raisers: RaiserApprovalPath[];
}

/** What the level builder sends back on save. */
export interface ApprovalPathLevelInput {
  userId: string;
  title: string;
  subtitle?: string;
}

/**
 * What one raiser may raise for in a unit.
 *
 * `anyDepartment` comes from a path on the '' department — the unit-wide
 * wildcard — and means every department is open to them there.
 */
export interface RaiserScope {
  unitId: string;
  unitName: string;
  departments: string[];
  anyDepartment: boolean;
}
