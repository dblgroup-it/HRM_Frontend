import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Video,
} from 'lucide-react';

import { cn } from '@shared/lib';
import { Spinner } from '@shared/components/ui';

import { usePublicEval, useSubmitPublicEval } from '../hooks/useAssessment';
import type { PublicEvalData } from '../types/assessment.types';
import { CriteriaScoringSection } from '../components/CriteriaScoringSection';
import { resolveApiFileUrl } from '@shared/api';

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

  const answeredCount = data.criteria.filter((c) => typeof scores[c.key] === 'number').length;
  const complete = answeredCount === data.criteria.length;
  const canSubmit = !submit.isPending && complete;

  const handleSubmit = () =>
    submit.mutate(
      { scores, comments: comments.trim() || undefined },
      { onSuccess: () => setSubmitted(true) },
    );

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
      <div className="pb-32 lg:grid lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-5">
        <CandidateBand data={data} />

        <div className="mt-4 space-y-4 lg:mt-0">
          <CriteriaScoringSection
            criteria={data.criteria}
            scores={scores}
            onChange={(key, value) => setScores((prev) => ({ ...prev, [key]: value }))}
          />

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
                Score all {data.criteria.length} criteria to submit
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

/** Soft tints for the summary panels — light, distinguishable, not loud. */
const PANEL_TONES = {
  sky: 'border-sky-100 bg-sky-50/60',
  violet: 'border-violet-100 bg-violet-50/60',
  amber: 'border-amber-100 bg-amber-50/60',
} as const;

const ICON_TONES = {
  sky: 'bg-sky-100 text-sky-600',
  violet: 'bg-violet-100 text-violet-600',
  amber: 'bg-amber-100 text-amber-600',
} as const;

/** Each entry sits on its own card so two degrees never read as one. */
const ENTRY_TONES = {
  sky: 'border-sky-200/70 bg-white',
  violet: 'border-violet-200/70 bg-white',
  amber: 'border-amber-200/70 bg-white',
} as const;

const FIGURE_TONES = {
  sky: 'bg-sky-50 text-sky-900 ring-sky-100',
  violet: 'bg-violet-50 text-violet-900 ring-violet-100',
  emerald: 'bg-emerald-50 text-emerald-900 ring-emerald-100',
} as const;

/**
 * Who you are marking, kept on screen while you mark them.
 *
 * Pinned under the page header from `lg` up so the ten criteria scroll
 * beneath it. Everything is on show — age, service, current post, every
 * degree, every job — because a marker scoring "Education" or "Experience" is
 * scoring exactly this, and a summary you have to unfold first is one nobody
 * unfolds. It was briefly a disclosure to keep the pinned band shallow; with
 * the criteria laid out two-up the page has the room, so the band simply
 * shows its contents and caps its own height instead.
 *
 * The colour is doing work rather than decorating: each kind of fact keeps
 * one hue wherever it appears, so the eye can jump to the education block
 * without reading the headings.
 */
