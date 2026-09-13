import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  MessageSquare,
  Send,
  Video,
} from 'lucide-react';

import { cn } from '@shared/lib';
import { Spinner } from '@shared/components/ui';

import { usePublicEval, useSubmitPublicEval } from '../hooks/useAssessment';
import { CriteriaScoringSection } from '../components/CriteriaScoringSection';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDate(iso: string | null) {
  if (!iso) return 'Time TBD';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

function pctColors(pct: number) {
  if (pct >= 70) return { bar: 'bg-emerald-500', border: 'border-l-emerald-400', text: 'text-emerald-600', fill: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' };
  if (pct >= 40) return { bar: 'bg-amber-400', border: 'border-l-amber-400', text: 'text-amber-600', fill: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700' };
  if (pct > 0)   return { bar: 'bg-rose-400', border: 'border-l-rose-300', text: 'text-rose-500', fill: 'bg-rose-400', badge: 'bg-rose-50 text-rose-700' };
  return { bar: 'bg-slate-300', border: 'border-l-slate-200', text: 'text-slate-400', fill: 'bg-slate-200', badge: 'bg-slate-100 text-slate-500' };
}

// ---------------------------------------------------------------------------
// main page
// ---------------------------------------------------------------------------

export default function EvaluateByTokenPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isLoading, isError, error } = usePublicEval(token);
  const submit = useSubmitPublicEval(token);

  const [scores, setScores] = useState<Record<string, number>>({});
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

  const complete = data.criteria.every((c) => typeof scores[c.key] === 'number');
  const canSubmit = !submit.isPending && complete;

  const handleSubmit = () =>
    submit.mutate(
      { scores, comments: comments.trim() || undefined },
      { onSuccess: () => setSubmitted(true) },
    );

  return (
    <Shell>
      {/* ── main content ── */}
      <div className="mx-auto max-w-lg space-y-4 pb-36 sm:pb-10">

        {/* ① Candidate card */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/60">
          {/* blue accent band */}
          <div className="h-2 bg-gradient-to-r from-brand-500 to-brand-700" />

          <div className="px-6 pb-6 pt-5">
            {/* Avatar + name */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-sm">
                {initials(data.candidate.name)}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="truncate text-xl font-bold text-slate-900">{data.candidate.name}</h2>
                <p className="mt-0.5 truncate text-sm text-slate-500">{data.interview.designation}</p>
                {data.interview.unit && (
                  <p className="truncate text-xs text-slate-400">{data.interview.unit}</p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {cap(data.interview.kind)}
              </span>
            </div>

            {/* The CV, one click away. A panelist on the token path has no
                login and no candidate page, so without this they are scoring
                someone whose background they cannot check. */}
            {data.candidate.cvUrl && (
              <a
                href={data.candidate.cvUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-brand-100">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-brand-800">
                    View CV
                  </span>
                  <span className="block text-xs text-brand-600/80">
                    Opens {data.candidate.name}'s CV in a new tab
                  </span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-brand-500" />
              </a>
            )}

            {/* Meta pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill icon={<CalendarClock className="h-3.5 w-3.5" />}>
                {fmtDate(data.interview.scheduledAt)}
              </Pill>
              {data.interview.mode === 'online' ? (
                <Pill icon={<Video className="h-3.5 w-3.5 text-emerald-500" />}>
                  <span className="text-emerald-700">Online interview</span>
                </Pill>
              ) : data.interview.location ? (
                <Pill icon={<MapPin className="h-3.5 w-3.5" />}>{data.interview.location}</Pill>
              ) : null}
            </div>

            {/* Evaluator */}
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <p className="text-xs text-slate-500">
                Evaluating as{' '}
                <span className="font-semibold text-slate-700">{data.panelistName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ③ Scoring */}
        <CriteriaScoringSection
          criteria={data.criteria}
          scores={scores}
          onChange={(key, value) => setScores((prev) => ({ ...prev, [key]: value }))}
        />

        {/* Total (desktop) */}
        <div className="rounded-2xl bg-white px-6 py-5 ring-1 ring-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">Total score</p>
            <p className={cn('text-2xl font-extrabold tabular-nums', totalColors.text)}>
              {currentTotal.toFixed(1)}
              <span className="ml-1 text-base font-semibold text-slate-300">/ {maxTotal}</span>
              <span className={cn('ml-3 rounded-full px-3 py-0.5 text-sm font-bold', totalColors.badge)}>
                {pct.toFixed(1)}%
              </span>
            </p>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full transition-all duration-300', totalColors.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* ④ Comments */}
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/60 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Comments</p>
            <span className="ml-auto text-xs text-slate-400">Optional</span>
          </div>
          <div className="px-5 py-4">
            <textarea
              rows={4}
              placeholder="Overall impression, strengths, areas of concern, hiring recommendation…"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              maxLength={2000}
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-slate-800 placeholder-slate-300 outline-none"
            />
            <p className="mt-1 text-right text-[0.625rem] text-slate-300">{comments.length} / 2000</p>
          </div>
        </div>

        {/* ⑤ Submit (desktop) */}
        <div className="hidden sm:block">
          <SubmitButton canSubmit={canSubmit} pending={submit.isPending} onSubmit={handleSubmit} />
          {!canSubmit && !submit.isPending && (
            <p className="mt-2 text-center text-xs text-slate-400">Score all criteria to unlock submission.</p>
          )}
          {submit.isError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
              {(submit.error as { message?: string })?.message ?? 'Submission failed. Please try again.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky mobile bottom bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-20 sm:hidden">
        <div className="border-t border-slate-200 bg-white/95 px-4 pb-safe pt-3 backdrop-blur-md">
          {/* Mini total bar */}
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500">Total</span>
            <span className={cn('font-bold tabular-nums', totalColors.text)}>
              {currentTotal.toFixed(1)} / {maxTotal}
              <span className={cn('ml-2 rounded-full px-2 py-0.5 text-[0.625rem]', totalColors.badge)}>{pct.toFixed(1)}%</span>
            </span>
          </div>
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={cn('h-full rounded-full transition-all duration-300', totalColors.bar)} style={{ width: `${pct}%` }} />
          </div>
          <SubmitButton canSubmit={canSubmit} pending={submit.isPending} onSubmit={handleSubmit} />
          {submit.isError && (
            <p className="mt-2 text-center text-xs text-rose-600">
              {(submit.error as { message?: string })?.message ?? 'Submission failed.'}
            </p>
          )}
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
        'flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all',
        canSubmit
          ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-200 hover:from-brand-700 hover:to-brand-800 active:scale-[0.99]'
          : 'cursor-not-allowed bg-slate-100 text-slate-400',
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

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
      {icon}
      {children}
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3">
          <img
            src="/logo.png"
            alt="DBL"
            className="h-7 w-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">DBL HRM · Interview Evaluation</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}
