export { OnboardingTab } from './components/OnboardingTab';
export {
  canAccessMedical,
  canApproveMedical,
  holdsMedicalExaminerRole,
  holdsCentralMedicalRole,
  isMedicalOnly,
  CENTRAL_MEDICAL_ROLE_KEY,
} from './access';
export { MedicalApprovalsPage } from './pages/MedicalApprovalsPage';
export {
  useMedicalQueue,
  useMedicalApprovalQueue,
} from './hooks/useOnboarding';
export type {
  MedicalApprovalRow,
  MedicalQueueItem,
} from './types/onboarding.types';
export type { RecruitmentPerms } from './access';
