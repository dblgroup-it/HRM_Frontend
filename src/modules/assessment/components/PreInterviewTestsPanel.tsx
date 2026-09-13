import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Send,
  Sparkles,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { Avatar, Badge, Button, SegmentedToggle, Select, Spinner } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useCandidates } from '@modules/candidates';
import type { Candidate } from '@modules/candidates';
import {
  JOB_GRADES,
  evaluateScreeningTest,
  useSalaryFixationsBulk,
  useUpsertSalaryFixation,
  type ScreeningResult,
  type SalaryFixation,
} from '@modules/salaryFixation';
import { AiProficiencyStep, useBulkAssignAiProficiencyTest } from '@modules/aiProficiency';

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-md bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%]',
        className,
      )}
    />
  );
}

type Bucket = 'failed' | 'needs' | 'pending' | 'cleared';

const BUCKETS: { key: Bucket; label: string; icon: LucideIcon; tone: string; iconTone: string }[] = [
  { key: 'failed', label: 'Failed', icon: XCircle, tone: 'border-rose-200 bg-rose-50/60', iconTone: 'bg-rose-100 text-rose-600' },
  { key: 'needs', label: 'Needs tests assigned', icon: AlertTriangle, tone: 'border-amber-200 bg-amber-50/60', iconTone: 'bg-amber-100 text-amber-600' },
  { key: 'pending', label: 'Pending', icon: Clock, tone: 'border-sky-200 bg-sky-50/60', iconTone: 'bg-sky-100 text-sky-600' },
  { key: 'cleared', label: 'Cleared', icon: CheckCircle2, tone: 'border-emerald-200 bg-emerald-50/60', iconTone: 'bg-emerald-100 text-emerald-600' },
];

function bucketFor(...results: ScreeningResult[]): Bucket {
  if (results.some((r) => r.status === 'fail')) return 'failed';
  if (results.every((r) => r.status === 'not_conducted')) return 'needs';
  if (results.some((r) => r.status === 'pending')) return 'pending';
  return 'cleared';
}

