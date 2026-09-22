export type RoleScope = 'GLOBAL' | 'UNIT';

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: RoleScope;
  isSystem: boolean;
  _count?: { assignments: number };
}

export interface RoleAssignment {
  id: string;
  roleId: string;
  unitId: string | null;
  /**
   * Position in the unit's HR layering — 1 is first priority, null unordered.
   * Factory HR uses it to decide who a requisition's job analysis is addressed
   * to; other roles ignore it.
   */
  priority?: number | null;
  /**
   * Requisition Raiser only: do they actually have an approval path in this
   * unit? False means the role is a dead end — raising there is refused until
   * somebody configures their chain.
   */
  hasApprovalPath?: boolean | null;
  role: { id: string; key: string; name: string; scope: RoleScope };
  unit: { id: string; name: string } | null;
  user: {
    id: string;
    name: string;
    employeeCode: string;
    employee?: { designation: string | null; department: string | null } | null;
  };
}

export interface EffectiveRole {
  key: string;
  name: string;
  scope: RoleScope;
  unitId: string | null;
  unitName: string | null;
}

export interface MyPermissions {
  isSuperUser: boolean;
  roles: EffectiveRole[];
  unitIds: string[];
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  scope: RoleScope;
}

export interface CreateAssignmentInput {
  roleId: string;
  userId: string;
  unitId?: string;
}

/** A unit's layering, sent whole so there is only ever one first priority. */
export interface SetLayeringOrderInput {
  roleId: string;
  unitId: string;
  /** Assignment ids, first priority first. */
  assignmentIds: string[];
}

/** One person in a unit's Factory HR layering. */
export interface LayeringMember {
  assignmentId: string | null;
  userId: string;
  name: string;
  employeeCode: string;
  /** 1 = first priority. Null = unordered. */
  priority: number | null;
  onLeave: boolean;
  /** When they are due back; null while on duty or away indefinitely. */
  leaveEndsAt: string | null;
}

/** The HR Layering page: each unit's queue, plus the recruiter pool. */
export interface HrLayering {
  units: { unitId: string; unitName: string; queue: LayeringMember[] }[];
  recruiters: {
    userId: string;
    name: string;
    employeeCode: string;
    onLeave: boolean;
    leaveEndsAt: string | null;
  }[];
}

/** What removing an assignment took with it in Approval Paths. */
export interface AssignmentRemoval {
  id: string;
  removed: { paths: number; levels: number };
}
