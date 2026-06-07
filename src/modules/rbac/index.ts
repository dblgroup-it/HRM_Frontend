export { default as AccessControlPage } from './pages/AccessControlPage';
export {
  useMyPermissions,
  useRoles,
  useAssignments,
  useCreateRole,
  useDeleteRole,
  useCreateAssignment,
  useDeleteAssignment,
  rbacKeys,
} from './hooks/useRbac';
export { rbacApi } from './api/rbac.api';
export type {
  Role,
  RoleAssignment,
  RoleScope,
  MyPermissions,
  EffectiveRole,
} from './types/rbac.types';
