import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Loader2,
  MapPin,
  Search,
  Send,
  Share2,
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
  BdJobsPost,
  BdJobsSkill,
  BdJobsWorkplace,
} from '../types/bdjobs.types';

/* ── Option sets ───────────────────────────────────────────── */
const EMP_STATUS: { key: BdJobsEmploymentStatus; label: string }[] = [
  { key: 'full_time', label: 'Full Time' },
  { key: 'part_time', label: 'Part Time' },
  { key: 'contractual', label: 'Contractual' },
  { key: 'internship', label: 'Internship' },
  { key: 'freelance', label: 'Freelance' },
];

const WORKPLACE: { key: BdJobsWorkplace; label: string }[] = [
  { key: 'wfo', label: 'Office' },
  { key: 'wfh', label: 'Home' },
];

const GENDER: { key: BdJobsGender; label: string }[] = [
  { key: 'all', label: 'Both' },
  { key: 'male', label: 'Male only' },
  { key: 'female', label: 'Female only' },
  { key: 'others', label: 'Others' },
];

const STEPS = ['Details', 'Profile', 'Publish'];
const DESCRIPTION_LIMIT = 12000;

function labelFor<T extends string>(
  options: { key: T; label: string }[],
  key: T,
): string {
  return options.find((o) => o.key === key)?.label ?? key;
}

/* ── Compact control classes ───────────────────────────────── */
const field =
  'w-full rounded-lg border bg-white px-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400';
const fieldOk = 'border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-50';
const fieldBad = 'border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-50';
/** h-9 keeps four rows on a laptop where the old h-10 fitted three. */
const input = (bad?: boolean) => cn(field, 'h-9', bad ? fieldBad : fieldOk);
const area = (bad?: boolean) => cn(field, 'py-2 leading-relaxed', bad ? fieldBad : fieldOk);

function buildDefault(req: Requisition): BdJobsFormData {
  const rp = req.roleProfile as
    | { responsibilities?: string[]; requirements?: string[] }
    | null;

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
    jobDescription: rp?.responsibilities?.join('\n') ?? req.jobDescription ?? '',
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
    additionalRequirements: rp?.requirements?.join('\n') ?? '',
    restrictAge: false,
    restrictGender: false,
    restrictExperience: false,
    applyOnline: true,
  };
}

/* ── Validation — per step, so the wizard can say what is missing ── */
type Errors = Record<string, string>;

function validateStep(step: number, f: BdJobsFormData): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!f.jobTitle.trim()) e.jobTitle = 'Required — candidates search by title.';
    if (!f.vacancyNo || f.vacancyNo < 1) e.vacancyNo = 'At least 1.';
    if (f.locationIds.length === 0) e.locationIds = 'Pick at least one location.';
    if (f.employmentStatus.length === 0) e.employmentStatus = 'Pick at least one.';
    if (f.workplace.length === 0) e.workplace = 'Pick at least one.';
    if (!f.salaryMin || f.salaryMin <= 0) e.salaryMin = 'BDJobs requires a range.';
    else if (!f.salaryMax || f.salaryMax <= 0) e.salaryMax = 'BDJobs requires a range.';
    else if (f.salaryMax < f.salaryMin) e.salaryMax = 'Must be ≥ the minimum.';
    if (!f.jobDescription.trim()) e.jobDescription = 'This is the body of the ad.';
  }
  if (step === 1) {
    if (f.ageMin != null && (f.ageMin < 16 || f.ageMin > 99)) e.ageMin = '16–99.';
    if (f.ageMax != null && (f.ageMax < 16 || f.ageMax > 99)) e.ageMax = '16–99.';
    if (f.ageMin != null && f.ageMax != null && f.ageMax < f.ageMin)
      e.ageMax = 'Must be ≥ the minimum.';
    if (f.experienceYears != null && f.experienceYears < 0)
      e.experienceYears = 'Cannot be negative.';
  }
  return e;
}

const bdt = (n: number) => `BDT ${n.toLocaleString()}`;
const shortDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The deadline the listing will actually carry.
 *
 * Mirrors the backend: the internal closing date is used when it falls inside
 * BDJobs' window (tomorrow → `deadlineDays` out), and is clamped to the end of
 * that window otherwise. Shown rather than left to guesswork, because a posting
 * whose deadline has quietly moved is the sort of thing HR finds out from a
 * candidate.
 */
function previewDeadline(req: Requisition, deadlineDays: number): Date {
  const max = new Date(Date.now() + deadlineDays * 86_400_000);
  const min = new Date(Date.now() + 86_400_000);
  const internal = req.posting?.closingDate ? new Date(req.posting.closingDate) : null;
  if (!internal || Number.isNaN(internal.getTime())) return max;
  if (internal > max || internal < min) return max;
  return internal;
}

/* ── Micro components ──────────────────────────────────────── */
function Rule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <span className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

function Field({
  label,
  htmlFor,
  name,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  name?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)} data-field={name}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="truncate text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500"
        >
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
        {(error || hint) && (
          <span
            className={cn(
              'shrink-0 text-[0.625rem]',
              error ? 'font-medium text-rose-600' : 'text-slate-400',
            )}
          >
            {error ?? hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  tone = 'brand',
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: 'brand' | 'emerald';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition',
        active
          ? tone === 'emerald'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-brand-300 bg-brand-50 text-brand-700 shadow-[inset_0_1px_0_#fff]'
          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      {active && <Check className="h-3 w-3" />}
      {children}
    </button>
  );
}

function Switch({
  value,
  onChange,
  label,
  desc,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', disabled && 'opacity-55')}>
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-medium leading-tight text-slate-700">{label}</p>
        {desc && <p className="mt-0.5 text-[0.6875rem] leading-tight text-slate-400">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
          value ? 'bg-brand-600' : 'bg-slate-200',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            value ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: 'success' | 'warning' | 'danger';
  title: string;
  children?: React.ReactNode;
}) {
  const skin = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
  }[tone];
  const Icon = { success: CheckCircle2, warning: AlertCircle, danger: AlertTriangle }[tone];
  const iconSkin = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-rose-500',
  }[tone];
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5', skin)}>
      <Icon className={cn('mt-px h-3.5 w-3.5 shrink-0', iconSkin)} />
      <div className="min-w-0 text-[0.6875rem] leading-relaxed">
        <span className="font-semibold">{title}</span>
        {children && <> — {children}</>}
      </div>
    </div>
  );
}

