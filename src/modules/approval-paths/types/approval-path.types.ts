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
 * `levels` holds only the intermediate approvers — a Corporate HR step is
 * always appended when a requisition is raised, so an empty list is valid and
 * means "straight to Corporate HR".
 */
export interface RaiserApprovalPath {
  unitId: string;
  unitName: string;
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
