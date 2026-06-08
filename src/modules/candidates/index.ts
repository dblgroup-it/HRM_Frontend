export { CandidatesPanel } from './components/CandidatesPanel';
export {
  candidateKeys,
  useCandidates,
  useRecruitmentWorkspace,
  useSetupWorkspace,
  useCreateCandidate,
  useUpdateCandidate,
  useUploadCv,
  useRemoveCandidate,
  useSyncDrive,
} from './hooks/useCandidates';
export { candidatesApi } from './api/candidates.api';
export { canAccessRecruitment } from './access';
export type { RecruitmentPerms } from './access';
export type {
  Candidate,
  CandidateStage,
  RecruitmentWorkspace,
  CreateCandidateInput,
  UpdateCandidateInput,
} from './types/candidate.types';
