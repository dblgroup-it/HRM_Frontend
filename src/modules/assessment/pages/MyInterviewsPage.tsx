import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Lock,
  MessageSquare,
  Send,
  Video,
} from 'lucide-react';

import {
  Avatar,
  EmptyState,
  FullPageSpinner,
  PageHeader,
  Pagination,
} from '@shared/components/ui';
import { cn } from '@shared/lib';

import { useMyInterviews, useSubmitEvaluation } from '../hooks/useAssessment';
import { CriteriaScoringSection } from '../components/CriteriaScoringSection';
import { RecommendationPicker } from '../components/RecommendationPicker';
import { CandidateRail } from '../components/CandidateRail';
import {
  recommendationLabel,
  recommendationTone,
} from '../components/recommendation';
import type {
  MyInterviewRound,
  RecommendationKey,
} from '../types/assessment.types';

type Filter = 'pending' | 'today' | 'submitted' | 'all';

/** Enough rows to scan a screenful. */
const PAGE_SIZE = 12;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const isPending = (r: MyInterviewRound) => !r.myEvaluation && r.status !== 'cancelled';
const isToday = (r: MyInterviewRound) =>
  Boolean(r.scheduledAt) && new Date(r.scheduledAt!).toDateString() === new Date().toDateString();

function whenLabel(iso: string | null): { text: string; tone: 'today' | 'soon' | 'past' | 'none' } {
  if (!iso) return { text: 'Time to be set', tone: 'none' };
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (d.toDateString() === now.toDateString()) return { text: `Today, ${time}`, tone: 'today' };
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return { text: `Tomorrow, ${time}`, tone: 'soon' };
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return { text: `${date}, ${time}`, tone: d < now ? 'past' : 'soon' };
}

