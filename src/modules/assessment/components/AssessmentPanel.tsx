import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3,
  ClipboardCheck,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';

import {
  Avatar,
  Badge,
  Card,
  CardBody,
  Input,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useAnchoredPanel, useDebounce } from '@shared/hooks';
import { useEmployees } from '@modules/employees';
import { useCandidates } from '@modules/candidates';
import type { Requisition } from '@modules/requisition/types/requisition.types';

import {
  useAddCommitteeMember,
  useAssessmentSetup,
  useRemoveCommitteeMember,
  useScorecard,
} from '../hooks/useAssessment';
import { PreInterviewTestsPanel } from './PreInterviewTestsPanel';

const STAGE_COLORS: Record<string, string> = {
  ai_shortlisted: 'bg-violet-100 text-violet-700',
  shortlisted:    'bg-sky-100 text-sky-700',
  interview:      'bg-amber-100 text-amber-700',
  final:          'bg-orange-100 text-orange-700',
  selected:       'bg-emerald-100 text-emerald-700',
  rejected:       'bg-rose-100 text-rose-500',
};

const RANK_MEDAL: Record<number, string> = {
  0: 'bg-amber-400 text-white',
  1: 'bg-slate-300 text-white',
  2: 'bg-orange-300 text-white',
};

export function AssessmentPanel({ requisition }: { requisition: Requisition }) {
  const reqId = requisition.id;
  const { data: setup, isLoading } = useAssessmentSetup(reqId);
  const removeMember = useRemoveCommitteeMember(reqId);
  const { data: candidatePage } = useCandidates(reqId, { pageSize: 200 });
  const { data: scorecardRows } = useScorecard(reqId);

  if (isLoading || !setup) {
    return <TabSkeleton />;
  }

  const pipelineCount = (candidatePage?.items ?? []).filter((c) => c.stage !== 'rejected').length;
  const evaluatedCount = scorecardRows?.length ?? 0;
  const combinedScores = (scorecardRows ?? []).map((r) => r.combined).filter((v): v is number => v !== null);
  const avgCombined = combinedScores.length > 0
    ? Math.round((combinedScores.reduce((a, b) => a + b, 0) / combinedScores.length) * 10) / 10
    : null;

  return (
    <div className="space-y-5">

      {/* ── Overview stat strip ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile delay={0} icon={Users} label="Committee" value={setup.committee.length} ok={setup.committee.length > 0} />
        <StatTile delay={60} icon={ClipboardCheck} label="In pipeline" value={pipelineCount} ok={pipelineCount > 0} />
        <StatTile delay={120} icon={BarChart3} label="Evaluated" value={evaluatedCount} ok={evaluatedCount > 0} />
        <StatTile
          delay={180}
          icon={BarChart3}
          label="Avg combined score"
          value={avgCombined ?? 0}
          suffix="%"
          decimals={1}
          ok={avgCombined !== null}
        />
      </div>

      {/* ── 1. Interview committee ──────────────────────────── */}
      <Card
        className="animate-rise-in overflow-hidden opacity-0 transition-all duration-300 [animation-delay:80ms] [animation-fill-mode:forwards] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-900/5"
      >
        <CardBody className="space-y-3">
          <SectionHead
            step={1}
            icon={Users}
            title="Interview committee"
            desc="Who's on the panel for this requisition."
          />
          <CommitteePicker
            reqId={reqId}
            existingUserIds={setup.committee.map((m) => m.userId)}
          />
          {setup.committee.length === 0 ? (
            <EmptyHint>Search and add interviewers above.</EmptyHint>
          ) : (
            <div className="flex flex-wrap gap-2">
              {setup.committee.map((m, i) => (
                <div
                  key={m.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="group flex animate-fade-in items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 opacity-0 shadow-sm transition-all duration-200 [animation-fill-mode:forwards] hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50/40 hover:shadow-md"
                >
                  <Avatar name={m.name} size="sm" />
                  <div className="min-w-0 leading-tight">
                    <p className="max-w-[140px] truncate text-xs font-semibold text-slate-800">{m.name}</p>
                    <p className="truncate text-[0.625rem] text-slate-400">
                      {[m.designation, m.department].filter(Boolean).join(' · ') || m.employeeCode}
                    </p>
                  </div>
                  <Badge tone="neutral">{m.role}</Badge>
                  <button
                    type="button"
                    title="Remove"
                    onClick={() => removeMember.mutate(m.id)}
                    className="rounded-full p-1 text-slate-300 opacity-0 transition-all duration-150 hover:scale-110 hover:bg-rose-100 hover:text-rose-600 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── 2. Pre-interview screening tests ────────────────── */}
      <Card
        className="animate-rise-in overflow-hidden opacity-0 transition-all duration-300 [animation-delay:160ms] [animation-fill-mode:forwards] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-900/5"
      >
        <CardBody className="space-y-3">
          <SectionHead
            step={2}
            icon={ClipboardCheck}
            title="Pre-Interview Screening Tests"
            desc="Written Test marks + AI Proficiency Test — assign to one candidate or many, before scheduling interviews."
          />
          <PreInterviewTestsPanel reqId={reqId} />
        </CardBody>
      </Card>

      {/* ── 3. Candidate scorecard ──────────────────────────── */}
      <Card
        className="animate-rise-in overflow-hidden opacity-0 transition-all duration-300 [animation-delay:240ms] [animation-fill-mode:forwards] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-900/5"
      >
        <CardBody className="space-y-3">
          <SectionHead
            step={3}
            icon={BarChart3}
            title="Candidate scorecard"
            desc="CV match · interview scores, normalised 0–100."
          />
          <ScorecardBlock reqId={reqId} />
        </CardBody>
      </Card>
    </div>
  );
}

/* ── Animated count-up (professional dashboard touch) ────── */
function useCountUp(target: number, decimals = 0, durationMs = 700) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const factor = 10 ** decimals;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased * factor) / factor);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals, durationMs]);
  return display;
}

/* ── Overview stat tile ──────────────────────────────────── */
function StatTile({
  icon: Icon,
  label,
  value,
  suffix = '',
  ok,
  delay = 0,
  decimals = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  ok: boolean;
  delay?: number;
  decimals?: number;
}) {
  const animated = useCountUp(value, decimals);
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        'group relative animate-rise-in overflow-hidden rounded-2xl border p-4 opacity-0 shadow-sm transition-all duration-300 [animation-fill-mode:forwards]',
        'hover:-translate-y-1 hover:shadow-xl',
        ok
          ? 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-white hover:shadow-emerald-900/10'
          : 'border-slate-200 bg-white hover:shadow-slate-900/5',
      )}
    >
      <div className={cn(
        'pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-70',
        ok ? 'bg-emerald-300/30 opacity-40' : 'bg-slate-300/20 opacity-0',
      )} />
      <div className="relative flex items-center gap-3">
        <span className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3',
          ok ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white' : 'bg-slate-100 text-slate-400',
        )}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className={cn('text-2xl font-extrabold leading-none tabular-nums', ok ? 'text-emerald-700' : 'text-slate-700')}>
            {ok ? `${animated.toFixed(decimals)}${suffix}` : '—'}
          </p>
          <p className="mt-1 truncate text-[0.6875rem] font-medium text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Shared section header ─────────────────────────────── */
