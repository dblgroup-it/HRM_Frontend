import { useEffect, useMemo, useState } from 'react';
import {
  useFieldArray,
  useForm,
  type FieldErrors,
  type UseFormRegisterReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Armchair,
  ArrowLeft,
  ArrowRight,
  Bus,
  Check,
  ClipboardList,
  Send,
  CheckCircle2,
  AlertTriangle,
  Info,
  Laptop,
  Loader2,
  Warehouse,
  Plus,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Button,
  Combobox,
  Input,
  Select,
  Textarea,
  Badge,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import type { SelectOption } from '@shared/types';
import { wholeNumberInput } from '@shared/utils';
import {
  useSeatLookup,
  useOrganogramUnits,
  type SeatLookupResult,
} from '@modules/organogram';
import { useMasterData, sectionKey } from '@modules/master-data';
import { EmployeePicker } from './EmployeePicker';
import { useAuth } from '@modules/auth';
import { useMyPermissions } from '@modules/rbac';
import { useMyRaiserScope } from '@modules/approval-paths';

import {
  requisitionSchema,
  type RequisitionFormValues,
  type RequisitionFormOutput,
} from '../schemas/requisition.schema';
import type { CreateRequisitionPayload } from '../types/requisition.types';
import {
  EMPLOYMENT_NATURE_OPTIONS,
  FACILITY_CAVEAT,
  PRIORITY_OPTIONS,
  TRANSPORT_OPTIONS,
  VEHICLE_TYPES,
} from '../constants';

interface Props {
  onSubmit: (payload: CreateRequisitionPayload) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

/** Loose unit-name match — ZingHR and hand-configured names drift on trailing
 *  punctuation (CLAUDE.md §10). Mirrors the backend's normalizeUnitName. */
function sameUnitName(a: string, b: string): boolean {
  const norm = (v: string) => v.trim().toLowerCase().replace(/[.,;:'`-]+$/, '');
  return norm(a) === norm(b);
}

/**
 * What the requisitioner fills in — and deliberately nothing else.
 *
 * The job analysis (job description, education, experience) and the detailed
 * JD attachment are the unit's Factory HR's, written after this form is
 * submitted and before the requisition enters its approval chain. Preferred
 * sources are gone: every posted requisition goes to the DBL career page.
 */
const STEPS = [
  {
    key: 'vacancy',
    letter: 'A',
    title: 'Vacancy Information',
    description: 'Position, unit and timing of the requirement.',
    icon: ClipboardList,
    fields: [
      'designation', 'requirementType', 'requiredPosts',
      'totalVacantPosts', 'unitFactory', 'lineOfBusiness', 'department',
      'section', 'subSection', 'alternateDesignations', 'replacements',
      'replaceOfName', 'replaceOfEmployeeCode',
      'separationReason', 'replacementRemarks',
      'placeOfPosting', 'vacantDate', 'neededDate', 'priority',
      'employmentNature', 'contractualPurpose',
    ],
  },
  {
    key: 'facilities',
    letter: 'B',
    title: 'Facility Requirements',
    description: 'What this hire will need — HR confirms or skips each as the requisition moves through approval.',
    icon: Armchair,
    fields: ['facilities'],
  },
] as const;

export function RequisitionForm({ onSubmit, isSubmitting, onCancel }: Props) {
  const { user } = useAuth();
  const requestedBy = user?.name ?? '';
  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      requirementType: 'new',
      alternateDesignations: [],
      replacements: [],
      lineOfBusiness: '',
      replaceOfName: '',
      replaceOfEmployeeCode: '',
      separationReason: '',
      replacementRemarks: '',
      requiredPosts: 1,
      totalVacantPosts: 0,
      priority: 'moderate',
      employmentNature: 'permanent',
      facilities: {
        laptopDesktop: { requested: false, option: 'desktop', note: '' },
        transport: {
          requested: false,
          note: '',
          option: 'shared',
          vehicleType: '',
        },
        dormitory: { requested: false, note: '' },
        seating: { requested: false, option: 'existing', note: '' },
      },
    },
  });

  const employmentNature = watch('employmentNature');
  const laptopDesktopRequested = watch('facilities.laptopDesktop.requested');
  const transportRequested = watch('facilities.transport.requested');
  const transportOption = watch('facilities.transport.option');
  const dormitoryRequested = watch('facilities.dormitory.requested');
  const seatingRequested = watch('facilities.seating.requested');
  const unit = watch('unitFactory') ?? '';
  const lineOfBusiness = watch('lineOfBusiness') ?? '';
  const requirementType = watch('requirementType') ?? 'new';
  const alternateDesignations = watch('alternateDesignations') ?? [];

  /**
   * The people being replaced — a list, because one requisition often refills
   * several seats at once.
   */
  const replacementRows = useFieldArray({
    control,
    name: 'replacements',
  });
  const replacements = watch('replacements') ?? [];
  const namedReplacements = replacements.filter(
    (r) => (r.employeeName ?? '').trim().length > 1,
  );


  const department = watch('department') ?? '';
  const designation = watch('designation') ?? '';
  const sectionValue = watch('section') ?? '';
  const subSection = watch('subSection') ?? '';
  const placeOfPosting = watch('placeOfPosting') ?? '';
  const requiredPosts = Number(watch('requiredPosts')) || 0;

  /**
   * A notice, never a block: replacing three leavers with two hires is a real
   * decision, and refusing it would push the raiser into raising a requisition
   * they do not want just to get past a validator.
   */
  const countNotice =
    requirementType === 'existing' &&
    namedReplacements.length > 0 &&
    requiredPosts > 0 &&
    namedReplacements.length !== requiredPosts
      ? `Replacing ${namedReplacements.length} ${namedReplacements.length === 1 ? 'person' : 'people'} but requesting ${requiredPosts} ${requiredPosts === 1 ? 'post' : 'posts'} — headcount goes ${
          namedReplacements.length > requiredPosts ? 'down' : 'up'
        } by ${Math.abs(namedReplacements.length - requiredPosts)}.`
      : null;

  const { data: orgUnits } = useOrganogramUnits();
  const { data: perms } = useMyPermissions();

  // Where and what this person may raise for, straight from Approval Paths —
  // the same table `buildStepsForRaiser` resolves the chain from, so the form
  // offers exactly what will succeed.
  const { data: raiserScope, isSuccess: scopeLoaded } = useMyRaiserScope();

  // Only units the requester may actually raise for. The `requisition_raiser`
  // role is NOT the gate: it is granted on nomination and deliberately never
  // revoked (CLAUDE.md §5), so it lingers on units whose path has since been
  // removed. The nomination itself is the gate. Super users raise anywhere.
  const allowedUnitNames = useMemo(() => {
    if (perms?.isSuperUser) return (orgUnits ?? []).map((u) => u.unit);
    // Until the scope arrives, fall back to the role so the field isn't empty
    // on first paint; it narrows a moment later.
    if (!scopeLoaded) {
      return [
        ...new Set(
          (perms?.roles ?? [])
            .filter((r) => r.key === 'requisition_raiser')
            .map((r) => r.unitName)
            .filter((n): n is string => Boolean(n)),
        ),
      ];
    }
    return (raiserScope ?? []).map((sc) => sc.unitName);
  }, [perms, orgUnits, raiserScope, scopeLoaded]);

  // A raiser whose nominations were all removed can't raise anywhere. Say so
  // rather than presenting an empty dropdown with no explanation.
  const noRaiserScope =
    scopeLoaded && !perms?.isSuperUser && allowedUnitNames.length === 0;

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

  // Departments are scoped the same way units are: a raiser is nominated on
  // (unit, department) pairs in Approval Paths, and `buildStepsForRaiser`
  // refuses anything else. Offering the full vocabulary here would let someone
  // fill in the whole form only to be told on submit that no chain exists.
  // A path on the '' department is the unit-wide wildcard — everything is open.
  const unitScope = useMemo(
    () => (raiserScope ?? []).find((sc) => sameUnitName(sc.unitName, unit)),
    [raiserScope, unit],
  );
  const allDepartments = useMemo(() => master?.departments ?? [], [master]);
  const allowedDepartments = useMemo(() => {
    // Super users raise for anything, and so does a unit-wide wildcard path.
    if (perms?.isSuperUser || unitScope?.anyDepartment) return allDepartments;
    if (unitScope) return unitScope.departments;
    // No nomination for this unit. Before the scope loads that just means
    // "not known yet"; once it has, the unit genuinely isn't theirs and an
    // empty list is the honest answer — the unit shouldn't be selectable
    // either, so this is only reachable mid-load or for a stale selection.
    return scopeLoaded && unit ? [] : allDepartments;
  }, [perms, unit, unitScope, allDepartments, scopeLoaded]);

  const departmentOptions: SelectOption[] = allowedDepartments.map((d) => ({
    value: d,
    label: d,
  }));
  const lockedDepartment = allowedDepartments.length === 1;

  // Fill in the only option they have, and drop a selection the chosen unit
  // doesn't allow (switching units can strand one).
  const allowedDeptKey = allowedDepartments.join('|');
  useEffect(() => {
    if (lockedDepartment) {
      if (department !== allowedDepartments[0]) {
        setValue('department', allowedDepartments[0], { shouldValidate: true });
        setValue('section', '');
        setValue('subSection', '');
      }
      return;
    }
    if (department && !allowedDepartments.includes(department)) {
      setValue('department', '');
      setValue('section', '');
      setValue('subSection', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedDeptKey]);
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
  /**
   * Where the hire actually sits, from the same job-location list the offer
   * and appointment letters print (master_options kind='job_location').
   *
   * Previously the zone list, which named a district rather than a site — and
   * the letter and the requisition then disagreed about the same post.
   */
  const jobLocationOptions: SelectOption[] = (master?.jobLocations ?? []).map(
    (l) => ({ value: l, label: l }),
  );
  const lineOfBusinessOptions: SelectOption[] = (
    master?.linesOfBusiness ?? []
  ).map((l) => ({ value: l, label: l }));
  const separationReasonOptions: SelectOption[] = (
    master?.separationReasons ?? []
  ).map((r) => ({ value: r, label: r }));
  // Grades valid for the chosen designation — shown as a read-only suggestion,
  // never captured here: the approver still confirms grade at sign-off.
  const suggestedGrades = designation
    ? (master?.designationGrades[designation] ?? [])
    : [];

  const unitReg = register('unitFactory');

  // Live organogram check. Advisory only since the requisitioner now declares
  // New vs Replace themselves; it still fills totalVacantPosts.
  const lookup = useSeatLookup(unit, department, designation);
  const vacant = lookup.data?.vacant ?? 0;
  // New when the request exceeds the available vacant sanctioned seats.
  const requirement: 'existing' | 'new' | undefined = lookup.data
    ? requiredPosts > vacant
      ? 'new'
      : 'existing'
    : undefined;

  useEffect(() => {
    // Deliberately NOT written to requirementType any more — the requisitioner
    // chooses that. `requirement` is only shown in the organogram banner.
  }, [requirement, setValue]);

  // Total vacant posts is read-only — taken from the organogram (sanctioned − filled).
  useEffect(() => {
    if (lookup.data) setValue('totalVacantPosts', lookup.data.vacant);
  }, [lookup.data, setValue]);


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
    onSubmit(toPayload(values as RequisitionFormOutput, requestedBy));
  }, onInvalid);

  const current = STEPS[step];
  const CurrentIcon = current.icon;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
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
                    'hidden whitespace-nowrap text-[0.6875rem] font-medium sm:block',
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
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-brand-600">
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
              <div className="space-y-7">
                {/* 1 · Where the role sits */}
                <FormGroup title="Placement" hint="Where in the organisation this post belongs">
                  {noRaiserScope && (
                    <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800">
                      You are not currently nominated to raise requisitions for
                      any unit. Ask Head of Talent Acquisition to add you under{' '}
                      <span className="font-semibold">
                        Configuration → Approval Paths
                      </span>
                      , choosing the department you should raise for.
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
                      label="Line of Business"
                      placeholder="Select line of business"
                      options={lineOfBusinessOptions}
                      value={lineOfBusiness}
                      error={errors.lineOfBusiness?.message}
                      onChange={(v) =>
                        setValue('lineOfBusiness', v, { shouldValidate: true })
                      }
                    />
                  </div>
                  {/* Department → Section → Sub-section is a cascade, so the
                      three sit on one row rather than orphaning a cell. */}
                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <Combobox
                      label="Department"
                      placeholder={
                        unit ? 'Select department' : 'Pick a unit first'
                      }
                      options={departmentOptions}
                      value={department}
                      disabled={lockedDepartment}
                      hint={
                        lockedDepartment
                          ? 'The department you are approved to raise for'
                          : undefined
                      }
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
                  </div>
                </FormGroup>

                {/* 2 · What the post is, and whether it's new headcount */}
                <FormGroup title="The position" hint="What you're hiring for and why">
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

                  {/* Other levels this post may be filled at. The one a
                      candidate is actually hired at is fixed at onboarding. */}
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700">
                        Also open at another level?
                      </p>
                      <span className="text-[0.6875rem] text-slate-500">
                        Optional · the final level is fixed at onboarding
                      </span>
                    </div>

                    {alternateDesignations.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {alternateDesignations.map((d, i) => (
                          <span
                            key={`${d}-${i}`}
                            className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-2.5 pr-1 text-xs font-medium text-brand-700"
                          >
                            {d}
                            <button
                              type="button"
                              aria-label={`Remove ${d}`}
                              onClick={() =>
                                setValue(
                                  'alternateDesignations',
                                  alternateDesignations.filter(
                                    (_, j) => j !== i,
                                  ),
                                  { shouldValidate: true },
                                )
                              }
                              className="rounded-full p-0.5 text-brand-500 hover:bg-brand-100 hover:text-brand-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2.5">
                      <Combobox
                        label=""
                        placeholder="Add another designation"
                        options={designationOptions.filter(
                          (o) =>
                            o.value !== designation &&
                            !alternateDesignations.includes(o.value),
                        )}
                        value=""
                        onChange={(v) => {
                          // Guarded here as well as on the server: the same
                          // level twice reads as a mistake on a signed sheet.
                          if (!v || v === designation) return;
                          if (alternateDesignations.includes(v)) return;
                          setValue(
                            'alternateDesignations',
                            [...alternateDesignations, v],
                            { shouldValidate: true },
                          );
                        }}
                      />
                    </div>

                    {alternateDesignations.length > 0 && (
                      <p className="mt-2 text-[0.6875rem] text-slate-500">
                        This post will read as{' '}
                        <span className="font-medium text-slate-700">
                          {[designation, ...alternateDesignations].join(' / ')}
                        </span>
                      </p>
                    )}
                  </div>
                  {suggestedGrades.length > 0 && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1 text-xs text-slate-500">
                      Suggested grade
                      {suggestedGrades.length > 1 ? 's' : ''}:
                      {suggestedGrades.map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.6875rem] font-medium text-brand-700"
                        >
                          {g}
                        </span>
                      ))}
                      <span className="text-slate-400">
                        · confirmed by the approver at sign-off
                      </span>
                    </p>
                  )}

                  {/* Requisition type sits with the position it describes — a
                      replacement has to name who left and why, so the record
                      says more than "Replacement". */}
                  <div className="mt-5">
                    <p className="mb-2.5 text-sm font-medium text-slate-700">
                      Requisition type
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {([
                        { value: 'new', label: 'New', hint: 'Additional headcount' },
                        { value: 'existing', label: 'Replace', hint: 'Someone left this post' },
                      ] as const).map((opt) => {
                        const active = requirementType === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              {
                                setValue('requirementType', opt.value, {
                                  shouldValidate: true,
                                });
                                // Choosing Replacement with no rows leaves an
                                // empty panel and no way to start; give them
                                // the first one.
                                if (
                                  opt.value === 'existing' &&
                                  replacementRows.fields.length === 0
                                ) {
                                  replacementRows.append({
                                    employeeName: '',
                                    employeeCode: '',
                                    separationReason: '',
                                    vacantDate: '',
                                    remarks: '',
                                  });
                                }
                              }
                            }
                            className={cn(
                              'rounded-xl border px-4 py-3 text-left transition-colors duration-200',
                              active
                                ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-200'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                            )}
                          >
                            <span
                              className={cn(
                                'block text-sm font-semibold',
                                active ? 'text-brand-700' : 'text-slate-700',
                              )}
                            >
                              {opt.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {opt.hint}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {requirementType === 'existing' && (
                      <div className="mt-4 animate-branch-open space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-700">
                            Replacing whom
                          </p>
                          <span className="text-[0.6875rem] text-slate-500">
                            Add everyone this requisition replaces
                          </span>
                        </div>

                        {/* One block per leaver. They rarely leave on the same
                            day for the same reason, so each carries its own. */}
                        {replacementRows.fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="space-y-3 rounded-lg border border-slate-200 bg-white p-3.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                                Person {index + 1}
                              </span>
                              {replacementRows.fields.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => replacementRows.remove(index)}
                                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Remove
                                </button>
                              )}
                            </div>

                            <EmployeePicker
                              label="Employee"
                              value={
                                replacements[index]?.employeeName ?? ''
                              }
                              onPick={(emp) => {
                                setValue(
                                  `replacements.${index}.employeeName`,
                                  emp?.name ?? '',
                                  { shouldValidate: true },
                                );
                                setValue(
                                  `replacements.${index}.employeeCode`,
                                  emp?.employeeCode ?? '',
                                );
                                // The first entry also fills the single
                                // columns the approval sheet and the board
                                // export still read.
                                if (index === 0) {
                                  setValue('replaceOfName', emp?.name ?? '');
                                  setValue(
                                    'replaceOfEmployeeCode',
                                    emp?.employeeCode ?? '',
                                  );
                                }
                              }}
                            />

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <Combobox
                                label="Reason for leaving"
                                placeholder="Select a reason"
                                options={separationReasonOptions}
                                value={
                                  replacements[index]?.separationReason ?? ''
                                }
                                onChange={(v) => {
                                  setValue(
                                    `replacements.${index}.separationReason`,
                                    v,
                                    { shouldValidate: true },
                                  );
                                  if (index === 0) setValue('separationReason', v);
                                }}
                              />
                              <Input
                                label="Vacant from (optional)"
                                type="date"
                                {...register(
                                  `replacements.${index}.vacantDate`,
                                )}
                              />
                            </div>

                            <Textarea
                              label="Remarks (optional)"
                              rows={2}
                              placeholder="Anything else the approvers should know"
                              {...register(`replacements.${index}.remarks`)}
                            />
                          </div>
                        ))}

                        {errors.replacements?.message && (
                          <p className="text-xs font-medium text-rose-600">
                            {errors.replacements.message}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            replacementRows.append({
                              employeeName: '',
                              employeeCode: '',
                              separationReason: '',
                              vacantDate: '',
                              remarks: '',
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add another employee
                        </button>

                        {countNotice && (
                          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                            {countNotice}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input
                      label="Nos. of required post"
                      {...wholeNumberInput}
                      min={1}
                      error={errors.requiredPosts?.message}
                      {...register('requiredPosts')}
                    />
                    <Input
                      label="Total no. of vacant post"
                      {...wholeNumberInput}
                      readOnly
                      hint="Auto-filled from the organogram (sanctioned − filled)"
                      className="bg-slate-50 text-slate-600"
                      error={errors.totalVacantPosts?.message}
                      {...register('totalVacantPosts')}
                    />
                  </div>

                  {/* Advisory: what the organogram says about these counts. */}
                  <OrganogramBanner
                    loading={lookup.isFetching}
                    show={Boolean(unit && department && designation.trim().length > 2)}
                    result={lookup.data}
                    requirement={requirement}
                    requiredPosts={requiredPosts}
                  />
                </FormGroup>

                {/* 3 · Where it's posted and by when */}
                <FormGroup title="Posting & timing" hint="Location, dates and terms of engagement">
                  <Combobox
                    label="Place of posting"
                    placeholder="Select the job location"
                    options={jobLocationOptions}
                    value={placeOfPosting}
                    error={errors.placeOfPosting?.message}
                    onChange={(v) =>
                      setValue('placeOfPosting', v, { shouldValidate: true })
                    }
                  />
                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                </FormGroup>
              </div>
            </>
          )}

          {/* B · Facility Requirements */}
          {step === 1 && (
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
                notePlaceholder="e.g. shift timing, or anything unusual about the run"
                caveat={FACILITY_CAVEAT.transport}
                optionField={
                  <div className="space-y-3">
                    <Select
                      label="How it is provided"
                      options={TRANSPORT_OPTIONS.map((o) => ({ ...o }))}
                      {...register('facilities.transport.option')}
                    />
                    {/* A shared run is whatever vehicle is on it; only a
                        dedicated car is a choice between models. */}
                    {transportOption === 'full_time' && (
                      <Select
                        label="Vehicle"
                        placeholder="Sedan or SUV"
                        options={VEHICLE_TYPES.map((o) => ({ ...o }))}
                        {...register('facilities.transport.vehicleType')}
                      />
                    )}
                  </div>
                }
              />
              <FacilityField
                icon={Warehouse}
                title="Dormitory Facility"
                requested={Boolean(dormitoryRequested)}
                toggleReg={register('facilities.dormitory.requested')}
                noteReg={register('facilities.dormitory.note')}
                notePlaceholder="e.g. single room, near the factory"
                caveat={FACILITY_CAVEAT.dormitory}
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
              Send for job analysis
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

/**
 * A labelled block of related fields.
 *
 * Section A carries fourteen fields; as one flat grid it read as a wall of
 * dropdowns with no sense of what belonged to what. Grouping them under quiet
 * headings gives the eye somewhere to rest without adding chrome.
 */
function FormGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b border-slate-100 pb-2">
        <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      {children}
    </section>
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
  caveat,
}: {
  icon: LucideIcon;
  title: string;
  requested: boolean;
  toggleReg: UseFormRegisterReturn;
  noteReg: UseFormRegisterReturn;
  notePlaceholder: string;
  optionField?: ReactNode;
  /** What requesting this actually promises — see FACILITY_CAVEAT. */
  caveat?: string;
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
      {/* Before the box is ticked, not after: this is what "needed" is worth,
          and a requisitioner who reads it only once they have committed has
          been told too late. */}
      {caveat && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50/70 px-2.5 py-2 text-[0.6875rem] leading-relaxed text-amber-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          {caveat}
        </p>
      )}
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
    // Other levels this post may be filled at; empty on an ordinary one.
    alternateDesignations: values.alternateDesignations?.length
      ? values.alternateDesignations
      : undefined,
    requirementType: values.requirementType,
    lineOfBusiness: values.lineOfBusiness,
    // Only sent on a replacement — the API clears them on a NEW headcount anyway.
    ...(values.requirementType === 'existing'
      ? (() => {
          // Rows the raiser added but never filled are dropped here rather
          // than sent as blanks for the server to reject.
          const rows = (values.replacements ?? [])
            .filter((r) => (r.employeeName ?? '').trim().length > 1)
            .map((r) => ({
              employeeName: r.employeeName.trim(),
              employeeCode: r.employeeCode?.trim() || undefined,
              separationReason: r.separationReason?.trim() || undefined,
              vacantDate: r.vacantDate?.trim() || undefined,
              remarks: r.remarks?.trim() || undefined,
            }));
          const first = rows[0];
          return {
            replacements: rows,
            // The first entry also fills the single columns the approval
            // sheet and the board export still read.
            replaceOfName: first?.employeeName,
            replaceOfEmployeeCode: first?.employeeCode,
            separationReason: first?.separationReason,
            replacementRemarks: first?.remarks,
          };
        })()
      : {}),
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
    facilities: {
      ...values.facilities,
      // The backend validates vehicleType against ['sedan','suv'], so an
      // untouched select must be left out rather than sent as "". A shared
      // car has no vehicle choice at all.
      transport: {
        ...values.facilities.transport,
        vehicleType:
          values.facilities.transport.option === 'full_time'
            ? values.facilities.transport.vehicleType || undefined
            : undefined,
      },
    },
    // The requester is the raiser; Factory HR and the approvers come from
    // role assignments and the configured approval path on the backend.
    signatories: {
      departmentHeadName: requestedBy,
      departmentHeadDesignation: '',
      factoryHRName: '',
    },
  };
}
