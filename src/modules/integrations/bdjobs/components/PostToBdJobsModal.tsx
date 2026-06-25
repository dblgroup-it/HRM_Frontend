import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Bookmark,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  MapPin,
  Search,
  Shield,
  Tag,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge, Button } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useDebounce } from '@shared/hooks';
import type { Requisition } from '@modules/requisition/types/requisition.types';

import {
  useBdJobsCategories,
  useBdJobsDegrees,
  useBdJobsEduLevels,
  useBdJobsPost,
  useBdJobsStatus,
  usePostToBdJobs,
  useSearchBdJobsIndustry,
  useSearchBdJobsLocations,
  useSearchBdJobsSkills,
} from '../hooks/useBdJobs';
import type {
  BdJobsEmploymentStatus,
  BdJobsFormData,
  BdJobsGender,
  BdJobsIndustry,
  BdJobsLocation,
  BdJobsSkill,
  BdJobsWorkplace,
} from '../types/bdjobs.types';

/* ── Employment status options ─────────────────────────────── */
const EMP_STATUS: { key: BdJobsEmploymentStatus; label: string }[] = [
  { key: 'full_time', label: 'Full Time' },
  { key: 'part_time', label: 'Part Time' },
  { key: 'contractual', label: 'Contractual' },
  { key: 'internship', label: 'Internship' },
  { key: 'freelance', label: 'Freelance' },
];

const WORKPLACE: { key: BdJobsWorkplace; label: string }[] = [
  { key: 'wfo', label: 'Work From Office' },
  { key: 'wfh', label: 'Work From Home' },
];

const GENDER: { key: BdJobsGender; label: string }[] = [
  { key: 'all', label: 'Both' },
  { key: 'male', label: 'Only Male' },
  { key: 'female', label: 'Only Female' },
  { key: 'others', label: 'Others' },
];

const STEPS = [
  { label: 'Job Details', icon: Briefcase },
  { label: 'Requirements', icon: Shield },
  { label: 'Publish', icon: Bookmark },
];

function buildDefault(req: Requisition): BdJobsFormData {
  const rp = req.roleProfile as
    | { responsibilities?: string[]; requirements?: string[] }
    | null;
  const responsibilities = rp?.responsibilities?.join('\n') ?? req.jobDescription ?? '';
  const requirements = rp?.requirements?.join('\n') ?? '';

  return {
    jobTitle: req.designation ?? '',
    vacancyNo: req.requiredPosts ?? 1,
    locationIds: [-1],
    locationNames: ['Anywhere in Bangladesh'],
    categoryId: null,
    categoryName: '',
    employmentStatus: ['full_time'],
    workplace: ['wfo'],
    salaryMin: null,
    salaryMax: null,
    showSalary: false,
    jobDescription: responsibilities,
    preferredGender: 'all',
    ageMin: null,
    ageMax: null,
    experienceYears: null,
    educationLevelId: null,
    educationLevelName: '',
    educationDegreeId: null,
    educationDegreeName: '',
    educationConcentration: '',
    industryExperience: [],
    skills: [],
    additionalRequirements: requirements,
    restrictAge: false,
    restrictGender: false,
    restrictExperience: false,
    applyOnline: true,
    publishLinkedIn: false,
  };
}

/* ── Step progress bar ─────────────────────────────────────── */
function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={s.label} className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all',
                done && 'bg-emerald-500 text-white',
                active && 'bg-brand-600 text-white ring-4 ring-brand-100',
                !done && !active && 'bg-slate-100 text-slate-400',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn(
              'text-xs font-medium truncate',
              active ? 'text-brand-700' : done ? 'text-emerald-600' : 'text-slate-400',
            )}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px flex-1', done ? 'bg-emerald-300' : 'bg-slate-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Tag input ─────────────────────────────────────────────── */


