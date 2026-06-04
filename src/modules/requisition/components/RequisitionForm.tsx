import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  ClipboardList,
  Laptop,
  Send,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Input,
  Select,
  Textarea,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useSeatLookup, type SeatLookupResult } from '@modules/organogram';

import {
  requisitionSchema,
  type RequisitionFormValues,
  type RequisitionFormOutput,
} from '../schemas/requisition.schema';
import type { CreateRequisitionPayload } from '../types/requisition.types';
import {
  DEPARTMENT_OPTIONS,
  EMPLOYMENT_NATURE_OPTIONS,
  PREFERRED_SOURCES,
  PRIORITY_OPTIONS,
  SOURCE_OPTIONS,
  UNIT_OPTIONS,
} from '../constants';

const COMPUTER_OPTIONS = [
  { value: 'not_applicable', label: 'Not Applicable' },
  { value: 'desktop', label: 'Applicable — Desktop' },
  { value: 'laptop', label: 'Applicable — Laptop' },
];

const SEATING_OPTIONS = [
  { value: 'existing', label: 'Manageable from existing' },
  { value: 'new', label: 'Required new arrangement' },
];

interface Props {
  onSubmit: (payload: CreateRequisitionPayload) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function RequisitionForm({ onSubmit, isSubmitting, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      source: 'factory',
      requirementType: 'new',
      requiredPosts: 1,
      totalVacantPosts: 1,
      priority: 'moderate',
      employmentNature: 'permanent',
      computer: 'not_applicable',
      seating: 'existing',
      preferredSources: [],
    },
  });

  const source = watch('source');
  const employmentNature = watch('employmentNature');
  const computer = watch('computer');
  const unit = watch('unitFactory') ?? '';
  const department = watch('department') ?? '';
  const designation = watch('designation') ?? '';

  // Live organogram check → drives New vs Replacement.
  const lookup = useSeatLookup(unit, department, designation);
  const requirement = lookup.data?.requirement;

  useEffect(() => {
    if (requirement) setValue('requirementType', requirement);
  }, [requirement, setValue]);

  const needsSbu = requirement === 'new' && source === 'factory';

  const submit = handleSubmit((values) =>
    onSubmit(toPayload(values as RequisitionFormOutput))
  );

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {/* A · Vacancy Information */}
      <Section
        letter="A"
        icon={ClipboardList}
        title="Vacancy Information"
        description="Position, unit and timing of the requirement."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Designation / Job title"
            placeholder="e.g. Assistant Production Officer"
            error={errors.designation?.message}
            {...register('designation')}
          />
          <Select
            label="Requisition source"
            options={SOURCE_OPTIONS}
            error={errors.source?.message}
            {...register('source')}
          />
          <Select
            label="Unit / Factory"
            placeholder="Select unit"
            options={UNIT_OPTIONS}
            error={errors.unitFactory?.message}
            {...register('unitFactory')}
          />
          <Select
            label="Department / Section"
            placeholder="Select department"
            options={DEPARTMENT_OPTIONS}
            error={errors.department?.message}
            {...register('department')}
          />
          <Input
            label="Nos. of required post"
            type="number"
            min={1}
            error={errors.requiredPosts?.message}
            {...register('requiredPosts')}
          />
          <Input
            label="Total no. of vacant post"
            type="number"
            min={1}
            error={errors.totalVacantPosts?.message}
            {...register('totalVacantPosts')}
          />
          <div className="sm:col-span-2">
            <Input
              label="Place of posting"
              placeholder="e.g. Shreehatta Economic Zone, Moulvibazar"
              error={errors.placeOfPosting?.message}
              {...register('placeOfPosting')}
            />
          </div>
          <Input
            label="Vacant date"
            type="date"
            error={errors.vacantDate?.message}
            {...register('vacantDate')}
          />
          <Input
            label="When needed (date)"
            type="date"
            hint="Fresher — 4 weeks · Experienced — 8 weeks lead time"
            error={errors.whenNeededDate?.message}
            {...register('whenNeededDate')}
          />
          <Select
            label="Priority"
            options={PRIORITY_OPTIONS}
            error={errors.priority?.message}
            {...register('priority')}
          />
          <Select
            label="Permanent / Temporary / Contractual"
            options={EMPLOYMENT_NATURE_OPTIONS}
            error={errors.employmentNature?.message}
            {...register('employmentNature')}
          />
          {employmentNature !== 'permanent' && (
            <div className="sm:col-span-2">
              <Input
                label="Purpose (temporary / contractual)"
                placeholder="Reason for the temporary / contractual engagement"
                error={errors.contractualPurpose?.message}
                {...register('contractualPurpose')}
              />
            </div>
          )}
        </div>

        {/* Organogram verdict */}
        <OrganogramBanner
          loading={lookup.isFetching}
          show={Boolean(unit && department && designation.trim().length > 2)}
          result={lookup.data}
          needsSbu={needsSbu}
        />
      </Section>

      {/* B · Job Analysis */}
      <Section
        letter="B"
        icon={FileText}
        title="Job Analysis"
        description="Job description and specification."
      >
        <div className="space-y-5">
          <Textarea
            label="Job description"
            rows={3}
            placeholder="Summary of duties (attach detailed JD separately if needed)"
            error={errors.jobDescription?.message}
            {...register('jobDescription')}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Education & training"
              placeholder="e.g. B.Sc. in Textile Engineering (BUTex / AUST)"
              error={errors.education?.message}
              {...register('education')}
            />
            <Input
              label="Experience"
              placeholder="e.g. Fresh graduates encouraged to apply"
              error={errors.experience?.message}
              {...register('experience')}
            />
            <div className="sm:col-span-2">
              <Input
                label="Others"
                placeholder="e.g. Ability to work in a shift-based environment"
                error={errors.others?.message}
                {...register('others')}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* C · Logistics Requirement */}
      <Section
        letter="C"
        icon={Laptop}
        title="Logistics Requirement"
        description="Computer and seating arrangement."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label="Computer"
            options={COMPUTER_OPTIONS}
            {...register('computer')}
          />
          {computer !== 'not_applicable' && (
            <Input
              label="Reason (if needed)"
              placeholder="Why is a computer required?"
              {...register('computerReason')}
            />
          )}
          <Select
            label="Seating arrangement"
            options={SEATING_OPTIONS}
            {...register('seating')}
          />
        </div>
      </Section>

      {/* D · Requested by */}
      <Section
        letter="D"
        icon={Users}
        title="Requested By"
        description="Signatories who raise and verify the requisition."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Department / Division Head — name"
            placeholder="e.g. Mohammad Abdul Latif"
            error={errors.departmentHeadName?.message}
            {...register('departmentHeadName')}
          />
          <Input
            label="Department Head — designation"
            placeholder="e.g. GM-Production"
            {...register('departmentHeadDesignation')}
          />
          {source === 'factory' && (
            <Input
              label="Factory HR — name"
              placeholder="e.g. Omar Faruque"
              error={errors.factoryHRName?.message}
              {...register('factoryHRName')}
            />
          )}
        </div>
      </Section>

      {/* E · Group HR */}
      <Section
        letter="E"
        icon={Building2}
        title="Preferred Source of Candidates"
        description="Group HR — how should this role be sourced?"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PREFERRED_SOURCES.map(({ value, label }) => (
            <Checkbox
              key={value}
              label={label}
              value={value}
              {...register('preferredSources')}
            />
          ))}
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
          leftIcon={<Send className="h-4 w-4" />}
        >
          Submit to sign-off chain
        </Button>
      </div>
    </form>
  );
}

