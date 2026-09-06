export { RequisitionForm } from './components/RequisitionForm';
export { RequisitionTable } from './components/RequisitionTable';
export { RequisitionStatusBadge } from './components/RequisitionStatusBadge';
export { WorkflowStepper } from './components/WorkflowStepper';
export { FacilitiesPanel } from './components/FacilitiesPanel';

export {
  useRequisitions,
  useRequisition,
  useCreateRequisition,
  requisitionKeys,
} from './hooks/useRequisitions';
export {
  useApprovalAction,
  useGenerateRoleProfile,
  usePostRequisition,
  useUpdateFacilities,
} from './hooks/useRequisitionActions';

export { FACILITY_META, FACILITY_OPTION_LABEL } from './constants';

export { requisitionApi } from './api/requisition.api';
export type {
  Requisition,
  RequisitionStatus,
  RequirementType,
  RequisitionSource,
  Priority,
  EmploymentNature,
  PreferredSource,
  ApprovalRole,
  ApprovalStep,
  ApprovalDecision,
  ActivityLogEntry,
  RequisitionFilters,
  CreateRequisitionPayload,
  RoleProfile,
  FacilityKey,
  FacilityDecision,
  Facilities,
} from './types/requisition.types';
export { canRaiseRequisition } from './access';