/* ── Location picker ───────────────────────────────────────── */
function LocationPicker({
  selected,
  onAdd,
  onRemove,
}: {
  selected: { id: number; name: string }[];
  onAdd: (loc: BdJobsLocation) => void;
  onRemove: (id: number) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const dq = useDebounce(q, 300);
  const { data: results = [], isFetching } = useSearchBdJobsLocations(dq);
  const filtered = results.filter((r) => !selected.find((s) => s.id === r.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : <Search className="h-3.5 w-3.5 text-slate-400" />}
        </div>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search locations…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 placeholder:text-slate-400"
        />
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {filtered.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-slate-400">
                  {dq ? 'No results' : 'Start typing to search…'}
                </p>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { onAdd(r); setQ(''); setOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {r.name}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((s) => (
          <span key={s.id} className="flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 border border-sky-200">
            <MapPin className="h-3 w-3" />
            {s.name}
            <button type="button" onClick={() => onRemove(s.id)}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Category picker ───────────────────────────────────────── */
function CategoryPicker({
  value,
  onChange,
}: {
  value: { id: number | null; name: string };
  onChange: (v: { id: number | null; name: string }) => void;
}) {
  const [q, setQ] = useState(value.name);
  const [open, setOpen] = useState(false);
  const { data: allCategories = [], isLoading } = useBdJobsCategories();

  const filtered = q.trim()
    ? allCategories.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    : allCategories;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : <Tag className="h-3.5 w-3.5 text-slate-400" />}
      </div>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); onChange({ id: null, name: e.target.value }); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search job category…"
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 placeholder:text-slate-400"
      />
      {value.id && (
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        </div>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-slate-400">No matching category</p>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { onChange({ id: r.id, name: r.name }); setQ(r.name); setOpen(false); }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50',
                    value.id === r.id && 'bg-brand-50 font-medium text-brand-700',
                  )}
                >
                  <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {r.name}
                  {value.id === r.id && <Check className="ml-auto h-3.5 w-3.5 text-brand-500" />}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Education picker ──────────────────────────────────────── */
function EducationPicker({
  levelId, levelName, degreeId, degreeName, concentration, onChange,
}: {
  levelId: number | null; levelName: string;
  degreeId: number | null; degreeName: string;
  concentration: string;
  onChange: (v: { levelId: number | null; levelName: string; degreeId: number | null; degreeName: string; concentration: string }) => void;
}) {
  const { data: levels = [] } = useBdJobsEduLevels();
  const { data: degrees = [], isFetching } = useBdJobsDegrees(levelId);

  return (
    <div className="space-y-2">
      {/* Level select */}
      <select
        value={levelId ?? ''}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : null;
          const name = levels.find((l) => l.id === id)?.name ?? '';
          onChange({ levelId: id, levelName: name, degreeId: null, degreeName: '', concentration });
        }}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
      >
        <option value="">Select education level…</option>
        {levels.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
      {/* Degree select */}
      {levelId != null && (
        <div className="relative">
          <select
            value={degreeId ?? ''}
            disabled={isFetching}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              const name = degrees.find((d) => d.id === id)?.name ?? '';
              onChange({ levelId, levelName, degreeId: id, degreeName: name, concentration });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 disabled:opacity-50"
          >
            <option value="">Select degree…</option>
            {degrees.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {isFetching && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            </div>
          )}
        </div>
      )}
      {/* Concentration */}
      {degreeId != null && (
        <input
          value={concentration}
          onChange={(e) => onChange({ levelId, levelName, degreeId, degreeName, concentration: e.target.value })}
          placeholder="Concentration / Major (optional)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
        />
      )}
    </div>
  );
}

/* ── Industry picker ───────────────────────────────────────── */
function IndustryPicker({
  value,
  onChange,
}: {
  value: BdJobsIndustry[];
  onChange: (v: BdJobsIndustry[]) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data: suggestions = [], isFetching } = useSearchBdJobsIndustry(q);
  const filtered = suggestions.filter((s) => !value.find((v) => v.id === s.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          {isFetching
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            : <Search className="h-3.5 w-3.5 text-slate-400" />}
        </div>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search industry (type at least 2 chars)…"
          disabled={value.length >= 10}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 placeholder:text-slate-400 disabled:opacity-50"
        />
        {open && filtered.length > 0 && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onChange([...value, s]); setQ(''); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {s.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <span key={s.id} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
              {s.name}
              <button type="button" onClick={() => onChange(value.filter((v) => v.id !== s.id))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Skills picker ─────────────────────────────────────────── */
function SkillsPicker({
  value,
  catId,
  onChange,
}: {
  value: BdJobsSkill[];
  catId: number | null;
  onChange: (v: BdJobsSkill[]) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data: suggestions = [], isFetching } = useSearchBdJobsSkills(q, catId);
  const filtered = suggestions.filter((s) => !value.find((v) => v.id === s.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          {isFetching
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            : <Search className="h-3.5 w-3.5 text-slate-400" />}
        </div>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search skills (type at least 2 chars)…"
          disabled={value.length >= 10}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 placeholder:text-slate-400 disabled:opacity-50"
        />
        {open && filtered.length > 0 && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onChange([...value, s]); setQ(''); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {s.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <span key={s.id} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
              {s.name}
              <button type="button" onClick={() => onChange(value.filter((v) => v.id !== s.id))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Toggle ────────────────────────────────────────────────── */
function Toggle({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {desc && <p className="text-xs text-slate-400">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
          value ? 'bg-brand-600' : 'bg-slate-200',
        )}
      >
        <span className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
          value ? 'translate-x-5' : 'translate-x-0',
        )} />
      </button>
    </div>
  );
}

/* ── Field label ───────────────────────────────────────────── */
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
      {children}{required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  );
}

/* ── Main modal ────────────────────────────────────────────── */
export function PostToBdJobsModal({
  open,
  onClose,
  requisition,
}: {
  open: boolean;
  onClose: () => void;
  requisition: Requisition;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BdJobsFormData>(() => buildDefault(requisition));

  const { data: status } = useBdJobsStatus();
  const { data: existing } = useBdJobsPost(requisition.id);
  const postMutation = usePostToBdJobs(requisition.id);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load saved draft if exists
  useEffect(() => {
    if (existing?.formData) {
      setForm(existing.formData as BdJobsFormData);
    }
  }, [existing]);

  useEffect(() => {
    if (!open) { setStep(0); }
  }, [open]);

  const set = <K extends keyof BdJobsFormData>(key: K, val: BdJobsFormData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toggleArr = <T,>(key: keyof BdJobsFormData, val: T) => {
    const arr = (form[key] as T[]);
    set(key, (arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]) as BdJobsFormData[typeof key]);
  };

  // Validation per step
  const canNext = () => {
    if (step === 0) {
      return (
        form.jobTitle.trim() &&
        form.locationIds.length > 0 &&
        form.employmentStatus.length > 0 &&
        form.workplace.length > 0 &&
        (form.salaryMin ?? 0) > 0 &&
        (form.salaryMax ?? 0) >= (form.salaryMin ?? 0) &&
        form.jobDescription.trim()
      );
    }
    if (step === 1) return true;
    return true;
  };

  const handleSubmit = () => {
    if (!form.salaryMin || !form.salaryMax || form.salaryMax < form.salaryMin) {
      toast.error('Salary range is required and max must be ≥ min');
      return;
    }

    const data: BdJobsFormData = {
      ...form,
      experienceYears: form.experienceYears ?? 0,
    };

    postMutation.mutate(data, { onSuccess: () => onClose() });
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      />
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ animation: 'slideUp .2s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f4fd]">
              <img
                src="https://www.bdjobs.com/favicon.ico"
                alt="BDJobs"
                className="h-5 w-5 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Post to BDJobs</h2>
              <p className="text-xs text-slate-400">{requisition.code} · {requisition.designation}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {existing?.status === 'draft' && (
              <Badge tone="warning">Draft saved</Badge>
            )}
            {existing?.status === 'posted' && (
              <Badge tone="success">Live on BDJobs</Badge>
            )}
            {status && !status.configured && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 border border-amber-200">
                <AlertCircle className="h-3 w-3" />
                No API credentials
              </span>
            )}
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Step bar */}
        <StepBar step={step} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── Step 0: Job Details ───────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label required>Job Title</Label>
                  <input
                    value={form.jobTitle}
                    onChange={(e) => set('jobTitle', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                    placeholder="e.g. Deputy Manager"
                  />
                </div>
                <div>
                  <Label required>Vacancy</Label>
                  <input
                    type="number"
                    min={1}
                    value={form.vacancyNo}
                    onChange={(e) => set('vacancyNo', Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                  />
                </div>
              </div>

              <div>
                <Label required>Job Location(s) <span className="normal-case font-normal text-slate-400">(max 15)</span></Label>
                <LocationPicker
                  selected={form.locationIds.map((id, i) => ({ id, name: form.locationNames[i] ?? '' }))}
                  onAdd={(loc) => {
                    set('locationIds', [...form.locationIds, loc.id]);
                    set('locationNames', [...form.locationNames, loc.name]);
                  }}
                  onRemove={(id) => {
                    const idx = form.locationIds.indexOf(id);
                    set('locationIds', form.locationIds.filter((_, i) => i !== idx));
                    set('locationNames', form.locationNames.filter((_, i) => i !== idx));
                  }}
                />
              </div>

              <div>
                <Label>Job Category</Label>
                <CategoryPicker
                  value={{ id: form.categoryId, name: form.categoryName }}
                  onChange={(v) => { set('categoryId', v.id); set('categoryName', v.name); }}
                />
              </div>

              <div>
                <Label required>Employment Status</Label>
                <div className="flex flex-wrap gap-2">
                  {EMP_STATUS.map((s) => {
                    const on = form.employmentStatus.includes(s.key);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleArr('employmentStatus', s.key)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                          on
                            ? 'border-brand-300 bg-brand-50 text-brand-700'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                        )}
                      >
                        {on && <Check className="mr-1 inline h-3 w-3" />}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label required>Workplace</Label>
                <div className="flex gap-2">
                  {WORKPLACE.map((w) => {
                    const on = form.workplace.includes(w.key);
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => toggleArr('workplace', w.key)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                          on
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                        )}
                      >
                        {on && <Check className="mr-1 inline h-3 w-3" />}
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label required>Monthly Salary (BDT)</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      min={0}
                      value={form.salaryMin ?? ''}
                      onChange={(e) => set('salaryMin', e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="Minimum"
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1',
                        !form.salaryMin
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-400 focus:ring-brand-100',
                      )}
                    />
                  </div>
                  <span className="text-slate-400 text-sm">–</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      min={0}
                      value={form.salaryMax ?? ''}
                      onChange={(e) => set('salaryMax', e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="Maximum"
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1',
                        !form.salaryMax
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-400 focus:ring-brand-100',
                      )}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">BDT</span>
                </div>
                <div className="mt-2">
                  <Toggle
                    value={form.showSalary}
                    onChange={(v) => set('showSalary', v)}
                    label="Show salary on listing"
                    desc="Candidates can see the range"
                  />
                </div>
              </div>

              <div>
                <Label required>Job Responsibilities &amp; Context</Label>
                <textarea
                  rows={6}
                  value={form.jobDescription}
                  onChange={(e) => set('jobDescription', e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                  placeholder="Describe the role responsibilities…"
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">{form.jobDescription.length}/12000</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Candidate Requirements ───── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label>Preferred Gender</Label>
                <div className="flex flex-wrap gap-2">
                  {GENDER.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => set('preferredGender', g.key)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                        form.preferredGender === g.key
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Age Min</Label>
                  <input
                    type="number"
                    min={16}
                    max={99}
                    value={form.ageMin ?? ''}
                    onChange={(e) => set('ageMin', e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="e.g. 25"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <Label>Age Max</Label>
                  <input
                    type="number"
                    min={16}
                    max={99}
                    value={form.ageMax ?? ''}
                    onChange={(e) => set('ageMax', e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="e.g. 55"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <Label>Experience (years)</Label>
                  <input
                    type="number"
                    min={0}
                    value={form.experienceYears ?? ''}
                    onChange={(e) => set('experienceYears', e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="e.g. 5"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                  />
                </div>
              </div>

              <div>
                <Label>Education</Label>
                <EducationPicker
                  levelId={form.educationLevelId}
                  levelName={form.educationLevelName}
                  degreeId={form.educationDegreeId}
                  degreeName={form.educationDegreeName}
                  concentration={form.educationConcentration}
                  onChange={(v) => {
                    set('educationLevelId', v.levelId);
                    set('educationLevelName', v.levelName);
                    set('educationDegreeId', v.degreeId);
                    set('educationDegreeName', v.degreeName);
                    set('educationConcentration', v.concentration);
                  }}
                />
              </div>

              <div>
                <Label>Industry Experience <span className="normal-case font-normal text-slate-400">(max 10)</span></Label>
                <IndustryPicker
                  value={form.industryExperience}
                  onChange={(v) => set('industryExperience', v)}
                />
              </div>

              <div>
                <Label>Skills &amp; Expertise <span className="normal-case font-normal text-slate-400">(max 10)</span></Label>
                <SkillsPicker
                  value={form.skills}
                  catId={form.categoryId}
                  onChange={(v) => set('skills', v)}
                />
              </div>

              <div>
                <Label>Additional Requirements</Label>
                <textarea
                  rows={4}
                  value={form.additionalRequirements}
                  onChange={(e) => set('additionalRequirements', e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                  placeholder="Any other requirements for the applicant…"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Restrictions & Publish ───── */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Restrictions */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Applicant Restrictions</h3>
                <p className="mb-4 text-xs text-slate-400">
                  When "Restrict" is on, BDJobs will filter out applicants who don't meet the criteria.
                </p>
                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <Toggle
                    value={form.restrictAge}
                    onChange={(v) => set('restrictAge', v)}
                    label="Restrict by age"
                    desc={form.ageMin || form.ageMax ? `${form.ageMin || '—'} – ${form.ageMax || '—'} years` : 'Set age range in requirements'}
                  />
                  <div className="h-px bg-slate-100" />
                  <Toggle
                    value={form.restrictGender}
                    onChange={(v) => set('restrictGender', v)}
                    label="Restrict by gender"
                    desc={form.preferredGender === 'all' ? 'All genders' : form.preferredGender}
                  />
                  <div className="h-px bg-slate-100" />
                  <Toggle
                    value={form.restrictExperience}
                    onChange={(v) => set('restrictExperience', v)}
                    label="Restrict by experience"
                    desc={form.experienceYears != null ? `Minimum ${form.experienceYears} years` : 'Set experience in requirements'}
                  />
                </div>
              </div>

              {/* Application process */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Application Process</h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => set('applyOnline', true)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
                      form.applyOnline ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    <span className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      form.applyOnline ? 'border-brand-500 bg-brand-500' : 'border-slate-300',
                    )}>
                      {form.applyOnline && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-slate-800">Apply Online (Recommended)</span>
                      <span className="block text-xs text-slate-400">Candidates apply through our HRM recruitment page. CVs land in the Drive workspace automatically.</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => set('applyOnline', false)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
                      !form.applyOnline ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    <span className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      !form.applyOnline ? 'border-slate-600 bg-slate-600' : 'border-slate-300',
                    )}>
                      {!form.applyOnline && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-slate-800">Other Way</span>
                      <span className="block text-xs text-slate-400">Candidates will be instructed in the job post.</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Publishing */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Publishing Platform</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                    <Check className="h-4 w-4 text-brand-600 shrink-0" />
                    <span className="text-sm font-medium text-brand-700">Bdjobs.com</span>
                    <Badge tone="brand" className="ml-auto text-[10px]">Always</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('publishLinkedIn', !form.publishLinkedIn)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3 transition',
                      form.publishLinkedIn ? 'border-sky-300 bg-sky-50' : 'border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    <span className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                      form.publishLinkedIn ? 'border-sky-500 bg-sky-500' : 'border-slate-300',
                    )}>
                      {form.publishLinkedIn && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className="text-sm font-medium text-slate-700">LinkedIn</span>
                    <Badge tone="neutral" className="ml-auto text-[10px]">Optional</Badge>
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="space-y-1 text-xs text-slate-600">
                    <p><span className="font-semibold">Title:</span> {form.jobTitle}</p>
                    <p><span className="font-semibold">Location(s):</span> {form.locationNames.join(', ') || '—'}</p>
                    <p><span className="font-semibold">Salary:</span> {form.salaryMin && form.salaryMax ? `BDT ${form.salaryMin.toLocaleString()} – ${form.salaryMax.toLocaleString()}` : 'Not set'}</p>
                    <p><span className="font-semibold">Vacancy:</span> {form.vacancyNo}</p>
                  </div>
                </div>
              </div>

              {status && !status.configured && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold">BDJobs API credentials not configured</p>
                    <p className="mt-0.5">The job will be saved as a draft. When credentials are added by the admin, you can re-submit to go live.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {step < STEPS.length - 1 ? (
              <Button
                disabled={!canNext()}
                onClick={() => setStep((s) => s + 1)}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            ) : (
              <Button
                isLoading={postMutation.isPending}
                onClick={handleSubmit}
                leftIcon={<Bookmark className="h-4 w-4" />}
              >
                {status?.configured ? 'Post to BDJobs' : 'Save Draft'}
              </Button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>,
    document.body,
  );
}
