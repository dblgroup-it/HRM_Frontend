import { useState } from 'react';
import { ChevronDown, ExternalLink, RefreshCw, Users } from 'lucide-react';

import { Avatar, Badge, Spinner } from '@shared/components/ui';
import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { useScorecard } from '../hooks/useAssessment';
import type {
  ScorecardEntry,
  ScorecardTest,
} from '../types/assessment.types';

const RANK_MEDAL = [
  'bg-amber-400 text-white',
  'bg-slate-300 text-white',
  'bg-amber-700/80 text-white',
];

const STAGE_TONE: Record<string, string> = {
  applied: 'bg-slate-100 text-slate-600',
  ai_shortlisted: 'bg-violet-100 text-violet-700',
  shortlisted: 'bg-sky-100 text-sky-700',
  interview: 'bg-amber-100 text-amber-700',
  final: 'bg-indigo-100 text-indigo-700',
  selected: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);

/** Green above 75, amber above 50, red below — one scale for every number here. */
function toneFor(value: number | null) {
  if (value === null) return 'bg-slate-200';
  return value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-400' : 'bg-rose-400';
}

/**
 * One number with its bar.
 *
 * `raw` is the marks behind the percentage ("72 / 100"). A percentage on its
 * own is the thing people argue about afterwards; the raw mark settles it.
 */
function Metric({
  label,
  value,
  raw,
  status,
  children,
}: {
  label: string;
  value: number | null;
  raw?: string | null;
  status?: ScorecardTest['status'];
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[0.6875rem] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
        {status === 'skipped' ? (
          <span className="text-[0.6875rem] text-slate-300">skipped</span>
        ) : status === 'pending' ? (
          <span className="text-[0.6875rem] text-amber-600">pending</span>
        ) : null}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            value === null ? 'text-slate-300' : 'text-slate-800',
          )}
        >
          {pct(value)}
        </span>
        {raw && (
          <span className="text-[0.6875rem] tabular-nums text-slate-400">{raw}</span>
        )}
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all duration-700', toneFor(value))}
          style={{ width: value === null ? '0%' : `${Math.min(value, 100)}%` }}
        />
      </div>
      {children}
    </div>
  );
}

function TestMetric({
  label,
  test,
}: {
  label: string;
  test: ScorecardTest;
}) {
  return (
    <Metric
      label={label}
      value={test.pct}
      raw={
        test.obtained !== null && test.total !== null
          ? `${test.obtained} / ${test.total}`
          : null
      }
      status={test.status}
    >
      <div className="mt-1 flex items-center gap-2">
        {test.status === 'pass' && (
          <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-emerald-600">
            Pass
          </span>
        )}
        {test.status === 'fail' && (
          <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-rose-600">
            Fail
          </span>
        )}
        {test.sheetUrl && (
          <a
            href={resolveApiFileUrl(test.sheetUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[0.625rem] font-medium text-brand-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Exam sheet
          </a>
        )}
      </div>
    </Metric>
  );
}

/**
 * The scorecard, with its working shown.
 *
 * Every component that made the combined figure gets its own column — CV
 * match, each screening test with the marks it was out of, and the interview
 * average — and each row opens to the individual panelists' marks. The point
 * is that a reader can see how a candidate reached their number, and open the
 * marked script where one exists, without leaving the page.
 */
export function ScorecardBlock({ reqId }: { reqId: string }) {
  const { data: rows, isLoading, refetch, isFetching } = useScorecard(reqId);
  const [open, setOpen] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400">
        No evaluated candidates yet — scores appear once candidates have been
        screened or interviewed.
      </p>
    );
  }

  const sorted = [...rows].sort((a, b) => (b.combined ?? -1) - (a.combined ?? -1));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[0.6875rem] text-slate-400">
          Ranked by combined score. Open a row for each panelist&rsquo;s marks.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
        >
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {sorted.map((row, idx) => (
        <ScorecardRow
          key={row.candidateId}
          row={row}
          rank={idx}
          open={open === row.candidateId}
          onToggle={() =>
            setOpen((cur) => (cur === row.candidateId ? null : row.candidateId))
          }
        />
      ))}
    </div>
  );
}

function ScorecardRow({
  row,
  rank,
  open,
  onToggle,
}: {
  row: ScorecardEntry;
  rank: number;
  open: boolean;
  onToggle: () => void;
}) {
  const combinedTone =
    row.combined === null
      ? 'text-slate-300'
      : row.combined >= 75
        ? 'text-emerald-600'
        : row.combined >= 50
          ? 'text-amber-600'
          : 'text-rose-600';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-white transition-shadow',
        rank === 0 ? 'border-emerald-200 shadow-sm' : 'border-slate-200',
      )}
    >
      <div className="flex flex-wrap items-center gap-3 px-3.5 py-3">
        <span className="relative shrink-0">
          <Avatar name={row.candidateName} size="sm" />
          {rank < 3 && (
            <span
              className={cn(
                'absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[0.5625rem] font-bold ring-2 ring-white',
                RANK_MEDAL[rank],
              )}
            >
              {rank + 1}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {row.candidateName}
          </p>
          <span
            className={cn(
              'mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-medium',
              STAGE_TONE[row.stage] ?? 'bg-slate-100 text-slate-600',
            )}
          >
            {row.stage.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">
            Combined
          </p>
          <p className={cn('text-lg font-bold tabular-nums', combinedTone)}>
            {row.combined === null ? '—' : row.combined.toFixed(1)}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label={open ? 'Hide panelist marks' : 'Show panelist marks'}
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>

      <div className="grid gap-x-5 gap-y-3 border-t border-slate-100 bg-slate-50/40 px-3.5 py-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="CV match" value={row.cvScore} />
        <TestMetric label="Written Test" test={row.written} />
        <TestMetric label="Computer Literacy" test={row.computer} />
        <TestMetric label="AI Proficiency" test={row.aiTest} />
        <Metric
          label="Interview"
          value={row.interviewAvg}
          raw={
            row.interviewers.length
              ? `${row.interviewers.length} panelist${row.interviewers.length > 1 ? 's' : ''}`
              : null
          }
        />
      </div>

      {open && (
        <div className="border-t border-slate-100 px-3.5 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
            <Users className="h-3.5 w-3.5" /> Panelist marks
          </p>
          {row.interviewers.length === 0 ? (
            <p className="text-xs text-slate-400">
              No interview marks submitted yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {row.interviewers.map((ev) => (
                <li
                  key={`${ev.evaluatorName}-${ev.submittedAt}`}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                    {ev.evaluatorName}
                  </span>
                  {ev.roundKind && (
                    <Badge tone="neutral">{ev.roundKind} round</Badge>
                  )}
                  <span className="tabular-nums text-slate-500">
                    {ev.total} / {ev.max}
                  </span>
                  <span className="w-20 shrink-0">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className={cn('block h-full rounded-full', toneFor(ev.pct))}
                        style={{ width: `${Math.min(ev.pct, 100)}%` }}
                      />
                    </span>
                  </span>
                  <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-slate-600">
                    {ev.pct.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
