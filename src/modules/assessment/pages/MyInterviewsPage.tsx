import { useState } from 'react';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  Video,
} from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  FullPageSpinner,
  PageHeader,
  Textarea,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import { useMyInterviews, useSubmitEvaluation } from '../hooks/useAssessment';
import { CriteriaScoringSection } from '../components/CriteriaScoringSection';
import type { MyInterviewRound } from '../types/assessment.types';

type Filter = 'all' | 'pending' | 'submitted';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function getTimingLabel(scheduledAt: string | null) {
  if (!scheduledAt) return null;
  const d   = new Date(scheduledAt);
  const now = new Date();
  const s   = new Date(now); s.setHours(0, 0, 0, 0);
  const e   = new Date(now); e.setHours(23, 59, 59, 999);
  if (d >= s && d <= e) return { text: 'Today', urgent: true };
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  if (diff === 1) return { text: 'Tomorrow', urgent: false };
  if (diff > 1)  return { text: `In ${diff} days`, urgent: false };
  return null;
}

export default function MyInterviewsPage() {
  const { data: rounds = [], isLoading } = useMyInterviews();
  const [filter, setFilter] = useState<Filter>('all');

  if (isLoading) return <FullPageSpinner label="Loading your interviews…" />;

  const pending   = rounds.filter((r) => !r.myEvaluation && r.status !== 'cancelled').length;
  const submitted = rounds.filter((r) => !!r.myEvaluation).length;
  const todayCount = rounds.filter((r) => {
    if (!r.scheduledAt) return false;
    const d = new Date(r.scheduledAt), now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const visible = rounds.filter((r) => {
    if (filter === 'pending')   return !r.myEvaluation && r.status !== 'cancelled';
    if (filter === 'submitted') return !!r.myEvaluation;
    return true;
  });

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: 'all',       label: 'All',       count: rounds.length },
    { key: 'pending',   label: 'Pending',   count: pending        },
    { key: 'submitted', label: 'Submitted', count: submitted      },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Interviews"
        description="Candidates you're on the panel for — score each after the session."
      />

      {/* Summary strip */}
      {rounds.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total assigned', value: rounds.length, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
            { label: 'Pending marks', value: pending, color: pending > 0 ? 'text-amber-700' : 'text-slate-400', bg: pending > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200' },
            { label: 'Today\'s sessions', value: todayCount, color: todayCount > 0 ? 'text-brand-700' : 'text-slate-400', bg: todayCount > 0 ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200' },
          ].map((s) => (
            <div key={s.label} className={cn('rounded-xl border px-4 py-3', s.bg)}>
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips */}
      {rounds.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {chips.map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                  active ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {c.label}
                <span className={cn('rounded-full px-1.5 text-[10px] font-bold', active ? 'bg-white/20' : 'bg-white text-slate-500')}>
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title={filter === 'pending' ? 'All marks submitted' : filter === 'submitted' ? 'Nothing submitted yet' : 'No interviews assigned'}
          description={
            filter === 'all'
              ? 'When Corporate HR adds you to an interview panel, candidates appear here.'
              : filter === 'pending'
              ? 'You have submitted marks for all your assigned interviews.'
              : 'Submit your marks after conducting an interview.'
          }
        />
      ) : (
        <div className="space-y-4">
          {visible.map((r) => <InterviewCard key={r.id} round={r} />)}
        </div>
      )}
    </div>
  );
}

// ── Interview card ────────────────────────────────────────────────────────────

function InterviewCard({ round }: { round: MyInterviewRound }) {
  const submit = useSubmitEvaluation();
  const marked = Boolean(round.myEvaluation);
  const timing = getTimingLabel(round.scheduledAt);
  const cancelled = round.status === 'cancelled';

  const [scores, setScores] = useState<Record<string, number>>(
    round.myEvaluation?.scores ?? {},
  );
  const [comments, setComments] = useState(round.myEvaluation?.comments ?? '');

  const total    = round.criteria.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
  const maxTotal = round.criteria.reduce((s, c) => s + c.max, 0);
  const totalPct = maxTotal > 0 ? Math.round((total / maxTotal) * 1000) / 10 : 0;
  const complete = round.criteria.every((c) => typeof scores[c.key] === 'number');

  const save = () => {
    submit.mutate({ roundId: round.id, input: { scores, comments } });
  };

  // Left border accent color
  const accent = cancelled ? 'border-l-slate-300' : marked ? 'border-l-emerald-400' : timing?.urgent ? 'border-l-amber-400' : 'border-l-brand-400';

  return (
    <div className={cn('rounded-xl border border-slate-200 border-l-4 bg-white shadow-sm', accent)}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={round.candidate.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{round.candidate.name}</p>
            <p className="truncate text-xs text-slate-500 mt-0.5">
              {round.requisition.designation}
              <span className="mx-1.5 text-slate-300">·</span>
              {round.requisition.unit}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {timing?.urgent && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 animate-pulse">
              Today
            </span>
          )}
          {timing && !timing.urgent && (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              {timing.text}
            </span>
          )}
          <Badge tone="neutral">{cap(round.kind)} · {cap(round.mode)}</Badge>
          {cancelled  && <Badge tone="danger">Cancelled</Badge>}
          {marked     && <Badge tone="success"><CheckCircle2 className="mr-1 h-3 w-3" />Marked</Badge>}
        </div>
      </div>

      {/* Meta bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
          {round.scheduledAt ? formatDate(round.scheduledAt) : 'Time TBD'}
        </span>
        {round.meetLink ? (
          <a
            href={round.meetLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:underline"
          >
            <Video className="h-3.5 w-3.5" /> Join Google Meet
          </a>
        ) : round.location ? (
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-400" /> {round.location}
          </span>
        ) : null}
        <span className="text-slate-300">·</span>
        <span className="text-slate-400">{round.requisition.code}</span>
      </div>

      {/* Body */}
      <div className="space-y-4 px-5 py-4">

        {cancelled ? (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500 border border-slate-100">
            This interview was cancelled — no marks required.
          </p>
        ) : marked ? (
          <SubmittedSummary criteria={round.criteria} evaluation={round.myEvaluation!} />
        ) : (
          <>
            <CriteriaScoringSection
              criteria={round.criteria}
              scores={scores}
              onChange={(key, value) => setScores((p) => ({ ...p, [key]: value }))}
            />

            {/* Total */}
            <div className={cn(
              'rounded-xl border px-4 py-3',
              totalPct >= 70 ? 'bg-emerald-50 border-emerald-200' : totalPct >= 40 ? 'bg-brand-50 border-brand-200' : 'bg-amber-50 border-amber-200',
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">Total score</span>
                <span className={cn(
                  'text-lg font-bold',
                  totalPct >= 70 ? 'text-emerald-700' : totalPct >= 40 ? 'text-brand-700' : 'text-amber-700',
                )}>
                  {total.toFixed(1)}
                  <span className="text-sm font-normal text-slate-400"> / {maxTotal}</span>
                  <span className="ml-2 text-sm font-medium text-slate-500">{totalPct.toFixed(1)}%</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/70">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    totalPct >= 70 ? 'bg-emerald-500' : totalPct >= 40 ? 'bg-brand-500' : 'bg-amber-400',
                  )}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
            </div>

            <Textarea
              label="Overall comments"
              rows={2}
              placeholder="Strengths, concerns, overall impression…"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </>
        )}
      </div>

      {/* Footer */}
      {!cancelled && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-3">
          {marked ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
              <Lock className="h-3.5 w-3.5" /> Marks locked after submission
            </span>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                {complete ? 'Review before submitting — marks are final.' : 'Score all criteria to submit.'}
              </p>
              <Button onClick={save} isLoading={submit.isPending} disabled={!complete}>
                Submit marks
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Submitted summary ─────────────────────────────────────────────────────────

function SubmittedSummary({
  criteria,
  evaluation,
}: {
  criteria: MyInterviewRound['criteria'];
  evaluation: { scores: Record<string, number>; comments: string; total: number };
}) {
  const maxTotal = criteria.reduce((s, c) => s + c.max, 0);
  const pct      = maxTotal > 0 ? Math.round((evaluation.total / maxTotal) * 1000) / 10 : 0;

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 overflow-hidden">
      <p className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
        Your submitted marks
      </p>
      <div className="p-3">
        <CriteriaScoringSection criteria={criteria} scores={evaluation.scores} readOnly />
      </div>
      <div className="border-t border-emerald-100 bg-emerald-50/60 px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-500">Total</span>
          <span className="text-sm font-bold text-emerald-700">
            {evaluation.total.toFixed(1)} / {maxTotal}
            <span className="ml-1.5 text-xs font-normal text-slate-400">{pct.toFixed(1)}%</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/70">
          <div
            className={cn('h-full rounded-full', pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-brand-500' : 'bg-amber-400')}
            style={{ width: `${pct}%` }}
          />
        </div>
        {evaluation.comments && (
          <p className="mt-2.5 rounded-lg bg-white/60 px-3 py-2 text-xs italic text-slate-500">
            "{evaluation.comments}"
          </p>
        )}
      </div>
    </div>
  );
}

