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
/** Where the requisition originates — drives Factory-HR / SBU steps. */
export type RequisitionSource = 'factory' | 'ho';

export type Priority = 'top' | 'moderate' | 'ordinary';
export type EmploymentNature = 'permanent' | 'temporary' | 'contractual';
export type ComputerRequirement = 'not_applicable' | 'desktop' | 'laptop';
export type SeatingArrangement = 'existing' | 'new';
export type PreferredSource =
  | 'job_advertisement'
  | 'headhunting'
  | 'referral'
  | 'cv_bank';

/** Roles that can appear in the dynamic sign-off chain. */
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
  | 'escalated';
export type StepStatus = 'pending' | 'approved' | 'rejected' | 'info_requested';

export interface ApprovalStep {
  role: ApprovalRole;
  title: string;
  subtitle: string;
  /** Named signatory (may be empty until assigned at approval time). */
  assignee: string;
  status: StepStatus;
  note: string;
  actedAt: ISODateString | null;
}

/** Audit trail of every approval action, including roll-backs. */
export interface ActivityLogEntry {
  actor: string;
  action: ApprovalDecision;
  note: string;
  at: ISODateString;
}

/** AI output (Step 3) — structured role profile derived from the form. */
export interface RoleProfile {
  summary: string;
  jobDescription: string;
  responsibilities: string[];
  requirements: string[];
  generatedAt: ISODateString;
}

/** Job posting record (Step 4). */
export interface JobPosting {
  sources: PreferredSource[];
  closingDate: ISODateString;
  postedAt: ISODateString;
}

/** Phase 2 — per-stage candidate counts for a requisition. */
export interface CandidateStats {
  applied: number;
  shortlisted: number;
  interview: number;
  final: number;
  selected: number;
  rejected: number;
  total: number;
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
  requirementType: RequirementType;
  source: RequisitionSource;
  requiredPosts: number;
  totalVacantPosts: number;
  unitFactory: string;
  department: string;
  placeOfPosting: string;
  vacantDate: ISODateString | null;
  whenNeededDate: ISODateString | null;
  priority: Priority;
  employmentNature: EmploymentNature;
  contractualPurpose: string;

  // B · Job Analysis
  jobDescription: string;
  education: string;
  experience: string;
  others: string;

  // C · Logistics Requirement
  computer: ComputerRequirement;
  computerReason: string;
  seating: SeatingArrangement;

  // E · Group HR
  preferredSources: PreferredSource[];

  // Workflow
  status: RequisitionStatus;
  approvalChain: ApprovalStep[];
  activityLog: ActivityLogEntry[];
  roleProfile: RoleProfile | null;
  posting: JobPosting | null;
  drive?: RequisitionDrive | null;
  candidateStats?: CandidateStats;

  raisedBy: string;
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
export interface CreateRequisitionPayload {
  designation: string;
  requirementType: RequirementType;
  source: RequisitionSource;
  requiredPosts: number;
  totalVacantPosts: number;
  unitFactory: string;
  department: string;
  placeOfPosting: string;
  vacantDate: ISODateString | null;
  whenNeededDate: ISODateString | null;
  priority: Priority;
  employmentNature: EmploymentNature;
  contractualPurpose: string;
  jobDescription: string;
  education: string;
  experience: string;
  others: string;
  computer: ComputerRequirement;
  computerReason: string;
  seating: SeatingArrangement;
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
  requiredPosts?: number;
  totalVacantPosts?: number;
  placeOfPosting?: string;
  whenNeededDate?: string;
  priority?: Priority;
  employmentNature?: EmploymentNature;
  contractualPurpose?: string;
  jobDescription?: string;
  education?: string;
  experience?: string;
  others?: string;
  preferredSources?: PreferredSource[];
}
