import type { ID, ISODateString } from '@shared/types';

/** Phase-1 workflow state. */
export type RequisitionStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'profile_generated'
  | 'posted';

/** Derived from the organogram: existing (replacement) vs new headcount. */
export type RequirementType = 'existing' | 'new';

export type Priority = 'top' | 'moderate' | 'ordinary';
export type EmploymentNature = 'permanent' | 'temporary' | 'contractual';
export type PreferredSource =
  | 'job_advertisement'
  | 'headhunting'
  | 'cv_bank';

/** One of the 4 fixed facility types the requisitioner can request. */
export type FacilityKey = 'laptopDesktop' | 'transport' | 'dormitory' | 'seating';

/** A single facility line: the requisitioner's request + HR's confirm/skip decision. */
export interface FacilityDecision {
  requested: boolean;
  /** 'laptop'|'desktop' for laptopDesktop; 'existing'|'new' for seating; null otherwise. */
  option: string | null;
  note: string;
  status: 'pending' | 'confirmed' | 'skipped';
  hrNote: string;
  decidedBy: string | null;
  decidedAt: ISODateString | null;
}

export type Facilities = Record<FacilityKey, FacilityDecision>;

/** What the requisitioner fills in on the create form — HR's side is server-assigned. */
export interface FacilityRequestInput {
  requested: boolean;
  option?: string;
  note?: string;
}

export type FacilitiesRequestInput = Record<FacilityKey, FacilityRequestInput>;

/**
 * Roles that can appear in the sign-off chain.
 *
 * Only legacy chains (raised before per-unit approval paths) and the CHRO step
 * appended on escalation route by role — configured steps name a person via
 * `approverUserId` instead, and carry `role: null`.
 */
export type ApprovalRole =
  | 'department_head'
  | 'factory_hr'
  | 'sbu_head'
  | 'corporate_hr'
  | 'chro';

export type ApprovalDecision =
  | 'approved'
  | 'rejected'
  | 'need_more_info'
  | 'escalate'
  | 'escalated'
  | 'edited';
export type StepStatus = 'pending' | 'approved' | 'rejected' | 'info_requested';

export interface ApprovalStep {
  id: string;
  /** Null on person-routed steps — see ApprovalRole above. */
  role: ApprovalRole | null;
  /** The named approver on a configured step; null on role-routed ones. */
  approverUserId: string | null;
  title: string;
  subtitle: string;
  /** Named signatory (may be empty until assigned at approval time). */
  assignee: string;
  status: StepStatus;
  note: string;
  actedAt: ISODateString | null;
}

/** The Corporate Recruiter running a requisition after approval. */
export interface RequisitionRecruiter {
  id: string;
  name: string;
  employeeCode: string;
}

/** Audit trail of every approval action, including roll-backs. */
export interface ActivityLogEntry {
  actor: string;
  action: ApprovalDecision;
  note: string;
  createdAt: ISODateString;
}

/** AI output (Step 3) — structured role profile derived from the form. */
export interface RoleProfile {
  summary: string;
  jobDescription: string;
  responsibilities: string[];
  requirements: string[];
  generatedAt: ISODateString;
  /** Whether the LLM wrote it, the template produced it, or HR edited it. */
  generatedBy?: 'ai' | 'template' | 'manual';
}

/** Job posting record (Step 4). */
export interface JobPosting {
  sources: PreferredSource[];
  closingDate: ISODateString;
  postedAt: ISODateString;
}

/** Phase 2 — per-stage candidate counts for a requisition. */
/** Furthest pipeline progress across candidates — drives the lifecycle stepper. */
export interface PipelineProgress {
  hasCandidates: boolean;
  inAssessment: boolean;
  inOnboarding: boolean;
  onboarded: boolean;
}

export interface CandidateStats {
  applied: number;
  ai_shortlisted: number;
  shortlisted: number;
  interview: number;
  final: number;
  selected: number;
  rejected: number;
  total: number;
}

/** A supporting file attached to a requisition (stored on Drive). */
export interface RequisitionAttachment {
  name: string;
  fileId: string;
  url: string;
  size: number;
  uploadedBy?: string;
  uploadedAt: ISODateString;
}

/** Phase 2 — Google Drive recruitment workspace (folder ids + shareable links). */
export interface RequisitionDrive {
  rootFolderId: string;
  rootFolderUrl: string;
  allCvFolderId: string;
  allCvFolderUrl: string;
  shortlistedFolderId: string;
  interviewFolderId: string;
  finalFolderId: string;
  joiningFolderId: string;
  createdAt: ISODateString;
}

