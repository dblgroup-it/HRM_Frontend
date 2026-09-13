import type { SelectOption } from '@shared/types';
import type { BadgeTone } from '@shared/components/ui';

import type {
  ApprovalRole,
  EmploymentNature,
  FacilityKey,
  PreferredSource,
  Priority,
  RequirementType,
  RequisitionStatus,
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

/** Display order + label for each of the 4 facility line items. */
export const FACILITY_META: { key: FacilityKey; label: string }[] = [
  { key: 'laptopDesktop', label: 'Laptop / Desktop' },
  { key: 'transport', label: 'Transport Facility' },
  { key: 'dormitory', label: 'Dormitory Facility' },
  { key: 'seating', label: 'Seating Arrangement' },
];

export const FACILITY_OPTION_LABEL: Record<string, string> = {
  desktop: 'Desktop',
  laptop: 'Laptop',
  existing: 'Existing seat',
  new: 'New seat',
  shared: 'Shared car',
  full_time: 'Full-time car',
  sedan: 'Sedan',
  suv: 'SUV',
};

/** How a transport facility is provided — a shared run, or a dedicated car. */
export const TRANSPORT_OPTIONS = [
  { value: 'shared', label: 'Shared car' },
  { value: 'full_time', label: 'Full-time car' },
] as const;

/** Only asked when the car is full-time; a shared run is whatever is on it. */
export const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
] as const;

export const PREFERRED_SOURCE_LABEL: Record<PreferredSource, string> = {
  job_advertisement: 'Job advertisement',
  headhunting: 'Headhunting agencies',
  cv_bank: 'CV Bank',
};

/** Labels no longer offered as a pick, kept only so older requisitions that
 * already saved them still display something readable. */
const LEGACY_SOURCE_LABEL: Record<string, string> = {
  referral: 'Referral from a reliable source',
};

/** Safe lookup for display — falls back to the legacy map, then the raw value,
 * so a requisition saved before a source was removed never renders blank. */
export function preferredSourceLabel(source: string): string {
  return (
    (PREFERRED_SOURCE_LABEL as Record<string, string>)[source] ??
    LEGACY_SOURCE_LABEL[source] ??
    source
  );
}

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
    title: 'Head of Talent Acquisition',
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
 *  - Head of Talent Acquisition is the single final approver.
 */
export function buildApprovalRoles(
  requirement: RequirementType,
): ApprovalRole[] {
  const roles: ApprovalRole[] = ['department_head'];
  if (requirement === 'new') roles.push('sbu_head');
  roles.push('corporate_hr');
  return roles;
}

/** Phase-1 high-level workflow steps used by the stepper. */
export const WORKFLOW_STEPS = [
  { key: 'requisition', label: 'Requisition', step: 1 },
  { key: 'approval', label: 'Approvals', step: 2 },
  { key: 'profile', label: 'Role Profile', step: 3 },
  { key: 'posting', label: 'Job Posting', step: 4 },
  { key: 'candidates', label: 'Candidates', step: 5 },
  { key: 'assessment', label: 'Assessment', step: 6 },
  { key: 'onboarding', label: 'Onboarding', step: 7 },
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
export const EMPLOYMENT_NATURE_OPTIONS = toOptions(EMPLOYMENT_NATURE_LABEL);
export const PREFERRED_SOURCES = (
  Object.keys(PREFERRED_SOURCE_LABEL) as PreferredSource[]
).map((value) => ({ value, label: PREFERRED_SOURCE_LABEL[value] }));