function SectionHead({
  step,
  icon: Icon,
  title,
  desc,
}: {
  step: number;
  icon: React.ElementType;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-md shadow-brand-500/30">
        {step}
      </span>
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {title}
        </h3>
        {desc && <p className="mt-1 text-[0.6875rem] text-slate-400">{desc}</p>}
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
      {children}
    </p>
  );
}

/* ── Loading skeleton (shimmer) ──────────────────────────── */
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

function TabSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <Shimmer className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-5 w-12" />
                <Shimmer className="h-2.5 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <Card key={i} className="overflow-hidden">
          <CardBody className="space-y-4">
            <div className="flex items-center gap-3">
              <Shimmer className="h-7 w-7 rounded-full" />
              <Shimmer className="h-4 w-40" />
            </div>
            <Shimmer className="h-9 w-full rounded-lg" />
            <Shimmer className="h-24 w-full rounded-xl" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

/* ── Scorecard ─────────────────────────────────────────── */
function ScoreBar({ value, delay = 0 }: { value: number | null; delay?: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (value === null) return <span className="text-xs text-slate-300">—</span>;
  const color =
    value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', color)}
          style={{ width: ready ? `${Math.min(value, 100)}%` : '0%' }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-600">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function ScorecardBlock({ reqId }: { reqId: string }) {
  const { data: rows, isLoading, refetch, isFetching } = useScorecard(reqId);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner /></div>;
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyHint>
        No evaluated candidates yet — scores appear once candidates have been screened or interviewed.
      </EmptyHint>
    );
  }

  const sorted = [...rows].sort((a, b) => (b.combined ?? -1) - (a.combined ?? -1));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
        >
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Candidate</th>
              <th className="px-3 py-2.5 text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Stage</th>
              <th className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">CV %</th>
              <th className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">AI Test</th>
              <th className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Interview</th>
              <th className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Combined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {sorted.map((row, idx) => (
              <tr
                key={row.candidateId}
                style={{ animationDelay: `${idx * 35}ms` }}
                className={cn(
                  'animate-fade-in opacity-0 transition-colors duration-150 hover:bg-slate-50/70 [animation-fill-mode:forwards]',
                  idx === 0 && 'bg-emerald-50/30',
                )}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="relative shrink-0">
                      <Avatar name={row.candidateName} size="sm" />
                      {idx < 3 && (
                        <span className={cn(
                          'absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[0.5625rem] font-bold ring-2 ring-white',
                          RANK_MEDAL[idx],
                        )}>
                          {idx + 1}
                        </span>
                      )}
                    </span>
                    <span className="max-w-[140px] truncate font-medium text-slate-800">{row.candidateName}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-medium',
                    STAGE_COLORS[row.stage] ?? 'bg-slate-100 text-slate-600',
                  )}>
                    {row.stage.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-2.5"><ScoreBar value={row.cvScore} delay={idx * 35} /></td>
                <td className="px-3 py-2.5"><ScoreBar value={row.aiProficiencyScore} delay={idx * 35} /></td>
                <td className="px-3 py-2.5"><ScoreBar value={row.interviewAvg} delay={idx * 35} /></td>
                <td className="px-3 py-2.5"><ScoreBar value={row.combined} delay={idx * 35} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Committee picker ──────────────────────────────────── */
function CommitteePicker({ reqId, existingUserIds }: { reqId: string; existingUserIds: string[] }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(q, 300);
  const { data } = useEmployees({ search: debounced, page: 1, pageSize: 6 });
  const add = useAddCommitteeMember(reqId);
  const close = useCallback(() => setOpen(false), []);
  // Portalled: the section card clips its children, which cut the results list
  // off after the first row. Outside-click is handled by the hook.
  const { triggerRef, panelRef, panelStyle, ready } =
    useAnchoredPanel<HTMLDivElement>(open, close);

  const results = (data?.items ?? []).filter((e) => e.userId && !existingUserIds.includes(e.userId));

  return (
    <div ref={triggerRef} className="relative">
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search and add committee members…"
        leftIcon={<Search className="h-4 w-4" />}
      />
      {open && ready && debounced.length > 0 && results.length > 0 &&
        createPortal(
          <div
            ref={panelRef}
            data-portal-panel="true"
            style={panelStyle}
            className="z-50 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                if (e.userId) add.mutate({ memberUserId: e.userId });
                setQ('');
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
            >
              <Avatar name={e.name} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{e.name}</span>
                <span className="block truncate text-xs text-slate-400">
                  {[e.jobTitle, e.department].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