function summaryText(
  written: ScreeningResult,
  computer: ScreeningResult,
  ai: ScreeningResult,
): string {
  const part = (label: string, r: ScreeningResult, waitingOn: string) => {
    if (r.status === 'not_conducted') return null;
    if (r.status === 'pending') return `${label} — ${waitingOn}`;
    return `${label} ${r.status === 'pass' ? 'passed' : 'failed'} ${r.pct?.toFixed(0)}%`;
  };
  const parts = [
    part('Written', written, 'marks not entered'),
    part('Computer', computer, 'marks not entered'),
    part('AI', ai, 'test in progress'),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'No tests assigned yet';
}

/**
 * Pre-Interview Screening Tests, moved earlier in the flow: HR can enable/
 * mark the manual Written Test and assign the online AI Proficiency Test —
 * one candidate at a time, or in bulk to a whole selection — before
 * candidates ever reach interview stage. Writes go straight into the same
 * SalaryFixation record the Salary Fixation modal reads later.
 *
 * Candidates are grouped by what needs attention (Failed → Needs tests →
 * Pending → Cleared) instead of one flat table, so it reads at a glance
 * instead of requiring a scan of every row.
 *
 * Only candidates HR has actually shortlisted appear. Screening tests cost the
 * candidate and the panel real effort, so raw applicants — and AI suggestions
 * a human has not confirmed — are deliberately out of scope here.
 */
/** Stages eligible for screening: shortlisted and anything past it. */
const SCREENABLE_STAGES = new Set([
  'shortlisted',
  'interview',
  'final',
  'selected',
]);
export function PreInterviewTestsPanel({ reqId }: { reqId: string }) {
  const { data, isLoading } = useCandidates(reqId, { pageSize: 200 });
  const candidates = (data?.items ?? []).filter((c) =>
    SCREENABLE_STAGES.has(c.stage),
  );
  const fixations = useSalaryFixationsBulk(candidates.map((c) => c.id));
  const fixationsLoading = fixations.some((f) => f.isLoading);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [grade, setGrade] = useState('');
  const [count, setCount] = useState('20');
  const [minutes, setMinutes] = useState('30');
  const [notify, setNotify] = useState(true);
  const bulkAssign = useBulkAssignAiProficiencyTest();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulkAssign = () => {
    if (!grade || !count || Number(count) < 1 || !minutes || Number(minutes) < 1) return;
    bulkAssign.mutate(
      {
        candidateIds: [...selected],
        input: {
          jobGrade: grade,
          questionCount: Number(count),
          notifyCandidate: notify,
          timeLimitMinutes: Number(minutes),
        },
      },
      { onSuccess: () => { setBulkOpen(false); setSelected(new Set()); } },
    );
  };

  if (isLoading || fixationsLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 p-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Shimmer className="h-8 w-8 shrink-0 rounded-full" />
            <Shimmer className="h-4 w-28" />
            <Shimmer className="ml-auto h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
        No shortlisted candidates yet to screen.
      </p>
    );
  }

  const grouped = new Map<Bucket, { candidate: Candidate; fx: SalaryFixation | undefined }[]>();
  for (const b of BUCKETS) grouped.set(b.key, []);
  candidates.forEach((c, i) => {
    const fx = fixations[i]?.data;
    const written = fx
      ? evaluateScreeningTest(fx.writtenTestTotal, fx.writtenTestObtained, fx.writtenTestEnabled, fx.writtenTestPassPct)
      : { status: 'not_conducted' as const, pct: null };
    const ai = fx
      ? evaluateScreeningTest(fx.aiTestTotal, fx.aiTestObtained, fx.aiTestEnabled, fx.aiTestPassPct)
      : { status: 'not_conducted' as const, pct: null };
    const computer = fx
      ? evaluateScreeningTest(fx.computerTestTotal, fx.computerTestObtained, fx.computerTestEnabled, fx.computerTestPassPct)
      : { status: 'not_conducted' as const, pct: null };
    grouped.get(bucketFor(written, computer, ai))!.push({ candidate: c, fx });
  });

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex animate-rise-in flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200/70 bg-gradient-to-r from-brand-50 to-white px-3.5 py-2.5 shadow-sm [animation-duration:0.3s]">
          <span className="flex items-center gap-2 text-xs font-semibold text-brand-800">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[0.625rem] font-bold text-white">
              {selected.size}
            </span>
            candidate{selected.size === 1 ? '' : 's'} selected
          </span>
          {!bulkOpen && (
            <Button size="sm" leftIcon={<Send className="h-3.5 w-3.5" />} onClick={() => setBulkOpen(true)}>
              Assign AI Proficiency Test
            </Button>
          )}
        </div>
      )}

      {bulkOpen && (
        <div className="animate-fade-in space-y-2.5 rounded-lg border border-brand-200 bg-brand-50/50 p-3 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-800">
            <Sparkles className="h-3.5 w-3.5" />
            Assign to {selected.size} selected candidate{selected.size === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              options={JOB_GRADES.map((g) => ({ value: g, label: g }))}
              placeholder="Job grade"
            />
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="No. of questions"
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.6875rem] font-medium text-slate-500">
              Time limit (minutes) — starts once each candidate opens the test
            </label>
            <input
              type="number"
              min={1}
              max={300}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="e.g. 30"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Email each candidate their test link
          </label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={bulkAssign.isPending}
              disabled={!grade || !count || Number(count) < 1 || !minutes || Number(minutes) < 1}
              onClick={runBulkAssign}
            >
              Assign to {selected.size}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {BUCKETS.map((b) => {
          const rows = grouped.get(b.key)!;
          if (rows.length === 0) return null;
          return (
            <div key={b.key} className={cn('overflow-hidden rounded-xl border', b.tone)}>
              <div className="flex items-center gap-2 px-3 py-2">
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', b.iconTone)}>
                  <b.icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-semibold text-slate-700">{b.label}</p>
                <span className="text-xs text-slate-400">({rows.length})</span>
              </div>
              <div className="divide-y divide-white bg-white/60">
                {rows.map(({ candidate, fx }) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    fx={fx}
                    selected={selected.has(candidate.id)}
                    onToggleSelect={() => toggle(candidate.id)}
                    expanded={expandedId === candidate.id}
                    onToggleExpand={() => setExpandedId((cur) => (cur === candidate.id ? null : candidate.id))}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Candidate row (grouped list, not a table) ──────────── */
function CandidateRow({
  candidate,
  fx,
  selected,
  onToggleSelect,
  expanded,
  onToggleExpand,
}: {
  candidate: Candidate;
  fx: SalaryFixation | undefined;
  selected: boolean;
  onToggleSelect: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const written = fx
    ? evaluateScreeningTest(fx.writtenTestTotal, fx.writtenTestObtained, fx.writtenTestEnabled, fx.writtenTestPassPct)
    : { status: 'not_conducted' as const, pct: null };
  const computer = fx
    ? evaluateScreeningTest(fx.computerTestTotal, fx.computerTestObtained, fx.computerTestEnabled, fx.computerTestPassPct)
    : { status: 'not_conducted' as const, pct: null };
  const ai = fx
    ? evaluateScreeningTest(fx.aiTestTotal, fx.aiTestObtained, fx.aiTestEnabled, fx.aiTestPassPct)
    : { status: 'not_conducted' as const, pct: null };

  return (
    <div>
      <div className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className="shrink-0 text-slate-300 hover:text-brand-500"
          title={selected ? 'Deselect' : 'Select'}
        >
          {selected ? (
            <CheckCircle2 className="h-4 w-4 text-brand-600" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <Avatar name={candidate.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{candidate.name}</p>
            <p className="truncate text-xs text-slate-400">{summaryText(written, computer, ai)}</p>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out',
              expanded && 'rotate-180 text-brand-500',
            )}
          />
        </button>
      </div>
      {expanded && (
        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2 xl:grid-cols-3">
          <ManualTestCell kind="written" candidateId={candidate.id} fx={fx} />
          <ManualTestCell kind="computer" candidateId={candidate.id} fx={fx} />
          <AiTestCell candidateId={candidate.id} fx={fx} />
        </div>
      )}
    </div>
  );
}

function AiTestCell({
  candidateId,
  fx: data,
}: {
  candidateId: string;
  fx: SalaryFixation | undefined;
}) {
  const upsert = useUpsertSalaryFixation(candidateId);

  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
          AI Proficiency Test <span className="normal-case text-slate-300">pass ≥ {data.aiTestPassPct}%</span>
        </p>
        <SegmentedToggle
          value={data.aiTestEnabled}
          onChange={(v) => upsert.mutate({ aiTestEnabled: v })}
          onLabel="Required"
          offLabel="Skip"
        />
      </div>
      {data.aiTestEnabled && (
        <AiProficiencyStep candidateId={candidateId} jobGrade={data.jobGrade} />
      )}
    </div>
  );
}

/**
 * A hand-marked screening test — Written or Computer Literacy.
 *
 * Both are the same thing operationally: HR decides whether it applies, then
 * someone types the total and the mark. One component so a change to the
 * marking rules can't drift between the two.
 */
const MANUAL_TESTS = {
  written: {
    label: 'Written Test',
    enabledKey: 'writtenTestEnabled',
    totalKey: 'writtenTestTotal',
    obtainedKey: 'writtenTestObtained',
    passKey: 'writtenTestPassPct',
  },
  computer: {
    label: 'Computer Literacy',
    enabledKey: 'computerTestEnabled',
    totalKey: 'computerTestTotal',
    obtainedKey: 'computerTestObtained',
    passKey: 'computerTestPassPct',
  },
} as const;

function ManualTestCell({
  kind,
  candidateId,
  fx: data,
}: {
  kind: keyof typeof MANUAL_TESTS;
  candidateId: string;
  fx: SalaryFixation | undefined;
}) {
  const upsert = useUpsertSalaryFixation(candidateId);
  const cfg = MANUAL_TESTS[kind];

  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5">
        <Spinner />
      </div>
    );
  }

  const enabled = data[cfg.enabledKey];
  const total = data[cfg.totalKey];
  const obtained = data[cfg.obtainedKey];
  const passPct = data[cfg.passKey];
  const result = evaluateScreeningTest(total, obtained, enabled, passPct);

  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
          {cfg.label}{' '}
          <span className="normal-case text-slate-300">pass ≥ {passPct}%</span>
        </p>
        <SegmentedToggle
          value={enabled}
          onChange={(v) => upsert.mutate({ [cfg.enabledKey]: v })}
          onLabel="Required"
          offLabel="Skip"
        />
      </div>
      {enabled && (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="number"
            placeholder="Total"
            defaultValue={total ?? ''}
            onBlur={(e) =>
              upsert.mutate({
                [cfg.totalKey]: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
          <span className="text-xs text-slate-300">/</span>
          <input
            type="number"
            placeholder="Obtained"
            defaultValue={obtained ?? ''}
            onBlur={(e) =>
              upsert.mutate({
                [cfg.obtainedKey]: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
          {result.status === 'pass' && <Badge tone="success">Pass</Badge>}
          {result.status === 'fail' && <Badge tone="danger">Fail</Badge>}
          {result.status === 'pending' && <Badge tone="neutral">Pending</Badge>}
        </div>
      )}
    </div>
  );
}