function pctTone(pct: number) {
  if (pct >= 70) return { text: 'text-emerald-600', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' };
  if (pct >= 40) return { text: 'text-amber-600', bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700' };
  if (pct > 0) return { text: 'text-rose-500', bar: 'bg-rose-400', badge: 'bg-rose-50 text-rose-700' };
  return { text: 'text-slate-400', bar: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500' };
}

/**
 * The interviews I sit on as a panelist.
 *
 * A list first, then one candidate at a time on the same two-pane sheet the
 * emailed evaluation link opens: the candidate on the left, the ten criteria,
 * the verdict and the comments on the right, and one action bar. It used to
 * stack every interview's brief, scoring and verdict into one long card each,
 * so a panelist with six interviews scrolled past five of them to mark one.
 *
 * The open interview is in the URL (`?round=`), so Back returns to the list
 * and a link can point straight at one.
 */
export default function MyInterviewsPage() {
  const { data: rounds = [], isLoading } = useMyInterviews();
  const [params, setParams] = useSearchParams();
  const openId = params.get('round');
  const open = openId ? rounds.find((r) => r.id === openId) : undefined;

  const openRound = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('round', id);
    else next.delete('round');
    setParams(next);
  };

  if (isLoading) return <FullPageSpinner label="Loading your interviews…" />;

  if (open) {
    const nextPending = rounds.find((r) => r.id !== open.id && isPending(r));
    return (
      <EvaluationSheet
        key={open.id}
        round={open}
        onBack={() => openRound(null)}
        onNext={nextPending ? () => openRound(nextPending.id) : undefined}
      />
    );
  }

  return <InterviewList rounds={rounds} onOpen={openRound} />;
}

// ── The list ─────────────────────────────────────────────────────────────────

function InterviewList({
  rounds,
  onOpen,
}: {
  rounds: MyInterviewRound[];
  onOpen: (id: string) => void;
}) {
  const pendingCount = rounds.filter(isPending).length;
  const todayCount = rounds.filter(isToday).length;
  const submittedCount = rounds.filter((r) => r.myEvaluation).length;

  // Land on what needs doing; if nothing does, show everything.
  const [filter, setFilter] = useState<Filter>(pendingCount ? 'pending' : 'all');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [filter]);

  const visible = useMemo(() => {
    const list = rounds.filter((r) =>
      filter === 'pending'
        ? isPending(r)
        : filter === 'today'
          ? isToday(r)
          : filter === 'submitted'
            ? Boolean(r.myEvaluation)
            : true,
    );
    // Soonest first for work still to do; most recent first once done.
    const t = (r: MyInterviewRound) => (r.scheduledAt ? new Date(r.scheduledAt).getTime() : Infinity);
    return [...list].sort((a, b) => (filter === 'submitted' ? t(b) - t(a) : t(a) - t(b)));
  }, [rounds, filter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const tabs: { key: Filter; label: string; count: number; attention?: boolean }[] = [
    { key: 'pending', label: 'To mark', count: pendingCount, attention: pendingCount > 0 },
    { key: 'today', label: 'Today', count: todayCount },
    { key: 'submitted', label: 'Submitted', count: submittedCount },
    { key: 'all', label: 'All', count: rounds.length },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Interviews"
        description="Interviews you sit on as a panelist. Open one to score the candidate and give your recommendation."
      />

      {rounds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100/80 p-1 sm:inline-flex">
          {tabs.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition',
                  active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'min-w-[1.25rem] rounded-full px-1.5 text-center text-[0.6875rem] font-bold tabular-nums',
                    t.attention
                      ? 'bg-amber-500 text-white'
                      : active
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-white/70 text-slate-500',
                  )}
                >
                  {t.count}
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
            rounds.length === 0
              ? 'No interviews assigned'
              : filter === 'pending'
                ? 'Nothing left to mark'
                : filter === 'today'
                  ? 'No interviews today'
                  : 'Nothing submitted yet'
          }
          description={
            rounds.length === 0
              ? 'When Head of Talent Acquisition adds you to an interview panel, it appears here.'
              : filter === 'pending'
                ? 'You have submitted marks for every interview assigned to you.'
                : 'Try another tab.'
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* Column heads — desktop only; each row stands on its own on a phone. */}
            <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_1.5rem] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400 md:grid">
              <span>Candidate</span>
              <span>When</span>
              <span>Interview</span>
              <span>Your marks</span>
              <span />
            </div>
            <ul className="divide-y divide-slate-100">
              {paged.map((r) => (
                <InterviewRow key={r.id} round={r} onOpen={() => onOpen(r.id)} />
              ))}
            </ul>
          </div>
          {visible.length > PAGE_SIZE && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={visible.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function InterviewRow({ round, onOpen }: { round: MyInterviewRound; onOpen: () => void }) {
  const when = whenLabel(round.scheduledAt);
  const cancelled = round.status === 'cancelled';
  const ev = round.myEvaluation;
  const max = round.criteria.reduce((s, c) => s + c.max, 0);
  const pct = ev && max > 0 ? Math.round((ev.total / max) * 1000) / 10 : 0;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:px-5',
          'md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_1.5rem]',
          cancelled && 'opacity-60',
        )}
      >
        {/* Candidate */}
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={round.candidate.name} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">
              {round.candidate.name}
            </span>
            <span className="block truncate text-xs text-slate-500">
              {round.requisition.designation} · {round.requisition.unit}
            </span>
          </span>
        </span>

        {/* Status, on a phone, sits beside the name. */}
        <span className="md:hidden">
          <StatusPill round={round} pct={pct} />
        </span>

        {/* When */}
        <span className="col-span-2 flex min-w-0 items-center gap-1.5 text-xs md:col-span-1">
          <CalendarClock
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              when.tone === 'today' ? 'text-amber-500' : 'text-slate-400',
            )}
          />
          <span
            className={cn(
              'truncate',
              when.tone === 'today' ? 'font-semibold text-amber-700' : 'text-slate-600',
            )}
          >
            {when.text}
          </span>
        </span>

        {/* Interview */}
        <span className="hidden min-w-0 items-center gap-1.5 text-xs text-slate-600 md:flex">
          {round.mode === 'online' ? (
            <Video className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          ) : (
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          )}
          <span className="truncate">
            {cap(round.kind)} · {round.mode === 'online' ? 'Online' : round.location || 'In person'}
          </span>
        </span>

        {/* Your marks */}
        <span className="hidden md:block">
          <StatusPill round={round} pct={pct} />
        </span>

        <ChevronRight className="hidden h-4 w-4 text-slate-300 md:block" />
      </button>
    </li>
  );
}

function StatusPill({ round, pct }: { round: MyInterviewRound; pct: number }) {
  const ev = round.myEvaluation;
  if (round.status === 'cancelled') {
    return <span className="text-xs font-medium text-slate-400">Cancelled</span>;
  }
  if (!ev) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        To mark
      </span>
    );
  }
  const max = round.criteria.reduce((s, c) => s + c.max, 0);
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold tabular-nums', pctTone(pct).badge)}>
        {ev.total.toFixed(1)}/{max}
      </span>
      {ev.recommendation && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1',
            recommendationTone(ev.recommendation),
          )}
        >
          {recommendationLabel(ev.recommendation)}
        </span>
      )}
    </span>
  );
}

// ── One interview: the two-pane sheet ────────────────────────────────────────

