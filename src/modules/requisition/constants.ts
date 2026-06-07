import type { SelectOption } from '@shared/types';
import type { BadgeTone } from '@shared/components/ui';

import type {
  ApprovalRole,
  ComputerRequirement,
  EmploymentNature,
  PreferredSource,
  Priority,
  RequirementType,
  RequisitionSource,
  RequisitionStatus,
  SeatingArrangement,
} from './types/requisition.types';

/** DBL Group units / factories (aligned with the organogram units). */
export const UNITS = [
  'Jinnat Textile Mills Ltd',
  'Jinnat Apparels Ltd',
  'Matin Spinning Mills Ltd',
  'DBL Group — Head Office',
  'Color City Ltd',
  'DBL Ceramics Ltd',
] as const;

export const DEPARTMENTS = [
  'Production & QC',
  'Production',
  'Quality',
  'Spinning',
  'Maintenance',
  'Utility',
  'Merchandising',
  'Human Resources',
  'Accounts & Finance',
  'Finance & Accounts',
  'IT & Systems',
  'Store',
  'Admin, Safety & Security',
  'Compliance',
] as const;

export const REQUIREMENT_LABEL: Record<RequirementType, string> = {
  existing: 'Replacement (existing seat)',
  new: 'New (not in organogram)',
};

export const REQUIREMENT_TONE: Record<RequirementType, BadgeTone> = {
  existing: 'info',
  new: 'warning',
};

export const SOURCE_LABEL: Record<RequisitionSource, string> = {
  factory: 'From Factory',
  ho: 'From Head Office',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  top: 'Top Priority',
  moderate: 'Moderate',
  ordinary: 'Ordinary',
};

export const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  top: 'danger',
  moderate: 'warning',
  ordinary: 'neutral',
};

export const EMPLOYMENT_NATURE_LABEL: Record<EmploymentNature, string> = {
  permanent: 'Permanent',
  temporary: 'Temporary',
  contractual: 'Contractual',
};

export const COMPUTER_LABEL: Record<ComputerRequirement, string> = {
  not_applicable: 'Not Applicable',
  desktop: 'Desktop',
  laptop: 'Laptop',
};

export const SEATING_LABEL: Record<SeatingArrangement, string> = {
  existing: 'Manageable from existing',
  new: 'Required new arrangement',
};

export const PREFERRED_SOURCE_LABEL: Record<PreferredSource, string> = {
  job_advertisement: 'Job advertisement',
  headhunting: 'Headhunting agencies',
  referral: 'Referral from a reliable source',
  cv_bank: 'CV Bank',
};

export const STATUS_CONFIG: Record<
  RequisitionStatus,
  { label: string; tone: BadgeTone }
> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending_approval: { label: 'Pending Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'info' },
  rejected: { label: 'Rejected', tone: 'danger' },
  profile_generated: { label: 'Profile Ready', tone: 'brand' },
  posted: { label: 'Posted', tone: 'success' },
};

/** Metadata for every possible approval role. */
export const APPROVAL_ROLE_META: Record<
  ApprovalRole,
  { title: string; subtitle: string }
> = {
  department_head: {
    title: 'Department / Division Head',
    subtitle: 'Raises and signs the requisition',
  },
  factory_hr: {
    title: 'Factory HR',
    subtitle: 'Verifies vacancy & local details',
  },
  sbu_head: {
    title: 'SBU Head',
    subtitle: 'Approves new headcount beyond organogram',
  },
  corporate_hr: {
    title: 'Corporate HR',
    subtitle: 'Final approval to commence hiring',
  },
  chro: {
    title: 'CHRO',
    subtitle: 'Escalated final approval',
  },
};

/**
 * Resolve the ordered approval roles from the routing rules:
 *  - Department Head always first.
 *  - Factory HR when the source is a factory.
 *  - SBU Head only for NEW headcount raised from a factory.
 *  - Corporate HR is the single final approver.
 */
export function buildApprovalRoles(
  requirement: RequirementType,
  source: RequisitionSource
): ApprovalRole[] {
  const roles: ApprovalRole[] = ['department_head'];
  if (source === 'factory') roles.push('factory_hr');
  if (requirement === 'new' && source === 'factory') roles.push('sbu_head');
  roles.push('corporate_hr');
  return roles;
}

/** Phase-1 high-level workflow steps used by the stepper. */
export const WORKFLOW_STEPS = [
  { key: 'requisition', label: 'Requisition', step: 1 },
  { key: 'approval', label: 'Approvals', step: 2 },
  { key: 'profile', label: 'Role Profile', step: 3 },
  { key: 'posting', label: 'Job Posting', step: 4 },
] as const;

// --- Select option helpers ---------------------------------------------------

const toOptions = <T extends string>(map: Record<T, string>): SelectOption[] =>
  (Object.entries(map) as [T, string][]).map(([value, label]) => ({
    value,
    label,
  }));

export const UNIT_OPTIONS: SelectOption[] = UNITS.map((u) => ({
  value: u,
  label: u,
}));
export const DEPARTMENT_OPTIONS: SelectOption[] = DEPARTMENTS.map((d) => ({
  value: d,
  label: d,
}));
export const PRIORITY_OPTIONS = toOptions(PRIORITY_LABEL);
export const SOURCE_OPTIONS = toOptions(SOURCE_LABEL);
export const EMPLOYMENT_NATURE_OPTIONS = toOptions(EMPLOYMENT_NATURE_LABEL);
export const PREFERRED_SOURCES = (
  Object.keys(PREFERRED_SOURCE_LABEL) as PreferredSource[]
).map((value) => ({ value, label: PREFERRED_SOURCE_LABEL[value] }));
