import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Send,
} from 'lucide-react';

import { cn } from '@shared/lib';
import { Spinner } from '@shared/components/ui';

import { usePublicEval, useSubmitPublicEval } from '../hooks/useAssessment';
import type { RecommendationKey } from '../types/assessment.types';
import { CriteriaScoringSection } from '../components/CriteriaScoringSection';
import { CandidateRail } from '../components/CandidateRail';
import { RecommendationPicker } from '../components/RecommendationPicker';
import { recommendationLabel, recommendationTone } from '../components/recommendation';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function pctColors(pct: number) {
  if (pct >= 70) return { bar: 'bg-emerald-500', border: 'border-l-emerald-400', text: 'text-emerald-600', fill: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' };
  if (pct >= 40) return { bar: 'bg-amber-400', border: 'border-l-amber-400', text: 'text-amber-600', fill: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700' };
  if (pct > 0)   return { bar: 'bg-rose-400', border: 'border-l-rose-300', text: 'text-rose-500', fill: 'bg-rose-400', badge: 'bg-rose-50 text-rose-700' };
  return { bar: 'bg-slate-300', border: 'border-l-slate-200', text: 'text-slate-400', fill: 'bg-slate-200', badge: 'bg-slate-100 text-slate-500' };
}

// ---------------------------------------------------------------------------
// main page
// ---------------------------------------------------------------------------

/**
 * One interviewer's marks, opened from an emailed link (no login).
 *
 * Laid out as two columns on a desktop — who the candidate is on the left,
 * what you think of them on the right — because those are two different
 * activities and the marker does them together. The left column carries the
 * CV as facts (`CandidateBriefCard`) as well as the document: a panelist
 * between two sessions reads a summary, not a PDF. On a phone it stacks, with
 * the running total and the submit button pinned to the bottom.
 */
export default function EvaluateByTokenPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isLoading, isError, error } = usePublicEval(token);
  const submit = useSubmitPublicEval(token);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [recommendation, setRecommendation] = useState<RecommendationKey | null>(null);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // --- loading ---
  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-24">
          <Spinner />
          <p className="text-sm text-slate-500">Loading your evaluation form…</p>
        </div>
      </Shell>
    );
  }

  // --- error / expired ---
  if (isError || !data) {
    const msg = (error as { message?: string } | null)?.message ?? 'This evaluation link is invalid or has expired.';
    return (
      <Shell>
        <div className="mx-auto max-w-sm py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Link unavailable</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{msg}</p>
          <p className="mt-5 text-xs text-slate-400">Please contact HR to request a new evaluation link.</p>
        </div>
      </Shell>
    );
  }

  // --- already submitted ---
  if (submitted || data.alreadySubmitted) {
    const ev = data.submittedEval;
    const maxTotal = data.criteria.reduce((s, c) => s + c.max, 0);
    const total = ev?.total ?? 0;
    const totalPct = maxTotal > 0 ? Math.round((total / maxTotal) * 1000) / 10 : 0;
    const colors = pctColors(totalPct);

    return (
      <Shell>
        <div className="mx-auto max-w-md space-y-5 py-10">
          {/* success hero */}
          <div className="flex flex-col items-center rounded-3xl bg-emerald-600 px-6 py-10 text-center text-white shadow-lg shadow-emerald-200">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <CheckCircle2 className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Evaluation submitted!</h2>
            <p className="mt-2 text-sm text-emerald-100">
              Thank you, <span className="font-semibold text-white">{data.panelistName}</span>. Your marks for{' '}
              <span className="font-semibold text-white">{data.candidate.name}</span> have been recorded.
            </p>
            {ev && (
              <div className={cn('mt-5 rounded-full px-5 py-2 text-sm font-bold', colors.badge)}>
                {total.toFixed(1)} / {maxTotal} &nbsp;·&nbsp; {totalPct.toFixed(1)}%
              </div>
            )}
          </div>

          {ev?.recommendation && (
            <div
              className={cn(
                'flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5 ring-1',
                recommendationTone(ev.recommendation),
              )}
            >
              <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                Your recommendation
              </span>
              <span className="text-sm font-bold">
                {recommendationLabel(ev.recommendation)}
              </span>
            </div>
          )}

          {ev && (
            <CriteriaScoringSection criteria={data.criteria} scores={ev.scores} readOnly />
          )}

          {ev?.comments && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">Your comments</p>
              <p className="text-sm italic leading-relaxed text-slate-600">"{ev.comments}"</p>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // --- main form ---
  const maxTotal = data.criteria.reduce((s, c) => s + c.max, 0);
  const currentTotal = data.criteria.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
  const pct = maxTotal > 0 ? Math.round((currentTotal / maxTotal) * 1000) / 10 : 0;
  const totalColors = pctColors(pct);

  const answeredCount = data.criteria.filter((c) => typeof scores[c.key] === 'number').length;
  const complete = answeredCount === data.criteria.length;
  // The recommendation is part of the sheet, not an extra: a scorecard that
  // reaches the recruiter with no verdict is the thing it was added to stop.
  const canSubmit = !submit.isPending && complete && recommendation !== null;

  const handleSubmit = () => {
    if (!recommendation) return;
    submit.mutate(
      { scores, comments: comments.trim() || undefined, recommendation },
      { onSuccess: () => setSubmitted(true) },
    );
  };

  return (
    <Shell
      wide
      aside={
        <p className="truncate text-right text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{data.candidate.name}</span>
          <span className="mx-2 text-slate-300">|</span>
          {data.interview.designation}
        </p>
      }
    >
      {/*
        Candidate pinned, marking scrolls.

        This was a two-column grid with the candidate in a sticky left rail.
        On a laptop that rail ran out after about 900px while the scoring
        column carried on for three thousand more, so two thirds of the left
        half of the screen sat empty — and the candidate's name and job title
        were both truncated to fit a 22rem column the page had ample room to
        widen.

        Now the candidate is a band across the top that stays put while the
        ten criteria move under it, which is the shape of the task: one
        person, ten judgements. The detail behind the band — every degree,
        every post — is a disclosure rather than a permanent fixture, because
        a pinned panel deep enough to hold a full CV leaves nothing to mark in.

        Below `lg` nothing is pinned: on a phone a fixed band would eat a
        third of the viewport, so the band scrolls away with the page and the
        action bar at the foot keeps the score and the submit within reach.
      */}
      <div className="pb-32 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-5">
        <CandidateRail
          name={data.candidate.name}
          designation={data.interview.designation}
          unit={data.interview.unit}
          kind={data.interview.kind}
          mode={data.interview.mode}
          scheduledAt={data.interview.scheduledAt}
          location={data.interview.location}
          markerName={data.panelistName}
          cvUrl={data.candidate.cvUrl}
          brief={data.candidate.brief}
        />

        <div className="mt-4 space-y-4 lg:mt-0">
          <CriteriaScoringSection
            criteria={data.criteria}
            scores={scores}
            onChange={(key, value) => setScores((prev) => ({ ...prev, [key]: value }))}
          />

          <RecommendationPicker value={recommendation} onChange={setRecommendation} />

          {/* Comments. The running total used to be repeated here in a card of
              its own, a third copy alongside the progress header and the phone
              bar; the action bar now owns it on every screen. */}
          <div className="animate-card-in overflow-hidden rounded-2xl border border-slate-300 bg-white [animation-delay:200ms]">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Comments</p>
              <span className="ml-auto text-xs text-slate-400">Optional</span>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <textarea
                rows={4}
                placeholder="Overall impression, strengths, areas of concern, hiring recommendation…"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                maxLength={2000}
                className="w-full resize-none bg-transparent text-sm leading-relaxed text-slate-800 placeholder-slate-400 outline-none"
              />
              <p className="mt-1 text-right text-[0.625rem] text-slate-300">{comments.length} / 2000</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action bar ─────────────────────────────────────────────────────
          One bar, every screen. Submitting used to live at the foot of a
          3,000px column on a desktop and in a separate phone-only bar with
          its own copy of the total — two implementations of one control, and
          on a laptop you had to scroll past ten criteria and a comment box to
          find out whether you were allowed to press it. */}
      <div className="animate-card-in fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[92rem] flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-safe pt-3 sm:px-6 sm:py-3.5">
          {/* Score + progress. Reads as one sentence so it survives being
              squeezed onto a phone. */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn('text-xl font-extrabold tabular-nums leading-none sm:text-2xl', totalColors.text)}>
                {currentTotal.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ {maxTotal}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-bold', totalColors.badge)}>
                {pct.toFixed(1)}%
              </span>
              <span className="ml-auto shrink-0 text-xs text-slate-500 sm:ml-2">
                {answeredCount} of {data.criteria.length} scored
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full transition-all duration-300', totalColors.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="w-full shrink-0 sm:w-auto">
            <SubmitButton canSubmit={canSubmit} pending={submit.isPending} onSubmit={handleSubmit} />
            {!canSubmit && !submit.isPending && (
              <p className="mt-1.5 text-center text-[0.6875rem] text-slate-400">
                {!complete
                  ? `Score all ${data.criteria.length} criteria to submit`
                  : 'Choose a recommendation to submit'}
              </p>
            )}
            {submit.isError && (
              <p className="mt-1.5 text-center text-[0.6875rem] font-medium text-rose-600">
                {(submit.error as { message?: string })?.message ?? 'Submission failed.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// sub-components
// ---------------------------------------------------------------------------

function SubmitButton({ canSubmit, pending, onSubmit }: { canSubmit: boolean; pending: boolean; onSubmit: () => void }) {
  return (
    <button
      type="button"
      disabled={!canSubmit}
      onClick={onSubmit}
      className={cn(
        // Fixed minimum width on a desktop so the bar does not reflow as the
        // label changes, full width on a phone where it is the only control.
        'flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold transition-all duration-200 sm:w-auto sm:min-w-[15rem]',
        canSubmit
          ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 hover:shadow-brand-600/35 active:scale-[0.98] active:bg-brand-800'
          : 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none',
      )}
    >
      {pending ? (
        <>
          <Spinner />
          Submitting…
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          Submit Evaluation
        </>
      )}
    </button>
  );
}

/**
 * The page frame.
 *
 * `wide` for the marking view, which is two columns; the loading, expired and
 * thank-you states stay narrow, because a single short message centred in a
 * wide column reads as a mistake.
 *
 * The marking view was capped at `max-w-5xl` — on a 1440px laptop that left
 * a third of the screen as empty grey on either side while the scoring column
 * ran to 3,000px, and the sticky left rail bottomed out with 800px of nothing
 * under it. `aside` is the context strip: on anything narrower than a laptop
 * it drops out of the bar and reappears in the page body.
 */
function Shell({
  children,
  wide,
  aside,
}: {
  children: React.ReactNode;
  wide?: boolean;
  aside?: React.ReactNode;
}) {
  // The marking view runs as wide as a large monitor will give it. Capped at
  // 92rem so it stops short of a cinema screen, but on a 1,440px laptop that
  // is effectively edge to edge — the previous 72rem cap left ~300px of dead
  // grey down each side of the page.
  const width = wide ? 'max-w-[92rem]' : 'max-w-2xl';
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className={cn('mx-auto flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8', width)}>
          <img
            src="/logo.png"
            alt="DBL"
            className="h-7 w-auto shrink-0 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="h-4 w-px shrink-0 bg-slate-200" />
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Interview Evaluation
          </span>
          {aside && <div className="ml-auto hidden min-w-0 lg:block">{aside}</div>}
        </div>
      </header>
      <main className={cn('mx-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8', width)}>{children}</main>
    </div>
  );
}