export interface Requisition {
  id: ID;
  code: string;

  // A · Vacancy Information
  designation: string;
  /** Confirmed job grade — set by the current approver during sign-off, not the requisitioner. */
  grade: string | null;
  requirementType: RequirementType;
  requiredPosts: number;
  totalVacantPosts: number;
  unitFactory: string;
  /** DBL business vertical (Garments, Pharma, Telecom…). */
  lineOfBusiness?: string | null;
  department: string;
  section?: string;
  subSection?: string;
  /** Replacement details — set only when requirementType is 'existing'. */
  replaceOfName?: string | null;
  replaceOfEmployeeCode?: string | null;
  separationReason?: string | null;
  replacementRemarks?: string | null;
  placeOfPosting: string;
  vacantDate: ISODateString | null;
  neededDate: ISODateString | null;
  priority: Priority;
  employmentNature: EmploymentNature;
  contractualPurpose: string;

  // B · Job Analysis
  jobDescription: string;
  education: string;
  experience: string;
  others: string;

  // C · Logistics Requirement
  facilities: Facilities;

  // E · Group HR
  preferredSources: PreferredSource[];

  // Workflow
  status: RequisitionStatus;
  approvalChain: ApprovalStep[];
  activityLog: ActivityLogEntry[];
  roleProfile: RoleProfile | null;
  posting: JobPosting | null;
  drive?: RequisitionDrive | null;
  /** Client-side only — set by RealtimeProvider on a `requisition:drive_failed`
   * event, never returned by the API. Cleared on refetch. */
  driveSetupError?: string | null;
  attachments?: RequisitionAttachment[];
  candidateStats?: CandidateStats;
  pipeline?: PipelineProgress;

  raisedBy: string;
  /** The requisitioner's user id — used to gate edit/resend while bounced back. */
  raisedById?: string | null;
  /** Assigned by Corporate HR once approved; owns the downstream lifecycle. */
  recruiter?: RequisitionRecruiter | null;
  recruiterAssignedAt?: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Signatory names captured at intake (Section D · Requested by). */
export interface RequisitionSignatories {
  departmentHeadName: string;
  departmentHeadDesignation: string;
  factoryHRName: string;
}

/** Payload accepted by the create endpoint. */
/** AI quick-fill result — mirrors the form fields; nothing is saved yet. */
export interface RequisitionDraft {
  designation: string;
  unitFactory: string;
  department: string;
  section: string;
  subSection: string;
  requiredPosts: number;
  placeOfPosting: string;
  vacantDate: string;
  neededDate: string;
  priority: 'top' | 'moderate' | 'ordinary';
  employmentNature: 'permanent' | 'temporary' | 'contractual';
  contractualPurpose: string;
  jobDescription: string;
  education: string;
  experience: string;
  others: string;
  preferredSources: PreferredSource[];
  /** What the AI assumed or couldn't determine — shown to the user. */
  notes: string;
}

export interface CreateRequisitionPayload {
  designation: string;
  requirementType: RequirementType;
  requiredPosts: number;
  totalVacantPosts: number;
  unitFactory: string;
  lineOfBusiness: string;
  department: string;
  section?: string;
  subSection?: string;
  replaceOfName?: string;
  replaceOfEmployeeCode?: string;
  separationReason?: string;
  replacementRemarks?: string;
  placeOfPosting: string;
  vacantDate: ISODateString | null;
  neededDate: ISODateString | null;
  priority: Priority;
  employmentNature: EmploymentNature;
  contractualPurpose: string;
  jobDescription: string;
  education: string;
  experience: string;
  others: string;
  facilities: FacilitiesRequestInput;
  preferredSources: PreferredSource[];
  signatories: RequisitionSignatories;
}

export interface RequisitionFilters {
  search?: string;
  status?: RequisitionStatus | 'all';
  unitFactory?: string;
  page?: number;
  pageSize?: number;
}

/** Fields editable while a requisition is awaiting approval. */
export interface UpdateRequisitionInput {
  /** One of JOB_GRADES (@modules/salaryFixation), or '' to clear. */
  grade?: string;
  requiredPosts?: number;
  totalVacantPosts?: number;
  placeOfPosting?: string;
  neededDate?: string;
  priority?: Priority;
  employmentNature?: EmploymentNature;
  contractualPurpose?: string;
  jobDescription?: string;
  education?: string;
  experience?: string;
  others?: string;
  preferredSources?: PreferredSource[];
}
