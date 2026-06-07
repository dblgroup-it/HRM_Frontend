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