function CandidateBand({ data }: { data: PublicEvalData }) {
  const brief = data.candidate.brief;
  const current = brief?.employment?.find((e) => e.current) ?? brief?.employment?.[0];
  const degrees = brief?.education?.filter((e) => e.kind !== 'certification') ?? [];
  const certs = brief?.education?.filter((e) => e.kind === 'certification') ?? [];
  const jobs = brief?.employment ?? [];
  const hasBrief = Boolean(brief && !brief.empty);

  return (
    <div className="lg:sticky lg:top-[4.25rem] lg:z-20">
      {/* Outlined rather than accented. The card carried a coloured strip
          along its top edge; a narrow border all the way round reads as one
          object instead of a card wearing a hat, and it is the same treatment
          every other card on the page now gets. Slate-300, not a true black —
          ten outlined cards down a page at slate-700 read as a table grid. */}
      <div className="animate-card-in overflow-hidden rounded-2xl border border-slate-300 bg-white lg:shadow-sm lg:shadow-slate-900/5">
        {/* The rail scrolls inside itself rather than growing. A real CV — four
            posts, three degrees — made the full-width band 700px tall on an
            850px laptop, so the marking sheet got a criterion and a half and
            the contact line was clipped mid-word. Height is the scarce
            dimension on a laptop; width is not, which is why the candidate
            moved back beside the sheet instead of on top of it. */}
        <div className="lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto">
          {/* ── Identity ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start gap-x-5 gap-y-3 bg-gradient-to-br from-brand-50/70 via-sky-50/30 to-white px-4 py-3.5 sm:px-5">
            <div className="flex w-full min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm shadow-brand-600/25">
                {initials(data.candidate.name)}
              </span>
              <div className="min-w-0">
                {/* Wrapping, not truncating. "Kamrul Hasan Cho…" over a
                    "Deputy Manager — Huma…" is not a name and a job, it is a
                    layout apologising for its own width. */}
                <h1 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                  {data.candidate.name}
                </h1>
                <p className="text-sm leading-snug text-slate-600">
                  {data.interview.designation}
                  {data.interview.unit && (
                    <span className="text-slate-400"> · {data.interview.unit}</span>
                  )}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center rounded-full bg-brand-100/70 px-2 py-0.5 font-semibold text-brand-700">
                    {cap(data.interview.kind)} interview
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                    {fmtDate(data.interview.scheduledAt)}
                  </span>
                  {data.interview.mode === 'online' ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-emerald-700">
                      <Video className="h-3.5 w-3.5 shrink-0" /> Online
                    </span>
                  ) : data.interview.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      {data.interview.location}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    Marking as{' '}
                    <span className="font-semibold text-slate-700">{data.panelistName}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* The figures a marker reaches for, and the CV. Two-up on a
                phone, four across a tablet, inline on a laptop. */}
            {/* One per row in the rail: at 21rem a two-column split rendered
                "2 years 8 mont…" and "Transaction Service …". */}
            <div className="grid w-full grid-cols-2 items-stretch gap-2 sm:grid-cols-4 lg:grid-cols-1">
              {brief?.age != null && <Figure tone="sky" label="Age" value={`${brief.age} yrs`} />}
              {brief?.totalService && (
                <Figure tone="violet" label="Service" value={brief.totalService} />
              )}
              {current && (
                <Figure
                  tone="emerald"
                  className="col-span-2 lg:col-span-1"
                  label="Currently"
                  value={current.company}
                  sub={current.designation ?? undefined}
                />
              )}
              {data.candidate.cvUrl && (
                <a
                  href={resolveApiFileUrl(data.candidate.cvUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-brand-600/25 transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.98] sm:py-2 lg:col-span-1"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  Full CV
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/80" />
                </a>
              )}
            </div>
          </div>

          {/* ── The CV, on show ──────────────────────────────────────── */}
          {hasBrief && (
            <div className="grid gap-3 border-t border-slate-100 px-4 py-3.5 sm:px-5 md:grid-cols-2 lg:grid-cols-1">
              {degrees.length > 0 && (
                <Panel tone="sky" icon={GraduationCap} title="Education" count={degrees.length}>
                  {degrees.map((e, i) => (
                    <Line
                      key={i}
                      tone="sky"
                      head={e.degree}
                      tail={[e.institute, e.year ? String(e.year) : null, e.result]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  ))}
                </Panel>
              )}

              {certs.length > 0 && (
                <Panel tone="violet" icon={Award} title="Certifications" count={certs.length}>
                  {certs.map((e, i) => (
                    <Line
                      key={i}
                      tone="violet"
                      head={e.degree}
                      tail={[e.institute, e.year ? String(e.year) : null, e.result]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  ))}
                </Panel>
              )}

              {jobs.length > 0 && (
                <Panel
                  tone="amber"
                  icon={Briefcase}
                  title="Positions held"
                  count={jobs.length}
                  className={cn(certs.length === 0 && 'md:col-span-2 lg:col-span-1')}
                >
                  {jobs.map((j, i) => (
                    <Line
                      key={i}
                      tone="amber"
                      head={j.company}
                      badge={j.current ? 'Current' : (j.duration ?? undefined)}
                      tail={[j.designation, j.period].filter(Boolean).join(' · ')}
                    />
                  ))}
                </Panel>
              )}
            </div>
          )}

          {/* ── How to reach them ────────────────────────────────────── */}
          {brief && (brief.phone || brief.email || brief.address) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-500 sm:px-5">
              {brief.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {brief.phone}
                </span>
              )}
              {brief.email && (
                <span className="inline-flex min-w-0 items-center gap-1.5" title={brief.email}>
                  <Mail className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                  <span className="truncate">{brief.email}</span>
                </span>
              )}
              {brief.address && (
                <span className="inline-flex min-w-0 items-center gap-1.5" title={brief.address}>
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span className="truncate">{brief.address}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A tinted block of the CV — one hue per kind of fact. */
function Panel({
  tone,
  icon: Icon,
  title,
  count,
  children,
  className,
}: {
  tone: keyof typeof PANEL_TONES;
  icon: React.ElementType;
  title: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col rounded-xl border p-2.5', PANEL_TONES[tone], className)}>
      <p className="mb-2 flex items-center gap-1.5 border-b border-white/80 pb-2 text-[0.625rem] font-bold uppercase tracking-wide text-slate-500">
        <span className={cn('flex h-5 w-5 items-center justify-center rounded-md', ICON_TONES[tone])}>
          <Icon className="h-3 w-3" />
        </span>
        {title}
        {count !== undefined && count > 1 && (
          <span className="ml-auto rounded-full bg-white/80 px-1.5 py-0.5 text-[0.5625rem] font-bold tabular-nums text-slate-500">
            {count}
          </span>
        )}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

/**
 * One entry inside a panel, on its own bordered card.
 *
 * Two degrees stacked with nothing but leading between them read as one
 * four-line paragraph; a border per entry is the difference between "MBA,
 * University of Dhaka" and "MBA / BBA".
 */
function Line({
  head,
  tail,
  badge,
  tone,
}: {
  head: string;
  tail?: string;
  badge?: string;
  tone: keyof typeof ENTRY_TONES;
}) {
  return (
    <div className={cn('min-w-0 rounded-lg border px-2.5 py-1.5', ENTRY_TONES[tone])}>
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold leading-snug text-slate-800">
        {head}
        {badge && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide text-slate-500">
            {badge}
          </span>
        )}
      </p>
      {tail && <p className="mt-0.5 text-[0.6875rem] leading-snug text-slate-500">{tail}</p>}
    </div>
  );
}

/** One figure in the band — a label over a value, optionally with a sub-line. */
function Figure({
  label,
  value,
  sub,
  tone,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: keyof typeof FIGURE_TONES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl px-3 py-2 ring-1 sm:min-w-[5.5rem]',
        FIGURE_TONES[tone],
        className,
      )}
    >
      <p className="text-[0.625rem] font-bold uppercase tracking-wide opacity-60">{label}</p>
      {/* Wrapping, not truncating: these values are two or three words and a
          clipped "2 years 8 mont…" saves nothing worth having. */}
      <p className="text-sm font-bold leading-tight">{value}</p>
      {sub && (
        <p className="truncate text-[0.6875rem] leading-tight opacity-70" title={sub}>
          {sub}
        </p>
      )}
    </div>
  );
}

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
