import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  ClipboardList,
  Send,
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
  Badge,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import type { SelectOption } from '@shared/types';
import {
  useSeatLookup,
  useOrganogramUnits,
  type SeatLookupResult,
} from '@modules/organogram';
import { useAuth } from '@modules/auth';
import { useMyPermissions } from '@modules/rbac';

import {
  requisitionSchema,
  type RequisitionFormValues,
  type RequisitionFormOutput,
} from '../schemas/requisition.schema';
import type { CreateRequisitionPayload } from '../types/requisition.types';
import {
  EMPLOYMENT_NATURE_OPTIONS,
  PREFERRED_SOURCES,
  PRIORITY_OPTIONS,
  SOURCE_OPTIONS,
} from '../constants';

interface Props {
  onSubmit: (payload: CreateRequisitionPayload) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function RequisitionForm({ onSubmit, isSubmitting, onCancel }: Props) {
  const { user } = useAuth();
  const requestedBy = user?.name ?? '';

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
  const unit = watch('unitFactory') ?? '';
  const department = watch('department') ?? '';
  const designation = watch('designation') ?? '';

  const { data: orgUnits } = useOrganogramUnits();
  const { data: perms } = useMyPermissions();

  // The unit is the requester's assigned unit. Super users may raise for any unit.
  const allowedUnitNames = useMemo(() => {
    if (perms?.isSuperUser) return (orgUnits ?? []).map((u) => u.unit);
    return [
      ...new Set(
        (perms?.roles ?? [])
          .map((r) => r.unitName)
          .filter((n): n is string => Boolean(n)),
      ),
    ];
  }, [perms, orgUnits]);

  const unitOptions: SelectOption[] = allowedUnitNames.map((n) => ({
    value: n,
    label: n,
  }));
  const lockedUnit = allowedUnitNames.length === 1;
  const allowedKey = allowedUnitNames.join('|');

  // Auto-select when the requester belongs to exactly one unit.
  useEffect(() => {
    if (lockedUnit && unit !== allowedUnitNames[0]) {
      setValue('unitFactory', allowedUnitNames[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedKey]);

  // Department + designation suggestions come from the selected unit's organogram.
  const selectedUnit = orgUnits?.find((u) => u.unit === unit);
  const departmentSuggestions = (selectedUnit?.departments ?? []).map(
    (d) => d.department,
  );
  const designationSuggestions = (
    selectedUnit?.departments.find((d) => d.department === department)?.seats ??
    []
  ).map((s) => s.designation);

  const unitReg = register('unitFactory');
  const deptReg = register('department');

  // Live organogram check → drives New vs Replacement.
  const lookup = useSeatLookup(unit, department, designation);
  const requirement = lookup.data?.requirement;
  useEffect(() => {
    if (requirement) setValue('requirementType', requirement);
  }, [requirement, setValue]);

  const needsSbu = requirement === 'new' && source === 'factory';

  const submit = handleSubmit((values) =>
    onSubmit(toPayload(values as RequisitionFormOutput, requestedBy)),
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
        {requestedBy && (
          <p className="mb-4 flex items-center gap-2 text-xs text-slate-500">
            Raising as
            <Badge tone="brand">{requestedBy}</Badge>
            (Department Head)
          </p>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label="Unit / Factory"
            placeholder="Select unit"
            options={unitOptions}
            disabled={lockedUnit}
            error={errors.unitFactory?.message}
            {...unitReg}
            onChange={(e) => {
              void unitReg.onChange(e);
              setValue('department', '');
              setValue('designation', '');
            }}
          />
          <Select
            label="Requisition source"
            options={SOURCE_OPTIONS}
            error={errors.source?.message}
            {...register('source')}
          />
          <div>
            <Input
              label="Department / Section"
              list="req-departments"
              placeholder={
                unit ? 'Select or type a department' : 'Pick a unit first'
              }
              error={errors.department?.message}
              {...deptReg}
              onChange={(e) => {
                void deptReg.onChange(e);
                setValue('designation', '');
              }}
            />
            <datalist id="req-departments">
              {departmentSuggestions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <div>
            <Input
              label="Designation / Job title"
              list="req-designations"
              placeholder="Select an existing seat or type a new one"
              error={errors.designation?.message}
              {...register('designation')}
            />
            <datalist id="req-designations">
              {designationSuggestions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
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

      {/* C · Preferred Sources */}
      <Section
        letter="C"
        icon={Building2}
        title="Preferred Source of Candidates"
        description="How should this role be sourced?"
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
          : 'border-amber-200 bg-amber-50 text-amber-800',
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

function toPayload(
  values: RequisitionFormOutput,
  requestedBy: string,
): CreateRequisitionPayload {
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
    // The requester is the Department Head; Factory HR / others come from
    // role assignments on the backend.
    signatories: {
      departmentHeadName: requestedBy,
      departmentHeadDesignation: '',
      factoryHRName: '',
    },
  };
}