function OrganogramBanner({
  loading,
  show,
  result,
  needsSbu,
}: {
  loading: boolean;
  show: boolean;
  result?: SeatLookupResult;
  needsSbu: boolean;
}) {
  if (!show) return null;

  if (loading || !result) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking the organogram…
      </div>
    );
  }

  const existing = result.requirement === 'existing';
  return (
    <div
      className={cn(
        'mt-5 rounded-lg border px-3 py-2.5 text-sm',
        existing
          ? 'border-sky-200 bg-sky-50 text-sky-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      )}
    >
      <p className="flex items-center gap-2 font-medium">
        {existing ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        {existing
          ? `Replacement — ${result.vacant} vacant seat(s) in the organogram`
          : result.inOrganogram
            ? 'New — seat exists but is fully filled (beyond sanctioned headcount)'
            : 'New — this position is not in the organogram'}
      </p>
      {needsSbu && (
        <p className="mt-1 text-xs">
          New factory headcount requires <strong>SBU Head</strong> approval in
          the sign-off chain.
        </p>
      )}
    </div>
  );
}

function Section({
  letter,
  icon: Icon,
  title,
  description,
  children,
}: {
  letter: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardBody>
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            {letter}
          </span>
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Icon className="h-4 w-4 text-brand-600" />
              {title}
            </h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

function toPayload(values: RequisitionFormOutput): CreateRequisitionPayload {
  return {
    designation: values.designation,
    requirementType: values.requirementType,
    source: values.source,
    requiredPosts: values.requiredPosts,
    totalVacantPosts: values.totalVacantPosts,
    unitFactory: values.unitFactory,
    department: values.department,
    placeOfPosting: values.placeOfPosting,
    vacantDate: values.vacantDate || null,
    whenNeededDate: values.whenNeededDate || null,
    priority: values.priority,
    employmentNature: values.employmentNature,
    contractualPurpose: values.contractualPurpose ?? '',
    jobDescription: values.jobDescription,
    education: values.education,
    experience: values.experience,
    others: values.others ?? '',
    computer: values.computer,
    computerReason: values.computerReason ?? '',
    seating: values.seating,
    preferredSources: values.preferredSources,
    signatories: {
      departmentHeadName: values.departmentHeadName,
      departmentHeadDesignation: values.departmentHeadDesignation ?? '',
      factoryHRName: values.factoryHRName ?? '',
    },
  };
}
