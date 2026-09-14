import { useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  RotateCw,
  UserRound,
} from 'lucide-react';

import { cn } from '@shared/lib';
import { useDelegationBoard } from '../hooks/useAssessment';
import { delegationBoardState } from './delegationBoardState';
import type {
  DelegationBoardRow,
  DelegationStage,
} from '../types/assessment.types';

/**
 * What came of the candidates this requisition handed out.
 *
 * Corporate HR and recruiters could send candidates to an interviewer and then
 * had nowhere to look: no record that a candidate had been sent before, and no
 * view of whether anything had happened since. This is that view — grouped by
 * interviewer, because the question is almost always "who is sitting on what".
 */
export function DelegationBoard({ requisitionId }: { requisitionId: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useDelegationBoard(requisitionId);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const state = delegationBoardState({ isLoading, isError, data });

  if (state === 'loading') {
    return (
      <p className="px-4 py-6 text-sm text-slate-500">Loading assignments…</p>
    );
  }
  // A failed request is NOT an empty board. Collapsing the two told people
  // "nothing has been sent" when the truth was "we could not find out" —
  // which is worse than an error, because it reads as an answer.
  if (state === 'error') {
    const message = error instanceof Error ? error.message : '';
    // A 404 here almost always means the running server predates these
    // endpoints, which is a restart away rather than anything to debug.
    const looksStale = /404|not found/i.test(message);
    return (
      <div className="px-4 py-8 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
        <p className="mt-2 text-sm font-medium text-slate-700">
          Could not load the assignments.
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
          {looksStale
            ? 'The server does not recognise this request — it is probably running an older build. Restarting the backend should fix it.'
            : message || 'The request did not complete.'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {isFetching ? 'Retrying…' : 'Try again'}
        </button>
      </div>
    );
  }

  if (state === 'empty' || !data) {
    return (
      <div className="px-4 py-8 text-center">
        <UserRound className="mx-auto h-6 w-6 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">
          No candidate from this requisition has been sent for a first
          interview yet.
        </p>
      </div>
    );
  }

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      {/* The whole picture in one line, before the detail. */}
      <div className="flex flex-wrap items-center gap-2">
        <Tally label="sent out" value={data.total} tone="neutral" />
        <Tally label="not started" value={data.waiting} tone="warn" />
        <Tally label="in progress" value={data.inProgress} tone="info" />
        <Tally label="done" value={data.done} tone="good" />
      </div>

      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
        {data.delegates.map((d) => {
          const isOpen = open.has(d.delegateId);
          return (
            <div key={d.delegateId}>
              <button
                type="button"
                onClick={() => toggle(d.delegateId)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {d.delegate.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {d.delegate.employeeCode}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  <span className="text-slate-600">{d.holds} assigned</span>
                  {d.waiting > 0 && (
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 font-medium',
                        d.oldestWaitingDays >= 7
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {d.waiting} not started
                      {d.oldestWaitingDays > 0 &&
                        ` · ${d.oldestWaitingDays}d`}
                    </span>
                  )}
                  {d.done > 0 && (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                      {d.done} done
                    </span>
                  )}
                </span>
              </button>

              {isOpen && (
                <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/50">
                  {d.candidates.map((row) => (
                    <CandidateLine key={row.id} row={row} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CandidateLine({ row }: { row: DelegationBoardRow }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 pl-10">
      <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
        {row.candidate.name}
      </span>

      <StageChip stage={row.stage} label={row.stageLabel} />

      {/* Sent more than once is exactly what was invisible before. */}
      {row.resent && (
        <span
          title={`Sent ${row.sendCount} times · first ${fmt(row.firstSentAt)}, last ${fmt(row.lastSentAt)}`}
          className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
        >
          <RotateCw className="h-3 w-3" />
          sent ×{row.sendCount}
        </span>
      )}

      {row.stage === 'sent' && (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[11px]',
            row.waitingDays >= 7 ? 'font-medium text-amber-700' : 'text-slate-500',
          )}
        >
          <Clock className="h-3 w-3" />
          waiting {row.waitingDays === 0 ? 'today' : `${row.waitingDays}d`}
        </span>
      )}

      {row.scheduledAt && row.stage !== 'sent' && (
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
          <CalendarClock className="h-3 w-3" />
          {fmt(row.scheduledAt)}
        </span>
      )}
    </li>
  );
}

const STAGE_TONE: Record<DelegationStage, string> = {
  sent: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-sky-100 text-sky-800',
  interviewed: 'bg-indigo-100 text-indigo-800',
  marked: 'bg-emerald-100 text-emerald-800',
  decided: 'bg-emerald-600 text-white',
};

function StageChip({
  stage,
  label,
}: {
  stage: DelegationStage;
  label: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
        STAGE_TONE[stage],
      )}
    >
      {(stage === 'marked' || stage === 'decided') && (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

function Tally({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'warn' | 'info' | 'good';
}) {
  const tones = {
    neutral: 'border-slate-200 bg-white text-slate-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 rounded-md border px-2.5 py-1',
        tones[tone],
      )}
    >
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-[11px]">{label}</span>
    </span>
  );
}

/** Short date — the board is scanned, not read. */
function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}