/* ── Pickers ───────────────────────────────────────────────── */
const menu =
  'absolute z-30 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/5';
const option =
  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[0.8125rem] hover:bg-slate-50';
const pill =
  'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium';

function LocationPicker({
  selected,
  invalid,
  onAdd,
  onRemove,
}: {
  selected: { id: number; name: string }[];
  invalid?: boolean;
  onAdd: (loc: BdJobsLocation) => void;
  onRemove: (id: number) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const dq = useDebounce(q, 300);
  const { data: results = [], isFetching } = useSearchBdJobsLocations(dq);
  const filtered = results.filter((r) => !selected.find((s) => s.id === r.id));
  const full = selected.length >= 15;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
          ) : (
            <Search className="h-3.5 w-3.5 text-slate-400" />
          )}
        </span>
        <input
          value={q}
          disabled={full}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open) {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          placeholder={full ? '15 locations — the maximum' : 'Search districts…'}
          className={cn(input(invalid), 'pl-8')}
        />
        {open && (
          <>
            <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <div className={menu}>
              {filtered.length === 0 ? (
                <p className="px-2 py-1.5 text-[0.6875rem] text-slate-400">
                  {dq ? 'No matching location' : 'Type to search…'}
                </p>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onAdd(r);
                      setQ('');
                      setOpen(false);
                    }}
                    className={option}
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
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <span key={s.id} className={cn(pill, 'border-sky-200 bg-sky-50 text-sky-700')}>
              <MapPin className="h-2.5 w-2.5" />
              {s.name}
              <button
                type="button"
                aria-label={`Remove ${s.name}`}
                className="rounded-full hover:bg-sky-100"
                onClick={() => onRemove(s.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryPicker({
  value,
  onChange,
}: {
  value: { id: number | null; name: string };
  onChange: (v: { id: number | null; name: string }) => void;
}) {
  const [q, setQ] = useState(value.name);
  const [open, setOpen] = useState(false);
  const { data: all = [], isLoading } = useBdJobsCategories();
  const filtered = q.trim()
    ? all.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    : all;

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
        ) : (
          <Tag className="h-3.5 w-3.5 text-slate-400" />
        )}
      </span>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange({ id: null, name: e.target.value });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        placeholder="Search job category…"
        className={cn(input(), 'pl-8', value.id && 'pr-8')}
      />
      {value.id != null && (
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        </span>
      )}
      {open && (
        <>
          <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className={menu}>
            {filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-[0.6875rem] text-slate-400">No matching category</p>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onChange({ id: r.id, name: r.name });
                    setQ(r.name);
                    setOpen(false);
                  }}
                  className={cn(option, value.id === r.id && 'bg-brand-50 font-medium text-brand-700')}
                >
                  <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {r.name}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TokenPicker({
  kind,
  value,
  catId,
  onChange,
}: {
  kind: 'industry' | 'skills';
  value: (BdJobsIndustry | BdJobsSkill)[];
  catId?: number | null;
  onChange: (v: (BdJobsIndustry | BdJobsSkill)[]) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const industry = useSearchBdJobsIndustry(kind === 'industry' ? q : '');
  const skills = useSearchBdJobsSkills(kind === 'skills' ? q : '', catId);
  const { data: suggestions = [], isFetching } = kind === 'industry' ? industry : skills;
  const filtered = (suggestions as (BdJobsIndustry | BdJobsSkill)[]).filter(
    (s) => !value.find((v) => String(v.id) === String(s.id)),
  );
  const full = value.length >= 10;
  const skin =
    kind === 'industry'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-indigo-200 bg-indigo-50 text-indigo-700';

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
          ) : (
            <Search className="h-3.5 w-3.5 text-slate-400" />
          )}
        </span>
        <input
          value={q}
          disabled={full}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open) {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          placeholder={full ? '10 — the maximum' : 'Type 2+ characters…'}
          className={cn(input(), 'pl-8')}
        />
        {open && filtered.length > 0 && (
          <>
            <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <div className={menu}>
              {filtered.map((s) => (
                <button
                  key={String(s.id)}
                  type="button"
                  onClick={() => {
                    onChange([...value, s]);
                    setQ('');
                    setOpen(false);
                  }}
                  className={option}
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
        <div className="flex flex-wrap gap-1">
          {value.map((s) => (
            <span key={String(s.id)} className={cn(pill, skin)}>
              {s.name}
              <button
                type="button"
                aria-label={`Remove ${s.name}`}
                className="rounded-full hover:bg-black/5"
                onClick={() => onChange(value.filter((v) => String(v.id) !== String(s.id)))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EducationPicker({
  levelId,
  levelName,
  degreeId,
  degreeName,
  concentration,
  onChange,
}: {
  levelId: number | null;
  levelName: string;
  degreeId: number | null;
  degreeName: string;
  concentration: string;
  onChange: (v: {
    levelId: number | null;
    levelName: string;
    degreeId: number | null;
    degreeName: string;
    concentration: string;
  }) => void;
}) {
  const { data: levels = [] } = useBdJobsEduLevels();
  const { data: degrees = [], isFetching } = useBdJobsDegrees(levelId);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <select
        value={levelId ?? ''}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : null;
          onChange({
            levelId: id,
            levelName: levels.find((l) => l.id === id)?.name ?? '',
            degreeId: null,
            degreeName: '',
            concentration,
          });
        }}
        className={input()}
      >
        <option value="">Level…</option>
        {levels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <div className="relative">
        <select
          value={degreeId ?? ''}
          disabled={levelId == null || isFetching}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            onChange({
              levelId,
              levelName,
              degreeId: id,
              degreeName: degrees.find((d) => d.id === id)?.name ?? '',
              concentration,
            });
          }}
          className={input()}
        >
          <option value="">{levelId == null ? 'Degree (pick a level)' : 'Degree…'}</option>
          {degrees.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {isFetching && (
          <span className="pointer-events-none absolute inset-y-0 right-7 flex items-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
          </span>
        )}
      </div>
      <input
        value={concentration}
        disabled={degreeId == null}
        onChange={(e) =>
          onChange({ levelId, levelName, degreeId, degreeName, concentration: e.target.value })
        }
        placeholder="Major (optional)"
        className={input()}
      />
    </div>
  );
}

/* ── Social post text ─────────────────────────────────────────
 * The same vacancy, written the way it gets shared. Recruiters retype
 * this into Facebook, LinkedIn and WhatsApp groups from the requisition
 * anyway; every retyping is a chance for the salary or the deadline to
 * drift from what BDJobs is showing.
 * ─────────────────────────────────────────────────────────── */
const bullets = (v: string) =>
  (v ?? '')
    .split('\n')
    .map((l) => l.trim().replace(/^[-•*·]\s*/, ''))
    .filter(Boolean);

const STOP = new Set(['and', 'of', 'the', 'for', 'in', 'at', 'to', 'a', 'an', 'or']);

/** "Deputy Manager — Merchandising" → "#DeputyManagerMerchandising". */
function toTag(phrase?: string | null): string | null {
  const words = (phrase ?? '')
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()));
  if (!words.length) return null;
  const tag = `#${words.map((w) => w[0].toUpperCase() + w.slice(1)).join('')}`;
  return tag.length <= 34 ? tag : null;
}

function hashtagsFor(f: BdJobsFormData, req: Requisition): string {
  const tags = new Set(['#DBLGroup', '#WeAreHiring', '#Hiring']);
  [f.jobTitle, f.categoryName, req.department].forEach((phrase) => {
    const tag = toTag(phrase);
    if (tag) tags.add(tag);
  });
  (f.skills ?? []).slice(0, 3).forEach((sk) => {
    const tag = toTag(sk.name);
    if (tag) tags.add(tag);
  });
  tags.add('#JobsInBangladesh');
  return [...tags].join(' ');
}

function buildSocialPost(
  f: BdJobsFormData,
  req: Requisition,
  deadline: Date | null,
  applyUrl: string,
): string {
  const out: string[] = [];
  out.push(`🚀 WE ARE HIRING: ${(f.jobTitle || req.designation || '').toUpperCase()}`.trim());
  out.push(`🏢 DBL Group${req.unitFactory ? ` · ${req.unitFactory}` : ''}`);
  if (f.categoryName) out.push(`🗂️ ${f.categoryName}`);
  out.push('');

  const employment = (f.employmentStatus ?? []).map((k) => labelFor(EMP_STATUS, k)).join(', ');
  const workplace = (f.workplace ?? []).map((k) => labelFor(WORKPLACE, k)).join(' / ');
  const education = [f.educationDegreeName || f.educationLevelName, f.educationConcentration]
    .filter(Boolean)
    .join(', ');
  const locations = (f.locationNames ?? []).filter(Boolean).join(', ');

  const facts: (string | false)[] = [
    `👥 Vacancy: ${f.vacancyNo || 1}`,
    Boolean(locations) && `📍 Location: ${locations}`,
    Boolean(employment || workplace) &&
      `💼 ${[employment, workplace && `Work from ${workplace.toLowerCase()}`]
        .filter(Boolean)
        .join(' · ')}`,
    `💰 Salary: ${
      f.showSalary && f.salaryMin && f.salaryMax
        ? `${bdt(f.salaryMin)} – ${f.salaryMax.toLocaleString()} per month`
        : 'Negotiable'
    }`,
    Boolean(education) && `🎓 Education: ${education}`,
    f.experienceYears != null && `📈 Experience: at least ${f.experienceYears} year(s)`,
    Boolean(f.ageMin || f.ageMax) &&
      `🎂 Age: ${f.ageMin ?? 'any'} to ${f.ageMax ?? 'any'} years`,
    f.preferredGender !== 'all' && `👤 ${labelFor(GENDER, f.preferredGender)}`,
    (f.industryExperience ?? []).length > 0 &&
      `🏭 Industry: ${f.industryExperience.map((i) => i.name).join(', ')}`,
    Boolean(deadline) && `🗓️ Apply by: ${shortDate(deadline as Date)}`,
  ];
  out.push(facts.filter(Boolean).join('\n'));

  const responsibilities = bullets(f.jobDescription);
  if (responsibilities.length) {
    out.push('', '📋 Responsibilities', ...responsibilities.map((l) => `• ${l}`));
  }
  const requirements = bullets(f.additionalRequirements);
  if (requirements.length) {
    out.push('', '✅ Requirements', ...requirements.map((l) => `• ${l}`));
  }
  if ((f.skills ?? []).length) {
    out.push('', `🧰 Skills: ${f.skills.map((sk) => sk.name).join(', ')}`);
  }

  out.push(
    '',
    f.applyOnline
      ? `📩 Apply online: ${applyUrl}`
      : '📩 Apply as instructed in the job post on Bdjobs.com',
  );
  out.push('', hashtagsFor(f, req));
  return out.join('\n');
}

/** Clipboard, with a fallback for a page that is not a secure context. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Which required fields are answered — the preview doubles as a progress meter. */
function readiness(f: BdJobsFormData) {
  const checks = [
    Boolean(f.jobTitle.trim()),
    Boolean(f.vacancyNo && f.vacancyNo >= 1),
    (f.locationIds ?? []).length > 0,
    (f.employmentStatus ?? []).length > 0,
    (f.workplace ?? []).length > 0,
    Boolean(f.salaryMin && f.salaryMax && f.salaryMax >= f.salaryMin),
    Boolean(f.jobDescription.trim()),
  ];
  return { done: checks.filter(Boolean).length, total: checks.length };
}

/** Brief tint when a value changes, so an edit is visible in the preview. */
function useFlash(value: string): boolean {
  const [on, setOn] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setOn(true);
    const t = setTimeout(() => setOn(false), 650);
    return () => clearTimeout(t);
  }, [value]);
  return on;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  const flash = useFlash(value);
  const empty = value === '—' || value === 'Not specified';
  return (
    <div
      className={cn(
        '-mx-1 flex gap-2 rounded border-b border-dashed border-slate-100 px-1 py-1 transition-colors duration-500 last:border-0',
        flash && 'bg-brand-50 duration-0',
      )}
    >
      <dt className="w-[5.5rem] shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd
        className={cn(
          'min-w-0 flex-1 break-words text-[0.6875rem] leading-snug',
          empty ? 'text-slate-300' : 'text-slate-700',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/* ── The live preview rail ─────────────────────────────────────
 * The recruiter is writing a public advertisement, and until now could
 * not see it. Two live views of the same form: the BDJobs listing, and
 * the social post that gets shared alongside it.
 * ─────────────────────────────────────────────────────────── */
function AdPreview({
  form,
  requisition,
  deadline,
  live,
}: {
  form: BdJobsFormData;
  requisition: Requisition;
  deadline: Date | null;
  live?: boolean;
}) {
  const [tab, setTab] = useState<'listing' | 'social'>('listing');
  const [copied, setCopied] = useState(false);

  const applyUrl = `${window.location.origin}/apply/${requisition.id}`;
  const social = useMemo(
    () => buildSocialPost(form, requisition, deadline, applyUrl),
    [form, requisition, deadline, applyUrl],
  );
  const { done, total } = readiness(form);

  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / 86_400_000)
    : null;

  const rows: [string, string][] = [
    ['Vacancy', String(form.vacancyNo || '—')],
    ['Location', (form.locationNames ?? []).filter(Boolean).join(', ') || '—'],
    [
      'Employment',
      (form.employmentStatus ?? []).map((k) => labelFor(EMP_STATUS, k)).join(', ') || '—',
    ],
    ['Workplace', (form.workplace ?? []).map((k) => labelFor(WORKPLACE, k)).join(' / ') || '—'],
    [
      'Salary',
      form.showSalary && form.salaryMin && form.salaryMax
        ? `${bdt(form.salaryMin)} – ${form.salaryMax.toLocaleString()}`
        : 'Negotiable',
    ],
    [
      'Experience',
      form.experienceYears != null ? `At least ${form.experienceYears} year(s)` : 'Not specified',
    ],
    [
      'Education',
      [form.educationDegreeName || form.educationLevelName, form.educationConcentration]
        .filter(Boolean)
        .join(', ') || 'Not specified',
    ],
    [
      'Age',
      form.ageMin || form.ageMax
        ? `${form.ageMin ?? 'any'} to ${form.ageMax ?? 'any'} years`
        : 'Not specified',
    ],
    ['Gender', labelFor(GENDER, form.preferredGender)],
    (form.industryExperience ?? []).length > 0
      ? ['Industry', form.industryExperience.map((i) => i.name).join(', ')]
      : null,
    // A live listing's real deadline lives on BDJobs and may have been set from
    // settings that have since changed, so the date shown for one already
    // posted is the one we can vouch for: when it went out.
    [
      live ? 'Posted' : 'Deadline',
      deadline
        ? `${shortDate(deadline)}${!live && daysLeft != null && daysLeft > 0 ? ` · in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : ''}`
        : '—',
    ],
  ].filter(Boolean) as [string, string][];

  const body = bullets(form.jobDescription).slice(0, 6);
  const extra = bullets(form.additionalRequirements).slice(0, 3);

  const handleCopy = async () => {
    const ok = await copyText(social);
    if (!ok) {
      toast.error('Could not reach the clipboard — select the text and copy manually');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Job post copied — paste into Facebook, LinkedIn or WhatsApp');
  };

  return (
    // Natural height, not h-full: as a fixed-height flex column this shrank the
    // card below its content, and overflow-hidden then clipped everything under
    // the spec table instead of letting the rail scroll to it.
    <div className="flex flex-col gap-2">
      {/* Rail header: which view, and the one-click copy */}
      <div className="flex items-center gap-1.5">
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {(['listing', 'social'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'rounded-md px-2 py-1 text-[0.6875rem] font-semibold capitalize transition',
                tab === t ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {t === 'listing' ? 'Listing' : 'Social post'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy the full job details, formatted for a social media post"
          className={cn(
            'ml-auto flex h-7 items-center gap-1 rounded-lg border px-2 text-[0.6875rem] font-semibold transition',
            copied
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700',
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Required-field meter — the preview says how close this is to postable */}
      {!live && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                done === total ? 'bg-emerald-500' : 'bg-brand-500',
              )}
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
          <span
            className={cn(
              'shrink-0 text-[0.625rem] font-semibold',
              done === total ? 'text-emerald-600' : 'text-slate-400',
            )}
          >
            {done === total ? 'Ready to post' : `${done}/${total} required`}
          </span>
        </div>
      )}

      {tab === 'listing' ? (
        <div className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Employer strip */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-[0.625rem] font-black text-white">
              DBL
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.6875rem] font-semibold text-slate-700">
                DBL Group
              </span>
              <span className="flex items-center gap-1 truncate text-[0.625rem] text-slate-400">
                <Building2 className="h-2.5 w-2.5" />
                {requisition.unitFactory || 'DBL'}
              </span>
            </span>
          </div>

          <div className="px-3 py-2.5">
            <h4 className="text-sm font-bold leading-snug text-slate-900">
              {form.jobTitle || <span className="text-slate-300">Job title</span>}
            </h4>
            {form.categoryName && (
              <p className="mt-0.5 text-[0.625rem] font-medium text-brand-600">
                {form.categoryName}
              </p>
            )}

            <dl className="mt-2.5">
              {rows.map(([k, v]) => (
                <SpecRow key={k} label={k} value={v} />
              ))}
            </dl>

            {body.length > 0 && (
              <div className="mt-2.5 border-t border-slate-100 pt-2">
                <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">
                  Responsibilities
                </p>
                <ul className="mt-1 space-y-0.5">
                  {body.map((line, i) => (
                    <li key={i} className="flex gap-1.5 text-[0.6875rem] leading-snug text-slate-600">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                      <span className="line-clamp-2">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {extra.length > 0 && (
              <div className="mt-2 border-t border-slate-100 pt-2">
                <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">
                  Requirements
                </p>
                <ul className="mt-1 space-y-0.5">
                  {extra.map((line, i) => (
                    <li key={i} className="flex gap-1.5 text-[0.6875rem] leading-snug text-slate-600">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                      <span className="line-clamp-2">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {form.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {form.skills.slice(0, 8).map((sk) => (
                  <span
                    key={sk.id}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-medium text-slate-600"
                  >
                    {sk.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
              <span className="flex h-7 items-center rounded-md bg-[#e8753c] px-2.5 text-[0.6875rem] font-bold text-white">
                Apply {form.applyOnline ? 'Online' : 'Now'}
              </span>
              <span className="text-[0.625rem] leading-tight text-slate-400">
                {form.applyOnline ? 'via the DBL HRM careers page' : 'as instructed in the post'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[0.625rem] font-black text-white">
              DBL
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.6875rem] font-semibold text-slate-700">
                DBL Group
              </span>
              <span className="block text-[0.625rem] text-slate-400">Just now · Public</span>
            </span>
            <Share2 className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <pre className="max-h-[22rem] overflow-y-auto whitespace-pre-wrap break-words px-3 py-2.5 font-sans text-[0.6875rem] leading-relaxed text-slate-700">
            {social}
          </pre>
          <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2">
            <Button
              size="sm"
              fullWidth
              onClick={handleCopy}
              leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            >
              {copied ? 'Copied to clipboard' : 'Copy full job post'}
            </Button>
          </div>
        </div>
      )}

      <p className="text-[0.625rem] leading-relaxed text-slate-400">
        {tab === 'social'
          ? `${social.length.toLocaleString()} characters — emoji and line breaks survive a paste into Facebook, LinkedIn or WhatsApp.`
          : live
            ? 'What was submitted to BDJobs. The live listing itself is managed there.'
            : 'Indicative layout — BDJobs renders the final listing, and holds it at “Pending approval” until their team clears it.'}
      </p>
    </div>
  );
}

/* ── Live record (already posted) ──────────────────────────── */
function LiveRecord({ post }: { post: BdJobsPost }) {
  const f = post.formData;
  const rows: [string, string][] = [
    ['Posted', post.postedAt ? shortDate(new Date(post.postedAt)) : '—'],
    ['BDJobs job', post.bdJobsJobId ? `#${post.bdJobsJobId}` : 'not returned'],
    ['Category', f.categoryName || '—'],
    [
      'Salary sent',
      f.salaryMin && f.salaryMax
        ? `${bdt(f.salaryMin)} – ${f.salaryMax.toLocaleString()}${f.showSalary ? '' : ' (hidden)'}`
        : '—',
    ],
    [
      'Industry',
      (f.industryExperience ?? []).map((i) => i.name).join(', ') || '—',
    ],
    [
      'Filters',
      [f.restrictAge && 'age', f.restrictGender && 'gender', f.restrictExperience && 'experience']
        .filter(Boolean)
        .join(', ') || 'none',
    ],
    ['Applications', f.applyOnline ? 'Apply online (HRM page)' : 'As instructed in the post'],
  ];

  return (
    <div className="space-y-3">
      <Notice tone="success" title="Live on BDJobs">
        A listing cannot be posted twice, so this is the record of what went out.
        Changes to a live ad have to be made on BDJobs.
      </Notice>
      <dl className="overflow-hidden rounded-xl border border-slate-200">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex gap-3 border-b border-slate-100 px-3 py-2 last:border-0 odd:bg-slate-50/60"
          >
            <dt className="w-28 shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
              {k}
            </dt>
            <dd className="min-w-0 flex-1 text-[0.8125rem] text-slate-700">{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-slate-400">
          Listing body
        </p>
        <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-[0.6875rem] leading-relaxed text-slate-600">
          {f.jobDescription || '—'}
          {f.additionalRequirements ? `\n\n${f.additionalRequirements}` : ''}
        </div>
      </div>
    </div>
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
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [form, setForm] = useState<BdJobsFormData>(() => buildDefault(requisition));

  const { data: status } = useBdJobsStatus();
  const { data: existing } = useBdJobsPost(requisition.id);
  const postMutation = usePostToBdJobs(requisition.id);

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hydrated = useRef(false);

  const isLive = existing?.status === 'posted';
  const hasFailed = existing?.status === 'failed';
  const configured = status?.configured ?? false;
  const deadline = status ? previewDeadline(requisition, status.deadlineDays) : null;

  /* Hydrate the saved draft once per opening, so a background refetch — or the
   * response to our own submit — can never overwrite what is being typed. */
  useEffect(() => {
    if (!open || hydrated.current || !existing?.formData) return;
    hydrated.current = true;
    // Older drafts carry fields the form no longer offers (e.g. LinkedIn);
    // copying key by key onto the defaults keeps them out of the next submit.
    const saved = existing.formData as Partial<BdJobsFormData>;
    setForm((prev) => {
      const next = { ...prev };
      (Object.keys(prev) as (keyof BdJobsFormData)[]).forEach((k) => {
        if (saved[k] !== undefined) {
          (next[k] as BdJobsFormData[typeof k]) = saved[k] as BdJobsFormData[typeof k];
        }
      });
      return next;
    });
  }, [open, existing]);

  useEffect(() => {
    if (open) return;
    setStep(0);
    setAttempted({});
    setPreviewOpen(false);
    hydrated.current = false;
  }, [open]);

  /* Escape closes, background does not scroll — as the shared Modal does. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const set = <K extends keyof BdJobsFormData>(key: K, val: BdJobsFormData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toggleArr = <T,>(key: keyof BdJobsFormData, val: T) => {
    const arr = form[key] as T[];
    set(
      key,
      (arr.includes(val)
        ? arr.filter((x) => x !== val)
        : [...arr, val]) as BdJobsFormData[typeof key],
    );
  };

  /* A filter can only screen on a criterion that was given — drop the flag the
   * moment its input goes away. */
  useEffect(() => {
    if (form.restrictAge && form.ageMin == null && form.ageMax == null) set('restrictAge', false);
    if (form.restrictGender && form.preferredGender === 'all') set('restrictGender', false);
    if (form.restrictExperience && form.experienceYears == null) set('restrictExperience', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ageMin, form.ageMax, form.preferredGender, form.experienceYears]);

  const errors = useMemo(() => validateStep(step, form), [step, form]);
  const shown = attempted[step] ? errors : {};
  const err = (k: string) => shown[k];
  const errorCount = Object.keys(shown).length;

  const flagged = useMemo(() => {
    const out: Record<number, boolean> = {};
    STEPS.forEach((_, i) => {
      if (attempted[i]) out[i] = Object.keys(validateStep(i, form)).length > 0;
    });
    return out;
  }, [attempted, form]);

  const revealFirst = (errs: Errors) => {
    const first = Object.keys(errs)[0];
    requestAnimationFrame(() => {
      bodyRef.current
        ?.querySelector(`[data-field="${first}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const goNext = () => {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length) {
      setAttempted((a) => ({ ...a, [step]: true }));
      revealFirst(errs);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goTo = (target: number) => {
    if (target <= step) {
      setStep(target);
      return;
    }
    for (let i = step; i < target; i += 1) {
      const errs = validateStep(i, form);
      if (Object.keys(errs).length) {
        setAttempted((a) => ({ ...a, [i]: true }));
        setStep(i);
        revealFirst(errs);
        return;
      }
    }
    setStep(target);
  };

  const handleSubmit = () => {
    for (let i = 0; i < STEPS.length - 1; i += 1) {
      const errs = validateStep(i, form);
      if (Object.keys(errs).length) {
        setAttempted((a) => ({ ...a, [i]: true }));
        setStep(i);
        revealFirst(errs);
        toast.error(Object.values(errs)[0]);
        return;
      }
    }
    postMutation.mutate(
      { ...form, experienceYears: form.experienceYears ?? 0 },
      // A rejected posting stays open so the reason is readable.
      { onSuccess: (res) => res.status !== 'failed' && onClose() },
    );
  };

  if (!open) return null;

  const submitLabel = !configured ? 'Save draft' : hasFailed ? 'Retry posting' : 'Post to BDJobs';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      <div
        ref={overlayRef}
        aria-hidden
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bdjobs-title"
        className={cn(
          // Full-height sheet on a phone, a fixed-height panel above that — so
          // the ad preview always has room and only the form scrolls.
          'relative z-10 flex w-full flex-col overflow-hidden bg-white',
          'outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
          'h-[100dvh] animate-fade-in sm:h-[min(42rem,94dvh)] sm:max-w-5xl',
          'sm:rounded-2xl sm:shadow-2xl',
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-white via-white to-slate-50 px-3 py-2.5 sm:px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f4fd] ring-1 ring-inset ring-sky-100">
            <img
              src="https://www.bdjobs.com/favicon.ico"
              alt=""
              className="h-4 w-4 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="bdjobs-title" className="truncate text-[0.9375rem] font-bold leading-tight text-slate-800">
              {isLive ? 'Live in BDJobs' : 'Post to BDJobs'}
            </h2>
            <p className="truncate text-[0.6875rem] leading-tight text-slate-400">
              {requisition.code} · {requisition.designation}
              {requisition.unitFactory ? ` · ${requisition.unitFactory}` : ''}
            </p>
          </div>
          {isLive && <Badge tone="success" dot>Live</Badge>}
          {!isLive && existing?.status === 'draft' && <Badge tone="warning">Draft</Badge>}
          {hasFailed && <Badge tone="danger">Failed</Badge>}
          {!isLive && status && !configured && (
            <Badge tone="warning" className="hidden sm:inline-flex">
              No credentials
            </Badge>
          )}
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition lg:hidden',
              previewOpen
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50',
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Step rail — numbers only on a phone, labels from sm up */}
        {!isLive && (
          <nav
            aria-label="Progress"
            className="flex shrink-0 items-center gap-1.5 border-b border-slate-100 px-3 py-2 sm:px-4"
          >
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              const bad = flagged[i];
              return (
                <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={active ? 'step' : undefined}
                    className={cn(
                      'flex h-7 min-w-0 items-center gap-1.5 rounded-full pl-1 pr-2.5 text-xs font-semibold transition',
                      active
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25'
                        : bad
                          ? 'bg-rose-50 text-rose-600'
                          : done
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'text-slate-400 hover:bg-slate-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem]',
                        active
                          ? 'bg-white/20 text-white'
                          : bad
                            ? 'bg-rose-500 text-white'
                            : done
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-100 text-slate-400',
                      )}
                    >
                      {bad ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : done ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="hidden truncate sm:inline">{label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className={cn('h-px flex-1', done ? 'bg-emerald-200' : 'bg-slate-200')}
                    />
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* Body: form + preview rail */}
        <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
          <div
            ref={bodyRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4"
          >
            {isLive && existing ? (
              <LiveRecord post={existing} />
            ) : (
              <>
                {/* ── Details ─────────────────────────── */}
                {step === 0 && (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_5.5rem]">
                      <Field label="Job title" htmlFor="bdj-title" name="jobTitle" required error={err('jobTitle')}>
                        <input
                          id="bdj-title"
                          value={form.jobTitle}
                          onChange={(e) => set('jobTitle', e.target.value)}
                          placeholder="e.g. Deputy Manager — Merchandising"
                          className={input(Boolean(err('jobTitle')))}
                        />
                      </Field>
                      <Field label="Vacancy" htmlFor="bdj-vac" name="vacancyNo" required error={err('vacancyNo')}>
                        <input
                          id="bdj-vac"
                          type="number"
                          min={1}
                          value={form.vacancyNo}
                          onChange={(e) => set('vacancyNo', Number(e.target.value))}
                          className={input(Boolean(err('vacancyNo')))}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Category" hint="where BDJobs lists it" name="categoryId">
                        <CategoryPicker
                          value={{ id: form.categoryId, name: form.categoryName }}
                          onChange={(v) => {
                            set('categoryId', v.id);
                            set('categoryName', v.name);
                          }}
                        />
                      </Field>
                      <Field
                        label="Location(s)"
                        hint="max 15"
                        name="locationIds"
                        required
                        error={err('locationIds')}
                      >
                        <LocationPicker
                          invalid={Boolean(err('locationIds'))}
                          selected={form.locationIds.map((id, i) => ({
                            id,
                            name: form.locationNames[i] ?? '',
                          }))}
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
                      </Field>
                    </div>

                    <Rule label="Terms" />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Employment status" name="employmentStatus" required error={err('employmentStatus')}>
                        <div className="flex flex-wrap gap-1.5">
                          {EMP_STATUS.map((s) => (
                            <Chip
                              key={s.key}
                              active={form.employmentStatus.includes(s.key)}
                              onClick={() => toggleArr('employmentStatus', s.key)}
                            >
                              {s.label}
                            </Chip>
                          ))}
                        </div>
                      </Field>
                      <Field label="Workplace" name="workplace" required error={err('workplace')}>
                        <div className="flex flex-wrap gap-1.5">
                          {WORKPLACE.map((w) => (
                            <Chip
                              key={w.key}
                              tone="emerald"
                              active={form.workplace.includes(w.key)}
                              onClick={() => toggleArr('workplace', w.key)}
                            >
                              {w.label}
                            </Chip>
                          ))}
                        </div>
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <Field label="Salary min (BDT)" htmlFor="bdj-min" name="salaryMin" required error={err('salaryMin')}>
                        <input
                          id="bdj-min"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={form.salaryMin ?? ''}
                          onChange={(e) => set('salaryMin', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="45000"
                          className={input(Boolean(err('salaryMin')))}
                        />
                      </Field>
                      <Field label="Salary max (BDT)" htmlFor="bdj-max" name="salaryMax" required error={err('salaryMax')}>
                        <input
                          id="bdj-max"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={form.salaryMax ?? ''}
                          onChange={(e) => set('salaryMax', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="60000"
                          className={input(Boolean(err('salaryMax')))}
                        />
                      </Field>
                      {/* Same height as the inputs it sits beside; what
                          hiding the range actually does is visible in the
                          preview, which reads “Negotiable”. */}
                      <div className="flex h-9 items-center rounded-lg border border-slate-200 px-2.5 sm:w-[8.5rem]">
                        <div className="w-full">
                          <Switch
                            value={form.showSalary}
                            onChange={(v) => set('showSalary', v)}
                            label="Show on ad"
                          />
                        </div>
                      </div>
                    </div>

                    <Rule label="The ad" />

                    <Field
                      label="Responsibilities & context"
                      htmlFor="bdj-desc"
                      name="jobDescription"
                      required
                      error={err('jobDescription')}
                      hint={`${form.jobDescription.length.toLocaleString()} / ${DESCRIPTION_LIMIT.toLocaleString()}`}
                    >
                      <textarea
                        id="bdj-desc"
                        rows={7}
                        maxLength={DESCRIPTION_LIMIT}
                        value={form.jobDescription}
                        onChange={(e) => set('jobDescription', e.target.value)}
                        placeholder="Prefilled from the approved role profile — edit freely for the public ad. One responsibility per line."
                        className={cn(area(Boolean(err('jobDescription'))), 'resize-y')}
                      />
                    </Field>
                  </div>
                )}

                {/* ── Profile ─────────────────────────── */}
                {step === 1 && (
                  <div className="space-y-3">
                    <p className="text-[0.6875rem] text-slate-400">
                      All optional — anything left blank simply is not screened on.
                      What actually filters applicants is set on the next step.
                    </p>

                    <Field label="Preferred gender" name="preferredGender">
                      <div className="flex flex-wrap gap-1.5">
                        {GENDER.map((g) => (
                          <Chip
                            key={g.key}
                            active={form.preferredGender === g.key}
                            onClick={() => set('preferredGender', g.key)}
                          >
                            {g.label}
                          </Chip>
                        ))}
                      </div>
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Age from" name="ageMin" error={err('ageMin')}>
                        <input
                          type="number"
                          min={16}
                          max={99}
                          value={form.ageMin ?? ''}
                          onChange={(e) => set('ageMin', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="25"
                          className={input(Boolean(err('ageMin')))}
                        />
                      </Field>
                      <Field label="Age to" name="ageMax" error={err('ageMax')}>
                        <input
                          type="number"
                          min={16}
                          max={99}
                          value={form.ageMax ?? ''}
                          onChange={(e) => set('ageMax', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="45"
                          className={input(Boolean(err('ageMax')))}
                        />
                      </Field>
                      <Field label="Experience (years)" name="experienceYears" error={err('experienceYears')}>
                        <input
                          type="number"
                          min={0}
                          value={form.experienceYears ?? ''}
                          onChange={(e) =>
                            set('experienceYears', e.target.value === '' ? null : Number(e.target.value))
                          }
                          placeholder="5"
                          className={input(Boolean(err('experienceYears')))}
                        />
                      </Field>
                    </div>

                    <Rule label="Qualifications" />

                    <Field label="Education" name="educationLevelId">
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
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Industry experience" hint="max 10" name="industryExperience">
                        <TokenPicker
                          kind="industry"
                          value={form.industryExperience}
                          onChange={(v) => set('industryExperience', v as BdJobsIndustry[])}
                        />
                      </Field>
                      <Field label="Skills & expertise" hint="max 10" name="skills">
                        <TokenPicker
                          kind="skills"
                          value={form.skills}
                          catId={form.categoryId}
                          onChange={(v) => set('skills', v as BdJobsSkill[])}
                        />
                      </Field>
                    </div>

                    <Field label="Additional requirements" name="additionalRequirements">
                      <textarea
                        rows={4}
                        value={form.additionalRequirements}
                        onChange={(e) => set('additionalRequirements', e.target.value)}
                        placeholder="Anything else applicants must meet — appended to the ad."
                        className={cn(area(), 'resize-y')}
                      />
                    </Field>
                  </div>
                )}

                {/* ── Publish ─────────────────────────── */}
                {step === 2 && (
                  <div className="space-y-3">
                    {hasFailed && existing?.errorMessage && (
                      <Notice tone="danger" title="BDJobs rejected the last attempt">
                        {existing.errorMessage}
                      </Notice>
                    )}
                    {status && !configured && (
                      <Notice tone="warning" title="No BDJobs API credentials">
                        this saves as a draft. Once an admin adds them in Configuration →
                        Integrations, come back and post it live.
                      </Notice>
                    )}

                    <Field label="How candidates apply" name="applyOnline">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[true, false].map((online) => {
                          const on = form.applyOnline === online;
                          return (
                            <button
                              key={String(online)}
                              type="button"
                              onClick={() => set('applyOnline', online)}
                              className={cn(
                                'flex items-start gap-2 rounded-xl border p-2.5 text-left transition',
                                on
                                  ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-200'
                                  : 'border-slate-200 hover:bg-slate-50',
                              )}
                            >
                              <span
                                className={cn(
                                  'mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                  on ? 'border-brand-500 bg-brand-500' : 'border-slate-300',
                                )}
                              >
                                {on && <Check className="h-2.5 w-2.5 text-white" />}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[0.8125rem] font-semibold text-slate-800">
                                  {online ? 'Apply online' : 'Another way'}
                                  {online && (
                                    <span className="ml-1.5 rounded bg-brand-100 px-1 py-px text-[0.5625rem] font-bold uppercase tracking-wide text-brand-700">
                                      Recommended
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 block text-[0.6875rem] leading-snug text-slate-500">
                                  {online
                                    ? 'CVs land in this requisition’s Drive workspace automatically.'
                                    : 'Candidates follow the instructions in the job post.'}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    <Field label="Applicant filters" hint="BDJobs blocks anyone who misses these">
                      <div className="space-y-2 rounded-xl border border-slate-200 p-2.5">
                        <Switch
                          value={form.restrictAge}
                          disabled={form.ageMin == null && form.ageMax == null}
                          onChange={(v) => set('restrictAge', v)}
                          label="Filter by age"
                          desc={
                            form.ageMin || form.ageMax
                              ? `${form.ageMin ?? 'any'} – ${form.ageMax ?? 'any'} years`
                              : 'Set an age range on the Profile step first'
                          }
                        />
                        <div className="h-px bg-slate-100" />
                        <Switch
                          value={form.restrictGender}
                          disabled={form.preferredGender === 'all'}
                          onChange={(v) => set('restrictGender', v)}
                          label="Filter by gender"
                          desc={
                            form.preferredGender === 'all'
                              ? 'Open to both — nothing to filter'
                              : labelFor(GENDER, form.preferredGender)
                          }
                        />
                        <div className="h-px bg-slate-100" />
                        <Switch
                          value={form.restrictExperience}
                          disabled={form.experienceYears == null}
                          onChange={(v) => set('restrictExperience', v)}
                          label="Filter by experience"
                          desc={
                            form.experienceYears != null
                              ? `Minimum ${form.experienceYears} year${form.experienceYears === 1 ? '' : 's'}`
                              : 'Set years of experience on the Profile step first'
                          }
                        />
                      </div>
                    </Field>

                    <Field label="Destination">
                      <div className="flex items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white">
                          <img
                            src="https://www.bdjobs.com/favicon.ico"
                            alt=""
                            className="h-3.5 w-3.5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.8125rem] font-semibold text-brand-800">
                            Bdjobs.com
                          </span>
                          <span className="block text-[0.6875rem] leading-snug text-brand-700/70">
                            {deadline
                              ? `Applications close ${shortDate(deadline)}.`
                              : 'Goes live once BDJobs clears it.'}
                          </span>
                        </span>
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />
                      </div>
                    </Field>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preview rail — a column on wide screens, an overlay panel below */}
          <aside
            className={cn(
              'min-h-0 overflow-y-auto overscroll-contain border-slate-100 bg-slate-50/70 px-3 py-3',
              'lg:block lg:w-[19.5rem] lg:shrink-0 lg:border-l',
              previewOpen ? 'absolute inset-0 z-20 block bg-white lg:static lg:bg-slate-50/70' : 'hidden',
            )}
          >
            <AdPreview
              form={isLive && existing ? (existing.formData as BdJobsFormData) : form}
              requisition={requisition}
              deadline={
                isLive && existing?.postedAt ? new Date(existing.postedAt) : deadline
              }
              live={isLive}
            />
          </aside>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-white px-3 py-2.5 sm:px-4">
          {isLive ? (
            <>
              <p className="truncate text-[0.6875rem] text-slate-400">
                {existing?.bdJobsJobId ? `BDJobs job #${existing.bdJobsJobId}` : 'Live on BDJobs'}
              </p>
              <div className="flex items-center gap-2">
                {existing?.bdJobsJobId && (
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Copy className="h-3.5 w-3.5" />}
                    onClick={() => {
                      void navigator.clipboard.writeText(existing.bdJobsJobId as string);
                      toast.success('BDJobs job ID copied');
                    }}
                  >
                    Copy ID
                  </Button>
                )}
                <Button size="sm" onClick={onClose}>
                  Done
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
                leftIcon={step === 0 ? undefined : <ChevronLeft className="h-4 w-4" />}
              >
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>
              <div className="flex min-w-0 items-center gap-2">
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 truncate text-[0.6875rem] font-medium text-rose-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {errorCount} to fix
                  </span>
                )}
                {step < STEPS.length - 1 ? (
                  <Button size="sm" onClick={goNext} rightIcon={<ChevronRight className="h-4 w-4" />}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    isLoading={postMutation.isPending}
                    onClick={handleSubmit}
                    leftIcon={<Send className="h-3.5 w-3.5" />}
                  >
                    {submitLabel}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