function EvaluationSheet({
  round,
  onBack,
  onNext,
}: {
  round: MyInterviewRound;
  onBack: () => void;
  /** The next interview still to mark, if any — offered once this one is in. */
  onNext?: () => void;
}) {
  const submit = useSubmitEvaluation();
  const ev = round.myEvaluation;
  const cancelled = round.status === 'cancelled';
  const readOnly = Boolean(ev) || cancelled;

  const [scores, setScores] = useState<Record<string, number>>(ev?.scores ?? {});
  const [comments, setComments] = useState(ev?.comments ?? '');
  const [recommendation, setRecommendation] = useState<RecommendationKey | null>(
    ev?.recommendation ?? null,
  );

  const max = round.criteria.reduce((s, c) => s + c.max, 0);
  const shownScores = ev?.scores ?? scores;
  const total = ev?.total ?? round.criteria.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
  const pct = max > 0 ? Math.round((total / max) * 1000) / 10 : 0;
  const tone = pctTone(pct);
  const answered = round.criteria.filter((c) => typeof shownScores[c.key] === 'number').length;
  const scored = answered === round.criteria.length;
  const canSubmit = !readOnly && scored && recommendation !== null && !submit.isPending;

  const save = () => {
    if (!recommendation) return;
    submit.mutate({
      roundId: round.id,
      input: { scores, comments: comments.trim() || undefined, recommendation },
    });
  };

  return (
    <div className="space-y-4">
      {/* Where you are, and the way back. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> My interviews
        </button>
        <span className="text-xs text-slate-400">{round.requisition.code}</span>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-5">
        <CandidateRail
          name={round.candidate.name}
          designation={round.requisition.designation}
          unit={round.requisition.unit}
          kind={round.kind}
          mode={round.mode}
          scheduledAt={round.scheduledAt}
          location={round.location}
          cvUrl={round.candidate.cvUrl}
          brief={round.candidate.brief}
          stickyClassName="lg:top-0"
        />

        <div className="mt-4 space-y-4 lg:mt-0">
          {cancelled && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              This interview was cancelled, so no marks are needed.
            </p>
          )}
          {round.meetLink && !readOnly && (
            <a
              href={round.meetLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <Video className="h-4 w-4" /> Join Google Meet
            </a>
          )}

          {ev && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Your marks are in
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
                <Lock className="h-3.5 w-3.5" /> Locked after submission
              </span>
            </div>
          )}

          {!cancelled && (
            <>
              <CriteriaScoringSection
                criteria={round.criteria}
                scores={shownScores}
                readOnly={readOnly}
                onChange={(key, value) => setScores((p) => ({ ...p, [key]: value }))}
              />

              {readOnly ? (
                ev?.recommendation && (
                  <div
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 ring-1',
                      recommendationTone(ev.recommendation),
                    )}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                      You recommended
                    </span>
                    <span className="text-sm font-bold">{recommendationLabel(ev.recommendation)}</span>
                  </div>
                )
              ) : (
                <RecommendationPicker value={recommendation} onChange={setRecommendation} />
              )}

              {(!readOnly || ev?.comments) && (
                <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">Comments</p>
                    {!readOnly && <span className="ml-auto text-xs text-slate-400">Optional</span>}
                  </div>
                  <div className="px-4 py-4 sm:px-5">
                    {readOnly ? (
                      <p className="text-sm italic leading-relaxed text-slate-600">
                        &ldquo;{ev?.comments}&rdquo;
                      </p>
                    ) : (
                      <textarea
                        rows={4}
                        placeholder="Overall impression, strengths, concerns…"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        maxLength={2000}
                        className="w-full resize-none bg-transparent text-sm leading-relaxed text-slate-800 placeholder-slate-400 outline-none"
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* One action bar: score, progress and submit, pinned to the foot of
          the content while the criteria scroll. */}
      {!cancelled && (
        <div className="sticky bottom-[4.75rem] z-20 rounded-2xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur lg:bottom-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={cn('text-xl font-extrabold tabular-nums leading-none sm:text-2xl', tone.text)}>
                  {total.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-slate-400">/ {max}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-bold', tone.badge)}>
                  {pct.toFixed(1)}%
                </span>
                <span className="ml-auto shrink-0 text-xs text-slate-500 sm:ml-2">
                  {answered} of {round.criteria.length} scored
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', tone.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {readOnly ? (
              onNext && (
                <button
                  type="button"
                  onClick={onNext}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 sm:w-auto"
                >
                  Next to mark <ChevronRight className="h-4 w-4" />
                </button>
              )
            ) : (
              <div className="w-full shrink-0 sm:w-auto">
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={save}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-bold transition-all sm:w-auto sm:min-w-[14rem]',
                    canSubmit
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 active:scale-[0.98]'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500',
                  )}
                >
                  <Send className="h-4 w-4" />
                  {submit.isPending ? 'Submitting…' : 'Submit marks'}
                </button>
                {!canSubmit && !submit.isPending && (
                  <p className="mt-1.5 text-center text-[0.6875rem] text-slate-400">
                    {!scored
                      ? `Score all ${round.criteria.length} criteria to submit`
                      : 'Choose a recommendation to submit'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
