import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type FieldErrors, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Armchair,
  ArrowLeft,
  ArrowRight,
  Bus,
  Building2,
  Check,
  ClipboardList,
  Send,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  Loader2,
  Paperclip,
  Warehouse,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Button,
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
  useOrgStructure,
  type SeatLookupResult,
} from '@modules/organogram';
import { useAuth } from '@modules/auth';
import { useMyPermissions } from '@modules/rbac';

import {
  requisitionSchema,
  type RequisitionFormValues,
  type RequisitionFormOutput,
} from '../schemas/requisition.schema';
import type {
  CreateRequisitionPayload,
  RequisitionDraft,
} from '../types/requisition.types';
import { AiQuickFill } from './AiQuickFill';
import {
  EMPLOYMENT_NATURE_OPTIONS,
  PREFERRED_SOURCES,
  PRIORITY_OPTIONS,
  SOURCE_OPTIONS,
} from '../constants';

interface Props {
  onSubmit: (payload: CreateRequisitionPayload, attachments: File[]) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

const STEPS = [
  {
    key: 'vacancy',
    letter: 'A',
    title: 'Vacancy Information',
    description: 'Position, unit and timing of the requirement.',
    icon: ClipboardList,
    fields: [
      'designation', 'source', 'requirementType', 'requiredPosts',
      'totalVacantPosts', 'unitFactory', 'department', 'section',
      'placeOfPosting', 'vacantDate', 'neededDate', 'priority',
      'employmentNature', 'contractualPurpose',
    ],
  },
  {
    key: 'job',
    letter: 'B',
    title: 'Job Analysis',
    description: 'Job description and specification.',
    icon: FileText,
    fields: ['jobDescription', 'education', 'experience', 'others'],
  },
  {
    key: 'facilities',
    letter: 'C',
    title: 'Facility Requirements',
    description: 'What this hire will need — HR confirms or skips each as the requisition moves through approval.',
    icon: Armchair,
    fields: ['facilities'],
  },
  {
    key: 'attachments',
    letter: 'D',
    title: 'Attachments',
    description: 'Attach a detailed JD or any supporting document (optional).',
    icon: Paperclip,
    fields: [] as string[],
  },
  {
    key: 'sources',
    letter: 'E',
    title: 'Preferred Source of Candidates',
    description: 'How should this role be sourced?',
    icon: Building2,
    fields: ['preferredSources'],
  },
] as const;

export function RequisitionForm({ onSubmit, isSubmitting, onCancel }: Props) {
  const { user } = useAuth();
  const requestedBy = user?.name ?? '';
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [step, setStep] = useState(0);

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
      totalVacantPosts: 0,
      priority: 'moderate',
      employmentNature: 'permanent',
      facilities: {
        laptopDesktop: { requested: false, option: 'desktop', note: '' },
        transport: { requested: false, note: '' },
        dormitory: { requested: false, note: '' },
        seating: { requested: false, option: 'existing', note: '' },
      },
      preferredSources: [],
    },
  });

  const source = watch('source');
  const employmentNature = watch('employmentNature');
  const laptopDesktopRequested = watch('facilities.laptopDesktop.requested');
  const transportRequested = watch('facilities.transport.requested');
  const dormitoryRequested = watch('facilities.dormitory.requested');
  const seatingRequested = watch('facilities.seating.requested');
  const unit = watch('unitFactory') ?? '';
  const department = watch('department') ?? '';
  const section = watch('section') ?? '';
  const designation = watch('designation') ?? '';
  const requiredPosts = Number(watch('requiredPosts')) || 0;

  const { data: orgUnits } = useOrganogramUnits();
  const { data: structure } = useOrgStructure(unit);
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

  // Department → Section → Designation come from the unit's ZingHR structure.
  const departments = structure?.departments ?? [];
  const departmentOptions: SelectOption[] = departments.map((d) => ({
    value: d.department,
    label: d.department,
  }));
  const sections =
    departments.find((d) => d.department === department)?.sections ?? [];
  const sectionOptions: SelectOption[] = sections.map((s) => ({
    value: s.section,
    label: s.section,
  }));
  const designationSuggestions =
    sections.find((s) => s.section === section)?.designations ?? [];

  const unitReg = register('unitFactory');
  const deptReg = register('department');
  const sectionReg = register('section');

  // Live organogram check → drives New vs Replacement.
  const lookup = useSeatLookup(unit, department, designation);
  const vacant = lookup.data?.vacant ?? 0;
  // New when the request exceeds the available vacant sanctioned seats.
  const requirement: 'existing' | 'new' | undefined = lookup.data
    ? requiredPosts > vacant
      ? 'new'
      : 'existing'
    : undefined;

  useEffect(() => {
    if (requirement) setValue('requirementType', requirement);
  }, [requirement, setValue]);

  // Total vacant posts is read-only — taken from the organogram (sanctioned − filled).
  useEffect(() => {
    if (lookup.data) setValue('totalVacantPosts', lookup.data.vacant);
  }, [lookup.data, setValue]);

  const needsSbu = requirement === 'new' && source === 'factory';

  // --- AI quick-fill ------------------------------------------------------
  // Department/Section are <Select>s whose options only exist once the unit's
  // structure has loaded, so the draft is applied in stages: unit + plain
  // fields now, then department, then section as each option list arrives.
  const [pendingDraft, setPendingDraft] = useState<RequisitionDraft | null>(
    null,
  );

  const applyDraft = (d: RequisitionDraft) => {
    if (d.unitFactory) setValue('unitFactory', d.unitFactory);
    setValue('designation', d.designation);
    setValue('source', d.source);
    setValue('requiredPosts', d.requiredPosts);
    setValue('placeOfPosting', d.placeOfPosting);
    if (d.vacantDate) setValue('vacantDate', d.vacantDate);
    if (d.neededDate) setValue('neededDate', d.neededDate);
    setValue('priority', d.priority);
    setValue('employmentNature', d.employmentNature);
    setValue('contractualPurpose', d.contractualPurpose);
    setValue('jobDescription', d.jobDescription);
    setValue('education', d.education);
    setValue('experience', d.experience);
    setValue('others', d.others);
    setValue('preferredSources', d.preferredSources);
    // Cascading selects are filled by the effects below.
    setPendingDraft(d);
    // Bring the user back to the top of the wizard so they can review from A.
    setStep(0);
  };

  const departmentReady =
    pendingDraft?.department &&
    departments.some((x) => x.department === pendingDraft.department);

  useEffect(() => {
    if (departmentReady && pendingDraft) {
      setValue('department', pendingDraft.department);
    }
  }, [departmentReady, pendingDraft, setValue]);

  const sectionReady =
    pendingDraft &&
    department === pendingDraft.department &&
    (!pendingDraft.section ||
      sections.some((s) => s.section === pendingDraft.section));

  useEffect(() => {
    if (!pendingDraft || !sectionReady) return;
    if (pendingDraft.section) setValue('section', pendingDraft.section);
    // Re-assert the designation: changing unit/department/section clears it.
    if (pendingDraft.designation) {
      setValue('designation', pendingDraft.designation);
    }
    setPendingDraft(null);
  }, [sectionReady, pendingDraft, setValue]);

  // --- Wizard navigation ---------------------------------------------------
  const total = STEPS.length;
  const isLast = step === total - 1;
  const goTo = (i: number) => setStep(Math.max(0, Math.min(total - 1, i)));
  // Jumping to a step via the dots is just navigation, not completion — only
  // advancing past a step with "Next" marks it done, so simply viewing a
  // later step and coming back doesn't tick off everything before it.
  const [furthestDone, setFurthestDone] = useState(0);
  const advance = () => {
    setFurthestDone((f) => Math.max(f, step + 1));
    goTo(step + 1);
  };

  const onInvalid = (errs: FieldErrors<RequisitionFormValues>) => {
    const errorKeys = Object.keys(errs);
    const idx = STEPS.findIndex((s) =>
      s.fields.some((f) => errorKeys.includes(f)),
    );
    if (idx >= 0) goTo(idx);
  };

  const submit = handleSubmit((values) => {
    onSubmit(
      toPayload(values as RequisitionFormOutput, requestedBy),
      attachments,
    );
  }, onInvalid);

  const current = STEPS[step];
  const CurrentIcon = current.icon;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {/* AI assistant — drafts the form from a one-line description */}
      <AiQuickFill onDrafted={applyDraft} />

      {/* Progress */}
      <div className="flex items-center justify-center overflow-x-auto py-1">
        {STEPS.map((s, i) => {
          const state =
            i < furthestDone ? 'done' : i === step ? 'current' : 'upcoming';
          return (
            <div key={s.key} className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => goTo(i)}
                className="group flex flex-col items-center gap-1.5 px-1"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300',
                    state === 'done' &&
                      'border-brand-600 bg-brand-600 text-white',
                    state === 'current' &&
                      'scale-110 border-brand-600 bg-white text-brand-700 shadow-md shadow-brand-200',
                    state === 'upcoming' &&
                      'border-slate-200 bg-white text-slate-400 group-hover:border-slate-300 group-hover:text-slate-500',
                  )}
                >
                  {state === 'done' ? <Check className="h-4 w-4" /> : s.letter}
                </span>
                <span
                  className={cn(
                    'hidden whitespace-nowrap text-[11px] font-medium sm:block',
                    state === 'current' ? 'text-brand-700' : 'text-slate-400',
                  )}
                >
                  {s.title}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-1 h-0.5 w-6 shrink-0 rounded-full transition-colors duration-500 sm:w-12',
                    i < furthestDone ? 'bg-brand-500' : 'bg-slate-200',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Active step card */}
      <div
        key={step}
        className="relative animate-rise-in overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/60"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="relative p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-8 ring-brand-50/60">
                <CurrentIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                  Section {current.letter} · Step {step + 1} of {total}
                </p>
                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                  {current.title}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {current.description}
                </p>
              </div>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* A · Vacancy Information */}
          {step === 0 && (
            <>
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
                    setValue('section', '');
                    setValue('designation', '');
                  }}
                />
                <Select
                  label="Requisition source"
                  options={SOURCE_OPTIONS}
                  error={errors.source?.message}
                  {...register('source')}
                />
                <Select
                  label="Department"
                  placeholder={unit ? 'Select department' : 'Pick a unit first'}
                  options={departmentOptions}
                  disabled={!unit}
                  error={errors.department?.message}
                  {...deptReg}
                  onChange={(e) => {
                    void deptReg.onChange(e);
                    setValue('section', '');
                    setValue('designation', '');
                  }}
                />
                <Select
                  label="Section"
                  placeholder={
                    department ? 'Select section' : 'Pick a department first'
                  }
                  options={sectionOptions}
                  disabled={!department || sectionOptions.length === 0}
                  error={errors.section?.message}
                  {...sectionReg}
                  onChange={(e) => {
                    void sectionReg.onChange(e);
                    setValue('designation', '');
                  }}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Designation / Job title"
                    list="req-designations"
                    placeholder={
                      section ? 'Select or type a designation' : 'Pick a section first'
                    }
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
                  readOnly
                  hint="Auto-filled from the organogram (sanctioned − filled)"
                  className="bg-slate-50 text-slate-600"
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
                  error={errors.neededDate?.message}
                  {...register('neededDate')}
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
                requirement={requirement}
                requiredPosts={requiredPosts}
                needsSbu={needsSbu}
              />
            </>
          )}

          {/* B · Job Analysis */}
          {step === 1 && (
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
          )}

          {/* C · Facility Requirements */}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FacilityField
                icon={Laptop}
                title="Laptop / Desktop"
                requested={Boolean(laptopDesktopRequested)}
                toggleReg={register('facilities.laptopDesktop.requested')}
                noteReg={register('facilities.laptopDesktop.note')}
                notePlaceholder="e.g. needs a laptop for field visits"
                optionField={
                  <Select
                    label="Which one"
                    options={[
                      { value: 'desktop', label: 'Desktop' },
                      { value: 'laptop', label: 'Laptop' },
                    ]}
                    {...register('facilities.laptopDesktop.option')}
                  />
                }
              />
              <FacilityField
                icon={Bus}
                title="Transport Facility"
                requested={Boolean(transportRequested)}
                toggleReg={register('facilities.transport.requested')}
                noteReg={register('facilities.transport.note')}
                notePlaceholder="e.g. pickup from Savar area"
              />
              <FacilityField
                icon={Warehouse}
                title="Dormitory Facility"
                requested={Boolean(dormitoryRequested)}
                toggleReg={register('facilities.dormitory.requested')}
                noteReg={register('facilities.dormitory.note')}
                notePlaceholder="e.g. single room, near the factory"
              />
              <FacilityField
                icon={Armchair}
                title="Seating Arrangement"
                requested={Boolean(seatingRequested)}
                toggleReg={register('facilities.seating.requested')}
                noteReg={register('facilities.seating.note')}
                notePlaceholder="e.g. shared workstation is fine"
                optionField={
                  <Select
                    label="Which one"
                    options={[
                      { value: 'existing', label: 'Existing seat' },
                      { value: 'new', label: 'New seat' },
                    ]}
                    {...register('facilities.seating.option')}
                  />
                }
              />
            </div>
          )}

          {/* D · Attachments */}
          {step === 3 && (
            <div>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setAttachments((prev) => [...prev, ...files]);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Paperclip className="h-4 w-4" />}
                onClick={() => fileRef.current?.click()}
              >
                Add files
              </Button>
              {attachments.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {attachments.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm animate-fade-in"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-slate-700">
                        <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{f.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="rounded p-1 text-slate-400 hover:bg-slate-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-slate-400">
                Stored in this requisition&rsquo;s Drive folder after it&rsquo;s
                created. Up to 15 MB each.
              </p>
            </div>
          )}

          {/* E · Preferred Sources */}
          {step === 4 && (
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
          )}
        </div>

        {/* Step navigation */}
        <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:px-8">
          {step > 0 && (
            <Button
              type="button"
              variant="ghost"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => goTo(step - 1)}
            >
              Back
            </Button>
          )}
          {isLast ? (
            <Button
              type="submit"
              isLoading={isSubmitting}
              leftIcon={<Send className="h-4 w-4" />}
              className="ml-auto"
            >
              Submit to sign-off chain
            </Button>
          ) : (
            <Button
              type="button"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={advance}
              className="ml-auto"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

function OrganogramBanner({
  loading,
  show,
  result,
  requirement,
  requiredPosts,
  needsSbu,
}: {
  loading: boolean;
  show: boolean;
  result?: SeatLookupResult;
  requirement?: 'existing' | 'new';
  requiredPosts: number;
  needsSbu: boolean;
}) {
  if (!show) return null;

  if (loading || !result || !requirement) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500 animate-fade-in">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking the organogram…
      </div>
    );
  }

  const existing = requirement === 'existing';
  const vacant = result.vacant;
  const beyond = Math.max(0, requiredPosts - vacant);

  let message: string;
  if (existing) {
    message = `Replacement — filling ${requiredPosts} of ${vacant} vacant seat(s) in the organogram`;
  } else if (!result.inOrganogram) {
    message = 'New — this position is not in the organogram';
  } else if (vacant <= 0) {
    message = 'New — seat is fully filled (beyond sanctioned headcount)';
  } else {
    message = `New — requesting ${requiredPosts}, only ${vacant} vacant in the organogram (${beyond} beyond sanctioned headcount)`;
  }

  return (
    <div
      className={cn(
        'mt-5 rounded-lg border px-3 py-2.5 text-sm animate-fade-in',
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
        {message}
      </p>
      {needsSbu && (
        <p className="mt-1 text-xs">
          New factory headcount requires <strong>SBU Head</strong> approval in
          the sign-off chain.
        </p>
      )}
      {(result.seat?.grade || result.gradeReference.length > 0) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
          {result.seat?.grade && (
            <span>
              Organogram grade: <strong>{result.seat.grade}</strong>
            </span>
          )}
          {result.seat?.grade && result.gradeReference.length > 0 && <span>·</span>}
          {result.gradeReference.length > 0 && (
            <span>
              ZingHR shows{' '}
              {result.gradeReference
                .slice(0, 3)
                .map((g) => `${g.grade} (${g.count})`)
                .join(', ')}{' '}
              for this designation
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function FacilityField({
  icon: Icon,
  title,
  requested,
  toggleReg,
  noteReg,
  notePlaceholder,
  optionField,
}: {
  icon: LucideIcon;
  title: string;
  requested: boolean;
  toggleReg: UseFormRegisterReturn;
  noteReg: UseFormRegisterReturn;
  notePlaceholder: string;
  optionField?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors duration-200',
        requested ? 'border-brand-200 bg-brand-50/30' : 'border-slate-200',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Icon
            className={cn(
              'h-4 w-4 shrink-0 transition-colors duration-200',
              requested ? 'text-brand-600' : 'text-slate-400',
            )}
          />
          {title}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Needed</span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            {...toggleReg}
          />
        </label>
      </div>
      {requested && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {optionField}
          <Textarea
            label="Note"
            rows={2}
            placeholder={notePlaceholder}
            {...noteReg}
          />
        </div>
      )}
    </div>
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
    section: values.section || undefined,
    placeOfPosting: values.placeOfPosting,
    vacantDate: values.vacantDate || null,
    neededDate: values.neededDate || null,
    priority: values.priority,
    employmentNature: values.employmentNature,
    contractualPurpose: values.contractualPurpose ?? '',
    jobDescription: values.jobDescription,
    education: values.education,
    experience: values.experience,
    others: values.others ?? '',
    facilities: values.facilities,
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
