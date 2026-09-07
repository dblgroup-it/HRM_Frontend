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
  Combobox,
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
import { useMasterData, sectionKey } from '@modules/master-data';
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
      'designation', 'requirementType', 'requiredPosts',
      'totalVacantPosts', 'unitFactory', 'department', 'section', 'subSection',
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

  const employmentNature = watch('employmentNature');
  const laptopDesktopRequested = watch('facilities.laptopDesktop.requested');
  const transportRequested = watch('facilities.transport.requested');
  const dormitoryRequested = watch('facilities.dormitory.requested');
  const seatingRequested = watch('facilities.seating.requested');
  const unit = watch('unitFactory') ?? '';
  const department = watch('department') ?? '';
  const designation = watch('designation') ?? '';
  const sectionValue = watch('section') ?? '';
  const subSection = watch('subSection') ?? '';
  const placeOfPosting = watch('placeOfPosting') ?? '';
  const requiredPosts = Number(watch('requiredPosts')) || 0;

  const { data: orgUnits } = useOrganogramUnits();
  const { data: perms } = useMyPermissions();

  // Only units the requester may actually raise for — the backend requires the
  // Requisition Raiser role, so offering any other unit here would just produce
  // a 403 on submit. Super users may raise for any unit.
  const allowedUnitNames = useMemo(() => {
    if (perms?.isSuperUser) return (orgUnits ?? []).map((u) => u.unit);
    return [
      ...new Set(
        (perms?.roles ?? [])
          .filter((r) => r.key === 'requisition_raiser')
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

  // Department / section / designation / place of posting come from the fixed
  // ZingHR-sourced vocabulary, not from the unit's organogram — the organogram
  // holds only what is currently sanctioned, which is a subset. The organogram
  // is still consulted below for vacancy (see `lookup`), so a designation that
  // isn't a sanctioned seat is correctly reported as NEW headcount.
  const { data: master } = useMasterData();

  const departmentOptions: SelectOption[] = (master?.departments ?? []).map(
    (d) => ({ value: d, label: d }),
  );
  const sections = department ? (master?.departmentSections[department] ?? []) : [];
  const sectionOptions: SelectOption[] = sections.map((sec) => ({
    value: sec,
    label: sec,
  }));
  // Sub-sections hang off the department+section PAIR. ZingHR has no mapping
  // for every pair, so fall back to the full list rather than an empty dropdown.
  const subSectionChoices =
    department && sectionValue
      ? (master?.sectionSubSections[sectionKey(department, sectionValue)] ??
         master?.subSections ??
         [])
      : [];
  const subSectionOptions: SelectOption[] = subSectionChoices.map((v) => ({
    value: v,
    label: v,
  }));

  const designationOptions: SelectOption[] = (master?.designations ?? []).map(
    (d) => ({ value: d, label: d }),
  );
  const zoneOptions: SelectOption[] = (master?.zones ?? []).map((z) => ({
    value: z,
    label: z,
  }));
  // Grades valid for the chosen designation — shown as a read-only suggestion,
  // never captured here: the approver still confirms grade at sign-off.
  const suggestedGrades = designation
    ? (master?.designationGrades[designation] ?? [])
    : [];

  const unitReg = register('unitFactory');

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


  // --- AI quick-fill ------------------------------------------------------
  // The AI returns free text, but department / section / designation / place of
  // posting are now fixed dropdowns. Each suggested value is snapped onto the
  // vocabulary and dropped if it has no match, so a select can never hold a
  // value that isn't a real option. Anything dropped is reported rather than
  // silently discarded.
  const [pendingDraft, setPendingDraft] = useState<RequisitionDraft | null>(
    null,
  );
  const [unmatched, setUnmatched] = useState<string[]>([]);

  const applyDraft = (d: RequisitionDraft) => {
    // Master data may still be loading; the effect below applies it once ready.
    setPendingDraft(d);
    setStep(0);
  };

  useEffect(() => {
    if (!pendingDraft || !master) return;
    const d = pendingDraft;

    // "R and D" vs "R & D", "IT  Support" vs "IT Support" — the master list
    // spells out "and", so normalise before comparing rather than demanding an
    // exact string match.
    const norm = (v: string) =>
      v.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
    const snap = (value: string | undefined, options: string[]) => {
      if (!value?.trim()) return '';
      const target = norm(value);
      return options.find((o) => norm(o) === target) ?? '';
    };

    const missed: string[] = [];
    const pick = (label: string, value: string | undefined, options: string[]) => {
      const hit = snap(value, options);
      if (!hit && value?.trim()) missed.push(`${label}: “${value.trim()}”`);
      return hit;
    };

    if (d.unitFactory) setValue('unitFactory', d.unitFactory);

    const dept = pick('Department', d.department, master.departments);
    if (dept) setValue('department', dept);

    const sec = dept
      ? pick('Section', d.section, master.departmentSections[dept] ?? [])
      : '';
    if (sec) setValue('section', sec);

    const sub =
      dept && sec
        ? pick(
            'Sub-section',
            d.subSection,
            master.sectionSubSections[sectionKey(dept, sec)] ??
              master.subSections,
          )
        : '';
    if (sub) setValue('subSection', sub);

    const des = pick('Designation', d.designation, master.designations);
    if (des) setValue('designation', des);

    const zone = pick('Place of posting', d.placeOfPosting, master.zones);
    if (zone) setValue('placeOfPosting', zone);

    setValue('requiredPosts', d.requiredPosts);
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

    setUnmatched(missed);
    setPendingDraft(null);
  }, [pendingDraft, master, setValue]);

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
                  (Requisition Raiser)
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
                <Combobox
                  label="Department"
                  placeholder="Select department"
                  options={departmentOptions}
                  value={department}
                  error={errors.department?.message}
                  onChange={(v) => {
                    setValue('department', v, { shouldValidate: true });
                    // Section belongs to a department, sub-section to the pair —
                    // stale values would be invalid against the new parent.
                    setValue('section', '');
                    setValue('subSection', '');
                  }}
                />
                <Combobox
                  label="Section"
                  placeholder={
                    department ? 'Select section' : 'Pick a department first'
                  }
                  options={sectionOptions}
                  value={sectionValue}
                  disabled={!department || sectionOptions.length === 0}
                  error={errors.section?.message}
                  onChange={(v) => {
                    setValue('section', v, { shouldValidate: true });
                    setValue('subSection', '');
                  }}
                />
                <Combobox
                  label="Sub-section"
                  placeholder={
                    sectionValue ? 'Select sub-section' : 'Pick a section first'
                  }
                  options={subSectionOptions}
                  value={subSection}
                  disabled={!sectionValue || subSectionOptions.length === 0}
                  error={errors.subSection?.message}
                  onChange={(v) =>
                    setValue('subSection', v, { shouldValidate: true })
                  }
                />
                <div className="sm:col-span-2">
                  <Combobox
                    label="Designation / Job title"
                    placeholder="Select designation"
                    options={designationOptions}
                    value={designation}
                    error={errors.designation?.message}
                    onChange={(v) =>
                      setValue('designation', v, { shouldValidate: true })
                    }
                  />
                  {suggestedGrades.length > 0 && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1 text-xs text-slate-500">
                      Suggested grade
                      {suggestedGrades.length > 1 ? 's' : ''}:
                      {suggestedGrades.map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
                        >
                          {g}
                        </span>
                      ))}
                      <span className="text-slate-400">
                        · confirmed by the approver at sign-off
                      </span>
                    </p>
                  )}
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
                  <Combobox
                    label="Place of posting"
                    placeholder="Select zone"
                    options={zoneOptions}
                    value={placeOfPosting}
                    error={errors.placeOfPosting?.message}
                    onChange={(v) =>
                      setValue('placeOfPosting', v, { shouldValidate: true })
                    }
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
              {unmatched.length > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 animate-fade-in">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    The AI suggested {unmatched.join(', ')} — not in the fixed
                    list, so {unmatched.length > 1 ? 'those fields were' : 'that field was'}{' '}
                    left blank. Please pick from the dropdown.
                  </span>
                </div>
              )}

              <OrganogramBanner
                loading={lookup.isFetching}
                show={Boolean(unit && department && designation.trim().length > 2)}
                result={lookup.data}
                requirement={requirement}
                requiredPosts={requiredPosts}
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
}: {
  loading: boolean;
  show: boolean;
  result?: SeatLookupResult;
  requirement?: 'existing' | 'new';
  requiredPosts: number;
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
    requiredPosts: values.requiredPosts,
    totalVacantPosts: values.totalVacantPosts,
    unitFactory: values.unitFactory,
    department: values.department,
    section: values.section || undefined,
    subSection: values.subSection || undefined,
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
