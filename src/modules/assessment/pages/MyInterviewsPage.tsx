import { useState } from 'react';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Lock,
  MessageSquareText,
  Video,
} from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  EmptyState,
  FullPageSpinner,
  Input,
  PageHeader,
  Textarea,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import { useMyInterviews, useSubmitEvaluation } from '../hooks/useAssessment';
import type {
  InterviewQuestion,
  MyInterviewRound,
  RubricCriterionView,
} from '../types/assessment.types';

type Filter = 'all' | 'pending' | 'submitted';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function getTimingLabel(scheduledAt: string | null): { text: string; tone: 'warning' | 'brand' | 'neutral' } | null {
  if (!scheduledAt) return null;
  const d     = new Date(scheduledAt);
  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);
  if (d >= start && d <= end) return { text: 'Today', tone: 'warning' };
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  if (diff > 0) return { text: `In ${diff}d`, tone: 'brand' };
  return null;
}

export default function MyInterviewsPage() {
  const { data: rounds = [], isLoading } = useMyInterviews();
  const [filter, setFilter] = useState<Filter>('all');

  if (isLoading) return <FullPageSpinner label="Loading your interviews…" />;

  const pending   = rounds.filter((r) => !r.myEvaluation && r.status !== 'cancelled').length;
  const submitted = rounds.filter((r) => !!r.myEvaluation).length;

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

  const descParts: string[] = [];
  if (rounds.length > 0) {
    descParts.push(`${rounds.length} assigned`);
    if (pending > 0)   descParts.push(`${pending} pending marks`);
    if (submitted > 0) descParts.push(`${submitted} submitted`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Interviews"
        description={
          descParts.length > 0
            ? descParts.join(' · ')
            : 'Candidates you\'re on the panel for — score each after the session.'
        }
      />

      {/* Filter chips — same pattern as Requisitions page */}
      {rounds.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto">
          {chips.map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                  active
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {c.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] font-semibold',
                    active ? 'bg-white/20' : 'bg-white text-slate-500',
                  )}
                >
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
          title={
            filter === 'pending'   ? 'All marks submitted' :
            filter === 'submitted' ? 'Nothing submitted yet' :
            'No interviews assigned'
          }
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
          {visible.map((r) => (
            <InterviewCard key={r.id} round={r} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Interview card ────────────────────────────────────────────────────────────

function InterviewCard({ round }: { round: MyInterviewRound }) {
  const submit  = useSubmitEvaluation();
  const marked  = Boolean(round.myEvaluation);
  const timing  = getTimingLabel(round.scheduledAt);

  const [scores, setScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of round.rubric) {
      init[c.id] = round.myEvaluation?.scores?.[c.id] !== undefined
        ? String(round.myEvaluation.scores[c.id])
        : '';
    }
    return init;
  });
  const [comments, setComments] = useState(round.myEvaluation?.comments ?? '');
  const [qOpen, setQOpen]       = useState(false);

  const total    = round.rubric.reduce((s, c) => s + (Number(scores[c.id]) || 0), 0);
  const maxTotal = round.rubric.reduce((s, c) => s + c.maxScore, 0);
  const totalPct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  const save = () => {
    const numScores: Record<string, number> = {};
    for (const c of round.rubric) numScores[c.id] = Number(scores[c.id]) || 0;
    submit.mutate({ roundId: round.id, input: { scores: numScores, comments } });
  };

  return (
    <Card>
      {/* ── Header ── */}
      <CardHeader>
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={round.candidate.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {round.candidate.name}
            </p>
            <p className="truncate text-xs text-slate-500">
              {round.requisition.designation}
              <span className="mx-1 text-slate-300">·</span>
              {round.requisition.code}
              <span className="mx-1 text-slate-300">·</span>
              {round.requisition.unit}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {timing && <Badge tone={timing.tone}>{timing.text}</Badge>}
          <Badge tone="neutral">{cap(round.kind)} · {cap(round.mode)}</Badge>
          {round.status === 'cancelled' && <Badge tone="danger">Cancelled</Badge>}
          {marked && (
            <Badge tone="success">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Marked
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* ── Meta row ── */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {round.scheduledAt ? formatDate(round.scheduledAt) : 'Time TBD'}
          </span>
          {round.meetLink ? (
            <a
              href={round.meetLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-emerald-600 hover:underline"
            >
              <Video className="h-3.5 w-3.5" /> Join Google Meet
            </a>
          ) : round.location ? (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {round.location}
            </span>
          ) : null}
        </div>

        {/* ── Questions ── */}
        {(round.interviewQuestions?.length ?? 0) > 0 && (
          <QuestionsBlock
            questions={round.interviewQuestions}
            open={qOpen}
            onToggle={() => setQOpen((v) => !v)}
          />
        )}

        {/* ── Cancelled ── */}
        {round.status === 'cancelled' && (
          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
            This interview was cancelled — no marks required.
          </p>
        )}

        {/* ── Scoring ── */}
        {round.status !== 'cancelled' && (
          <>
            {round.rubric.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                No rubric set yet — ask Corporate HR to add scoring criteria.
              </p>
            ) : marked ? (
              <SubmittedSummary rubric={round.rubric} evaluation={round.myEvaluation!} />
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Your scores
                </p>
                <div className="space-y-3">
                  {round.rubric.map((c) => (
                    <CriterionRow
                      key={c.id}
                      criterion={c}
                      value={scores[c.id] ?? ''}
                      onChange={(v) => setScores((p) => ({ ...p, [c.id]: v }))}
                    />
                  ))}
                </div>

                {/* Total bar */}
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-500">Total</span>
                    <span className="text-sm font-bold text-slate-800">
                      {total}
                      <span className="text-xs font-normal text-slate-400"> / {maxTotal}</span>
                      <span className="ml-2 text-xs text-slate-400">{totalPct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-200',
                        totalPct >= 70 ? 'bg-emerald-500' : totalPct >= 40 ? 'bg-brand-500' : 'bg-amber-400',
                      )}
                      style={{ width: `${totalPct}%` }}
                    />
                  </div>
                </div>

                <Textarea
                  label="Comments"
                  rows={2}
                  placeholder="Overall impression, strengths, concerns…"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </>
            )}
          </>
        )}
      </CardBody>

      {/* ── Footer ── */}
      {round.status !== 'cancelled' && round.rubric.length > 0 && (
        <CardFooter className="flex items-center justify-between gap-3">
          {marked ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <Lock className="h-3.5 w-3.5" /> Submitted — marks locked
            </span>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                Marks are final once submitted — review before confirming.
              </p>
              <Button onClick={save} isLoading={submit.isPending}>
                Submit marks
              </Button>
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

// ── Criterion row ─────────────────────────────────────────────────────────────

function CriterionRow({
  criterion,
  value,
  onChange,
}: {
  criterion: RubricCriterionView;
  value: string;
  onChange: (v: string) => void;
}) {
  const num = Number(value) || 0;
  const pct = criterion.maxScore > 0 ? Math.min(100, Math.round((num / criterion.maxScore) * 100)) : 0;

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm text-slate-700">{criterion.label}</span>
        <div className="w-20 shrink-0">
          <Input
            type="number"
            min={0}
            max={criterion.maxScore}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-xs text-slate-400">/ {criterion.maxScore}</span>
      </div>
      <div className="mt-1.5 ml-0 h-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-150',
            pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-brand-400' : pct > 0 ? 'bg-amber-400' : '',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Submitted read-only summary ───────────────────────────────────────────────

function SubmittedSummary({
  rubric,
  evaluation,
}: {
  rubric: RubricCriterionView[];
  evaluation: { scores: Record<string, number>; comments: string; total: number };
}) {
  const maxTotal = rubric.reduce((s, c) => s + c.maxScore, 0);
  const pct      = maxTotal > 0 ? Math.round((evaluation.total / maxTotal) * 100) : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60">
      <p className="border-b border-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Your submitted marks
      </p>
      <div className="space-y-2.5 px-4 py-3">
        {rubric.map((c) => {
          const score = evaluation.scores?.[c.id] ?? 0;
          const cpct  = c.maxScore > 0 ? Math.round((score / c.maxScore) * 100) : 0;
          return (
            <div key={c.id} className="flex items-center gap-3">
              <span className="flex-1 min-w-0 truncate text-sm text-slate-600">{c.label}</span>
              <span className="w-16 shrink-0 text-right text-sm font-semibold text-slate-800">
                {score}
                <span className="text-xs font-normal text-slate-400"> /{c.maxScore}</span>
              </span>
              <div className="w-24 h-1.5 shrink-0 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    'h-full rounded-full',
                    cpct >= 70 ? 'bg-emerald-400' : cpct >= 40 ? 'bg-brand-400' : 'bg-amber-400',
                  )}
                  style={{ width: `${cpct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-100 px-4 py-2.5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs font-semibold text-slate-500">Total</span>
          <span className="text-sm font-bold text-slate-800">
            {evaluation.total} / {maxTotal}
            <span className="ml-1.5 text-xs font-normal text-slate-400">{pct}%</span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn(
              'h-full rounded-full',
              pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-brand-500' : 'bg-amber-400',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {evaluation.comments && (
          <p className="mt-2 text-xs italic text-slate-500">"{evaluation.comments}"</p>
        )}
      </div>
    </div>
  );
}

// ── Questions block ───────────────────────────────────────────────────────────

function QuestionsBlock({
  questions,
  open,
  onToggle,
}: {
  questions: InterviewQuestion[];
  open: boolean;
  onToggle: () => void;
}) {
  const groups = new Map<string, string[]>();
  for (const q of questions) {
    const a = groups.get(q.category) ?? [];
    a.push(q.question);
    groups.set(q.category, a);
  }

  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-violet-700"
      >
        <span className="flex items-center gap-1.5">
          <MessageSquareText className="h-4 w-4" />
          Interview questions ({questions.length})
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-violet-100 px-3 pb-3 pt-2.5">
          {[...groups.entries()].map(([cat, qs]) => (
            <div key={cat}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-500">
                {cat}
              </p>
              <ul className="space-y-1">
                {qs.map((q, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-slate-600">
                    <span className="text-slate-300">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
