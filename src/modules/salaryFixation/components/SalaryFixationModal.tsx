import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BadgeDollarSign,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  RotateCcw,
  Send,
  Users,
  X,
} from 'lucide-react';

import { Select } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { useUpdateCandidate } from '@modules/candidates';
// The file, not the barrel: assessment already imports salaryFixation.
import { benefitLabels } from '@modules/assessment/components/benefits';
import { CandidatePackageModal } from '@modules/assessment/components/CandidatePackageModal';

import { BANDS, GRADES, JOB_GRADES, bandSalary, evaluateScreeningTest, gradeLabel } from '../constants';
import {
  salaryFixationKeys,
  useFinalizeSalaryFixation,
  useMarkOffered,
  useSalaryFixation,
  useUpsertSalaryFixation,
} from '../hooks/useSalaryFixation';
import type { JobGrade, SalaryFixation, UpsertSalaryFixationInput,
  CommitteeScore,
} from '../types/salaryFixation.types';

type FormState = Omit<UpsertSalaryFixationInput, 'jobGrade'> & { jobGrade: JobGrade | undefined };

function toForm(data: SalaryFixation): FormState {
  return {
    jobGrade: data.jobGrade ?? undefined,
    writtenTestEnabled: data.writtenTestEnabled,
    writtenTestTotal: data.writtenTestTotal,
    writtenTestObtained: data.writtenTestObtained,
    aiTestEnabled: data.aiTestEnabled,
    aiTestTotal: data.aiTestTotal,
    aiTestObtained: data.aiTestObtained,
    bandOverride: data.bandOverride,
    proposedSalaryOverride: data.proposedSalaryOverride,
  };
}

/** "৳ 1,45,000" — the way BDT figures are written in Bangladesh. */
const taka = (n: number) => `৳ ${Math.round(n).toLocaleString('en-IN')}`;

/** "37.5k", "1.45L" — short enough for a band tile. */
function compactTaka(n: number): string {
  if (n >= 100_000) {
    const l = n / 100_000;
    return `${Number.isInteger(l) ? l : l.toFixed(2).replace(/0$/, '')}L`;
  }
  const k = n / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

const bandName = (b: number) => `Band ${String(b).padStart(2, '0')}`;

/**
 * Salary fixation for one candidate: grade, screening, the committee's marks,
 * the band they point to, and the figure HR offers.
 *
 * The offer is the point of the exercise, so it leads — large, on the left,
 * with how far along the fixation is. Every change saves as it is made, as
 * before; nothing here waits for a Save button.
 */
export function SalaryFixationModal({
  reqId,
  candidate,
  open,
  onClose,
  context,
}: {
  reqId: string;
  candidate: { id: string; name: string };
  open: boolean;
  onClose: () => void;
  /** "REQ-2026-009 · Senior Officer" — shown under the name when known. */
  context?: string;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useSalaryFixation(candidate.id, open);
  /** The interview package form, for correcting present salary and benefits. */
  const [packageOpen, setPackageOpen] = useState(false);
  const upsert = useUpsertSalaryFixation(candidate.id);
  const markOffered = useMarkOffered(candidate.id);
  const finalize = useFinalizeSalaryFixation(candidate.id);
  const updateCandidate = useUpdateCandidate(reqId);

  const saveSalaryExpectation = (value: number | null) =>
    updateCandidate.mutate(
      { id: candidate.id, input: { salaryExpectation: value } },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: salaryFixationKeys.detail(candidate.id) }),
      },
    );

  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (open && data) setForm(toForm(data));
  }, [open, data]);

  // Custom shell (not the shared Modal component) — replicate its
  // Escape-to-close and body-scroll-lock behavior.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  if (isLoading || !form || !data) {
    return createPortal(
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <Loader2 className="h-7 w-7 animate-spin text-white" />
      </div>,
      document.body,
    );
  }

  const save = (patch: Partial<FormState>) => {
    const next = { ...form, ...patch };
    setForm(next);
    upsert.mutate(next);
  };

  const written = evaluateScreeningTest(
    form.writtenTestTotal,
    form.writtenTestObtained,
    Boolean(form.writtenTestEnabled),
    data.writtenTestPassPct,
  );
  const ai = evaluateScreeningTest(
    form.aiTestTotal,
    form.aiTestObtained,
    Boolean(form.aiTestEnabled),
    data.aiTestPassPct,
  );
  // Computer Literacy is marked by hand like the Written Test and gated the
  // same way server-side — shown so a block on finalizing is never a mystery.
  const computer = evaluateScreeningTest(
    data.computerTestTotal,
    data.computerTestObtained,
    Boolean(data.computerTestEnabled),
    data.computerTestPassPct,
  );
  // Screening tests are administered earlier (Assessment tab → Pre-Interview
  // Screening Tests); here they only decide whether finalizing is blocked.
  const screeningFailed =
    written.status === 'fail' ||
    ai.status === 'fail' ||
    computer.status === 'fail';
  const failedTests = [
    written.status === 'fail' ? `Written Test (≥ ${data.writtenTestPassPct}%)` : null,
    computer.status === 'fail' ? `Computer Literacy (≥ ${data.computerTestPassPct}%)` : null,
    ai.status === 'fail' ? `AI Proficiency Test (≥ ${data.aiTestPassPct}%)` : null,
  ].filter(Boolean);

  // HR's manual pick always wins — the same precedence the backend uses.
  const activeBand = form.bandOverride ?? data.computedBand;
  const grade = form.jobGrade ? GRADES[form.jobGrade] : null;
  const proposed = form.proposedSalaryOverride ?? data.proposedSalary;
  const canFinalize = !screeningFailed && data.proposedSalary !== null;
  const finalized = data.status === 'fixed';
  const saving = upsert.isPending || updateCandidate.isPending;
  const vsPresent =
    proposed != null && data.presentSalary != null && data.presentSalary > 0
      ? Math.round(((proposed - data.presentSalary) / data.presentSalary) * 100)
      : null;

  const steps = [
    { label: 'Job grade', done: Boolean(form.jobGrade), detail: form.jobGrade ?? 'Not chosen' },
    {
      label: 'Committee score',
      done: data.averageScore !== null,
      detail: data.averageScore !== null ? `${data.averageScore.toFixed(1)} of ${data.evaluationMax}` : 'Waiting for marks',
    },
    {
      label: 'Salary band',
      done: Boolean(activeBand),
      detail: activeBand ? `${bandName(activeBand)}${form.bandOverride ? ' · chosen' : ' · auto'}` : 'Needs grade and marks',
    },
    {
      label: 'Offer',
      done: finalized,
      detail: finalized
        ? `Finalized${data.finalizedAt ? ` ${formatDate(data.finalizedAt)}` : ''}`
        : data.offeredAt
          ? `Offered ${formatDate(data.offeredAt)}`
          : 'Not offered yet',
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-safe:animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Salary fixation — ${candidate.name}`}
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 motion-safe:animate-rise-in md:flex-row"
      >
        {/* ── Left: the offer, and how far along it is ── */}
        <aside className="relative shrink-0 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 px-6 py-6 text-white md:w-80">
          <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -right-14 top-8 h-44 w-44 rounded-full bg-emerald-300/20 blur-2xl" />
          <div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur motion-safe:animate-float">
                <BadgeDollarSign className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-white/70">Salary fixation</p>
                <h2 className="truncate text-lg font-semibold leading-snug">{candidate.name}</h2>
                {context && <p className="truncate text-sm text-white/75">{context}</p>}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-white/70">Proposed gross salary</p>
              <p className="mt-1 text-[2rem] font-bold leading-none tracking-tight tabular-nums">
                {proposed != null ? taka(proposed) : <span className="text-xl font-semibold text-white/60">Not set yet</span>}
              </p>
              <p className="mt-2 text-sm text-white/80">
                {form.jobGrade ? form.jobGrade : 'No grade'}
                {activeBand ? ` · ${bandName(activeBand)}` : ''}
                {proposed != null && form.proposedSalaryOverride != null ? ' · set by hand' : ''}
              </p>
              {vsPresent !== null && (
                <p className="mt-1 text-sm text-white/80">
                  <span className={cn('font-semibold', vsPresent >= 0 ? 'text-emerald-200' : 'text-amber-200')}>
                    {vsPresent >= 0 ? '+' : ''}{vsPresent}%
                  </span>{' '}
                  on present salary ({taka(data.presentSalary!)})
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {finalized ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Finalized
                  </span>
                ) : data.offeredAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
                    <Send className="h-3.5 w-3.5" /> Offered {formatDate(data.offeredAt)}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white/85">Draft</span>
                )}
                {screeningFailed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Screening failed
                  </span>
                )}
              </div>
            </div>

            <ol className="grid gap-3.5">
              {steps.map((s, i) => {
                const active = !s.done && steps.slice(0, i).every((p) => p.done);
                return (
                  <li key={s.label} className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
                        s.done
                          ? 'bg-white text-brand-700 motion-safe:animate-loader-pop'
                          : active
                            ? 'bg-white/20 text-white ring-2 ring-white/70'
                            : 'bg-white/10 text-white/60 ring-1 ring-white/25',
                      )}
                    >
                      {s.done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className={cn('block text-sm font-semibold', s.done || active ? 'text-white' : 'text-white/60')}>{s.label}</span>
                      <span className="block truncate text-xs text-white/70">{s.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {/* ── Right: the working ── */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-6 pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Working</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 pb-6 pt-3">
            {/* ① Grade */}
            <Section title="Job grade" aside={grade && <span className="tabular-nums">BDT {gradeLabel(form.jobGrade!)} a month</span>}>
              <div className="grid gap-2 sm:max-w-sm">
                <Select
                  value={form.jobGrade ?? ''}
                  onChange={(e) => save({ jobGrade: e.target.value as JobGrade })}
                  options={JOB_GRADES.map((g) => ({
                    value: g,
                    label: GRADES[g].verified
                      ? `${g} — BDT ${gradeLabel(g)}`
                      : `${g} — BDT ${gradeLabel(g)} (provisional)`,
                  }))}
                  placeholder="Select job grade…"
                />
                {form.jobGrade && !GRADES[form.jobGrade].verified && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Provisional band — not yet confirmed by HR’s official salary matrix.
                  </p>
                )}
              </div>
            </Section>

            {/* ② Screening */}
            <Section title="Screening" aside={<span>Managed on the Assessment tab</span>}>
              <div className="grid gap-2 sm:grid-cols-3">
                <ScoreTile label="Written test" result={written} />
                <ScoreTile label="Computer literacy" result={computer} />
                <ScoreTile label="AI proficiency" result={ai} />
              </div>
              {screeningFailed && (
                <p className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] leading-snug text-rose-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Disqualified at pre-interview screening — below the pass mark in {failedTests.join(', ')}.
                    Salary fixation cannot be finalized.
                  </span>
                </p>
              )}
            </Section>

            {/* ③ Committee — every session's marks, grouped by session. The
                average is each session averaged, then the sessions averaged,
                so a three-person first round cannot outvote a one-person final. */}
            <Section
              title="Committee score"
              aside={
                data.averageScore !== null && (
                  <span>
                    Average <b className="text-base font-bold tabular-nums text-slate-900">{data.averageScore.toFixed(1)}</b> of {data.evaluationMax}
                  </span>
                )
              }
            >
              {data.interviewers.length === 0 ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-200 px-4 py-4 text-[0.8125rem] text-slate-500">
                  <Users className="h-4 w-4 shrink-0 text-slate-400" />
                  No interviewer has marked yet — they mark from their own evaluation link.
                </div>
              ) : (
                <div className="grid gap-2">
                  {groupByRound(data.interviewers).map((session) => (
                    <div key={session.roundId} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[0.8125rem] font-semibold capitalize text-slate-800">{session.roundKind} interview</p>
                        <p className="text-xs text-slate-500">
                          {session.marks.length} marked · avg{' '}
                          <b className="font-semibold tabular-nums text-brand-700">{session.average.toFixed(1)}</b>
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {session.marks.map((iv) => (
                          <span
                            key={`${iv.roundId}:${iv.evaluatorId}`}
                            title={`Submitted ${formatDate(iv.submittedAt)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200"
                          >
                            {iv.evaluatorName}
                            <b className="font-semibold tabular-nums text-slate-900">{iv.total.toFixed(1)}</b>
                            <span className="text-slate-400">/ {iv.max}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* ④ Band — the 11 steps of the grade as tiles, not a dropdown. */}
            <Section
              title="Salary band"
              aside={
                form.bandOverride != null && (
                  <button
                    type="button"
                    onClick={() => save({ bandOverride: null })}
                    className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Back to auto{data.computedBand ? ` (${bandName(data.computedBand)})` : ''}
                  </button>
                )
              }
            >
              {!form.jobGrade ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-[0.8125rem] text-slate-500">Choose a job grade to see its eleven bands.</p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-11">
                    {BANDS.map((b) => {
                      const on = activeBand === b;
                      const auto = data.computedBand === b;
                      const amount = bandSalary(form.jobGrade!, b);
                      return (
                        <button
                          key={b}
                          type="button"
                          title={`${bandName(b)} · ${taka(amount)}${auto ? ' · auto from the committee score' : ''}`}
                          onClick={() => save({ bandOverride: auto ? null : b })}
                          className={cn(
                            'group relative grid justify-items-center gap-0.5 rounded-xl border px-1 py-2 text-center transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                            'motion-safe:hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
                            on
                              ? 'border-brand-600 bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_8px_18px_-10px_rgba(24,119,192,0.9)] motion-safe:scale-[1.04]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/60',
                          )}
                        >
                          <span className={cn('text-[0.625rem] font-semibold uppercase tracking-wider', on ? 'text-white/80' : 'text-slate-400')}>
                            {String(b).padStart(2, '0')}
                          </span>
                          <span className="text-[0.8125rem] font-bold tabular-nums">{compactTaka(amount)}</span>
                          {auto && (
                            <span className={cn('text-[0.5625rem] font-semibold uppercase tracking-wider', on ? 'text-emerald-100' : 'text-emerald-600')}>
                              Auto
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[0.8125rem] text-slate-600">
                    {activeBand ? (
                      <>
                        <b className="font-semibold text-slate-800">{bandName(activeBand)} · {taka(bandSalary(form.jobGrade, activeBand))}</b>
                        {form.bandOverride != null ? ' — chosen by you' : ' — worked out from the committee score'}
                      </>
                    ) : (
                      'The band is worked out once the committee has marked. You can also pick one.'
                    )}
                  </p>
                </>
              )}
            </Section>

            {/* ⑤ Negotiation — what they are on, what they asked, what we offer. */}
            <Section title="Negotiation">
              {grade && (
                <RangeTrack
                  min={grade.min}
                  max={grade.max}
                  marks={[
                    { label: 'Present', value: data.presentSalary, dot: 'bg-slate-500' },
                    { label: 'Asked', value: data.salaryExpectation, dot: 'bg-amber-500' },
                    { label: 'Proposed', value: proposed, dot: 'bg-brand-600' },
                  ]}
                />
              )}
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <div className="flex items-center justify-between sm:col-span-2">
                  <p className="text-[0.6875rem] text-slate-400">
                    From the interview
                    {data.packageUpdatedByName
                      ? ` · ${data.packageUpdatedByName}`
                      : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPackageOpen(true)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Pencil className="h-3 w-3" />
                    {data.presentSalary != null ||
                    data.salaryBenefits.length > 0 ||
                    data.salaryBenefitsNote
                      ? 'Edit'
                      : 'Add'}
                  </button>
                </div>
                <Field label="Present salary">
                  <p className="text-lg font-bold tabular-nums text-slate-900">
                    {data.presentSalary != null ? taka(data.presentSalary) : <span className="text-sm font-medium text-slate-400">Not recorded</span>}
                  </p>
                </Field>
                <Field label="Current benefits">
                  {benefitLabels(data.salaryBenefits).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {benefitLabels(data.salaryBenefits).map((label) => (
                        <span key={label} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-emerald-700">
                          <Check className="h-3 w-3" />
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {data.salaryBenefitsNote ? (
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{data.salaryBenefitsNote}</p>
                  ) : (
                    benefitLabels(data.salaryBenefits).length === 0 && <p className="text-sm text-slate-400">Nothing recorded</p>
                  )}
                </Field>
                <Field label="Candidate asked" hint="optional">
                  <MoneyInput
                    key={`ask-${data.updatedAt ?? 'new'}`}
                    defaultValue={data.salaryExpectation}
                    placeholder="Not stated"
                    onCommit={saveSalaryExpectation}
                  />
                </Field>
                <Field label="Proposed gross salary" emphasis>
                  <MoneyInput
                    key={`offer-${data.updatedAt ?? 'new'}`}
                    defaultValue={form.proposedSalaryOverride ?? data.proposedSalary}
                    placeholder="Enter amount"
                    emphasis
                    onCommit={(v) => save({ proposedSalaryOverride: v })}
                  />
                </Field>
              </div>
            </Section>
          </div>

          {/* ── Footer ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
            <p className="flex items-center gap-1.5 text-[0.8125rem] text-slate-500">
              {saving ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
              ) : screeningFailed ? (
                <span className="text-rose-700">Screening failed — this cannot be finalized.</span>
              ) : data.proposedSalary === null ? (
                'Set a job grade and a figure to finalize.'
              ) : (
                <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Changes save as you go</>
              )}
            </p>
            <div className="flex gap-2">
              <MotionButton
                variant="outline"
                icon={<Send className="h-4 w-4" />}
                busy={markOffered.isPending}
                disabled={data.proposedSalary === null}
                onClick={() => markOffered.mutate()}
              >
                {data.offeredAt ? 'Re-mark as offered' : 'Mark as offered'}
              </MotionButton>
              <MotionButton
                variant="primary"
                icon={<Check className="h-4 w-4" strokeWidth={2.5} />}
                busy={finalize.isPending}
                disabled={!canFinalize}
                onClick={() => finalize.mutate(undefined, { onSuccess: onClose })}
              >
                {finalized ? 'Finalize again' : 'Finalize'}
              </MotionButton>
            </div>
          </div>
        </div>
      </div>
      {packageOpen && (
        <CandidatePackageModal
          open
          stacked
          candidate={{
            id: candidate.id,
            name: candidate.name,
            presentSalary: data.presentSalary,
            salaryExpectation: data.salaryExpectation,
            salaryBenefitsNote: data.salaryBenefitsNote,
            salaryBenefits: data.salaryBenefits,
            transportPickup: data.transportPickup ?? null,
            packageUpdatedAt: data.packageUpdatedAt ?? null,
            packageUpdatedByName: data.packageUpdatedByName ?? null,
          }}
          onSaved={() =>
            qc.invalidateQueries({
              queryKey: salaryFixationKeys.detail(candidate.id),
            })
          }
          onClose={() => setPackageOpen(false)}
        />
      )}
    </div>,
    document.body,
  );
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {aside && <div className="text-xs text-slate-500">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  emphasis = false,
  children,
}: {
  label: string;
  hint?: string;
  emphasis?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3.5 py-3 transition-colors',
        emphasis ? 'border-brand-200 bg-brand-50/60 focus-within:border-brand-400' : 'border-slate-200 bg-white focus-within:border-slate-300',
      )}
    >
      <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {hint && <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">· {hint}</span>}
      </p>
      {children}
    </div>
  );
}

/**
 * A taka amount, written with its commas ("55,000") except while it is being
 * typed, and saved when you leave it — only if it changed.
 */
function MoneyInput({
  defaultValue,
  placeholder,
  emphasis = false,
  onCommit,
}: {
  defaultValue: number | null;
  placeholder: string;
  emphasis?: boolean;
  onCommit: (value: number | null) => void;
}) {
  const [raw, setRaw] = useState(defaultValue != null ? String(Math.round(defaultValue)) : '');
  const [focused, setFocused] = useState(false);
  const shown = focused || raw === '' ? raw : Number(raw).toLocaleString('en-IN');
  return (
    <div className="flex items-baseline gap-1">
      <span className={cn('text-lg font-bold', emphasis ? 'text-brand-700' : 'text-slate-400')}>৳</span>
      <input
        type="text"
        inputMode="numeric"
        value={shown}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onChange={(e) => setRaw(e.target.value.replace(/[^\d]/g, '').slice(0, 9))}
        onBlur={() => {
          setFocused(false);
          const next = raw === '' ? null : Number(raw);
          if (next !== (defaultValue == null ? null : Math.round(defaultValue))) onCommit(next);
        }}
        className={cn(
          'w-full bg-transparent text-lg font-bold tabular-nums placeholder:text-sm placeholder:font-medium placeholder:text-slate-400 focus:outline-none',
          emphasis ? 'text-brand-700' : 'text-slate-900',
        )}
      />
    </div>
  );
}

/**
 * Where present, asked and proposed sit inside the grade's range — the one
 * picture a negotiation needs. Figures outside the range sit at its ends,
 * with the figure itself in the legend.
 */
function RangeTrack({
  min,
  max,
  marks,
}: {
  min: number;
  max: number;
  marks: { label: string; value: number | null; dot: string }[];
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const present = marks.filter((m) => m.value != null);
  return (
    <div className="rounded-xl bg-slate-50 px-4 pb-3 pt-4">
      <div className="relative h-2 rounded-full bg-gradient-to-r from-slate-200 via-brand-100 to-brand-200">
        {present.map((m) => (
          <span
            key={m.label}
            title={`${m.label}: ${taka(m.value!)}`}
            className={cn(
              'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition-[left] duration-700 ease-out motion-reduce:transition-none',
              m.dot,
            )}
            style={{ left: `${shown ? pct(m.value!) : 0}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[0.6875rem] tabular-nums text-slate-500">
        <span>{taka(min)}</span>
        <span>{taka(max)}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {marks.map((m) => (
          <span key={m.label} className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', m.dot)} />
            {m.label}
            <b className="font-semibold tabular-nums text-slate-800">{m.value != null ? taka(m.value) : '—'}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreTile({
  label,
  result,
}: {
  label: string;
  result: { status: 'not_conducted' | 'pending' | 'pass' | 'fail'; pct: number | null };
}) {
  const look =
    result.status === 'pass'
      ? { box: 'border-emerald-200 bg-emerald-50/70', text: 'text-emerald-700', Icon: Check, word: 'Passed' }
      : result.status === 'fail'
        ? { box: 'border-rose-200 bg-rose-50/70', text: 'text-rose-700', Icon: X, word: 'Failed' }
        : { box: 'border-slate-200 bg-white', text: 'text-slate-600', Icon: null, word: null };
  const value =
    result.status === 'not_conducted'
      ? 'Not required'
      : result.status === 'pending'
        ? 'Pending'
        : `${result.pct?.toFixed(1)}%`;
  return (
    <div className={cn('rounded-xl border px-3.5 py-2.5', look.box)}>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn('mt-0.5 flex items-center gap-1.5 text-base font-bold', look.text)}>
        {look.Icon && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
            <look.Icon className="h-3.5 w-3.5" />
          </span>
        )}
        {value}
        {look.word && <span className="text-xs font-medium">{look.word}</span>}
      </p>
    </div>
  );
}

/** The footer's two buttons: lift on hover, sink on press, light across the primary. */
function MotionButton({
  variant,
  icon,
  busy,
  disabled,
  onClick,
  children,
}: {
  variant: 'primary' | 'outline';
  icon: ReactNode;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={cn(
        'group/btn relative isolate inline-flex h-10 items-center gap-2 overflow-hidden rounded-xl border px-4 text-sm font-semibold',
        'transition-[transform,box-shadow,background-color,border-color] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        'motion-safe:hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-45',
        variant === 'primary'
          ? 'border-brand-600 bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_1px_2px_rgba(24,119,192,0.3),0_8px_18px_-10px_rgba(24,119,192,0.8)] hover:to-brand-700 hover:shadow-[0_12px_24px_-12px_rgba(24,119,192,0.9)]'
          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700 hover:shadow-[0_6px_14px_-8px_rgba(15,23,42,0.3)]',
      )}
    >
      {variant === 'primary' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 motion-safe:group-hover/btn:animate-btn-sheen"
        />
      )}
      <span className="relative transition-transform duration-300 motion-safe:group-hover/btn:scale-110">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      </span>
      <span className="relative">{children}</span>
    </button>
  );
}

/**
 * Committee marks, grouped into the sessions they were given in.
 *
 * Order is preserved from the server, which returns oldest session first —
 * so the panel reads first, second, final. Each session carries its own
 * average, which is the unit the overall average is built from.
 */
function groupByRound(marks: CommitteeScore[]): {
  roundId: string;
  roundKind: string;
  marks: CommitteeScore[];
  average: number;
}[] {
  const order: string[] = [];
  const byRound = new Map<string, CommitteeScore[]>();
  for (const m of marks) {
    const list = byRound.get(m.roundId);
    if (list) list.push(m);
    else {
      byRound.set(m.roundId, [m]);
      order.push(m.roundId);
    }
  }
  return order.map((roundId) => {
    const group = byRound.get(roundId)!;
    return {
      roundId,
      roundKind: group[0].roundKind,
      marks: group,
      average: group.reduce((sum, m) => sum + m.total, 0) / group.length,
    };
  });
}
