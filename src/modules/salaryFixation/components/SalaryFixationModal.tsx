import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Send, Users, X } from 'lucide-react';

import { Badge, Button, Select } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatCurrency, formatDate } from '@shared/utils';
import { useUpdateCandidate } from '@modules/candidates';

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

export function SalaryFixationModal({
  reqId,
  candidate,
  open,
  onClose,
}: {
  reqId: string;
  candidate: { id: string; name: string };
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useSalaryFixation(candidate.id, open);
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

  if (!open || isLoading || !form || !data) return null;

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
  // same way server-side, but was the one screening result this modal never
  // displayed — so a candidate could be blocked from finalizing here with
  // nothing on screen saying why.
  const computer = evaluateScreeningTest(
    data.computerTestTotal,
    data.computerTestObtained,
    Boolean(data.computerTestEnabled),
    data.computerTestPassPct,
  );
  // Screening tests themselves are administered earlier in the pipeline
  // (Assessment tab → Pre-Interview Screening Tests) — this modal only
  // needs to know whether a failure should block finalizing.
  const screeningFailed =
    written.status === 'fail' ||
    ai.status === 'fail' ||
    computer.status === 'fail';

  const canFinalize = !screeningFailed && data.proposedSalary !== null;

  // HR's manual pick always wins, same precedence the backend uses for the
  // actual proposed-salary computation — so this stays in sync with it.
  const activeBand = form.bandOverride ?? data.computedBand;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 print:hidden">
          <div>
            <h2 className="text-base font-bold text-slate-800">Salary Fixation</h2>
            <p className="text-xs text-slate-400">{candidate.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {data.status === 'fixed' && <Badge tone="success">Finalized</Badge>}
            {data.status !== 'fixed' && data.offeredAt && (
              <Badge tone="brand">Offered {formatDate(data.offeredAt)}</Badge>
            )}
            {screeningFailed && <Badge tone="danger">Screening failed</Badge>}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Job grade */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <Select
                label="Job Grade"
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
            </div>
            {form.jobGrade && !GRADES[form.jobGrade].verified && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Provisional band — not yet confirmed by HR's official salary matrix.
              </p>
            )}
          </div>

          {/* Screening test scores — read only; managed from the requisition's Assessment tab */}
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Screening Test Scores</p>
            <div className="grid grid-cols-3 gap-3">
              <ScoreChip label="Written Test" result={written} />
              <ScoreChip label="Computer Literacy" result={computer} />
              <ScoreChip label="AI Proficiency Test" result={ai} />
            </div>
          </div>

          {screeningFailed && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Applicant disqualified at pre-interview screening — did not meet the minimum
              pass mark
              {' '}
              {[
                written.status === 'fail'
                  ? `Written Test (≥ ${data.writtenTestPassPct}%)`
                  : null,
                computer.status === 'fail'
                  ? `Computer Literacy (≥ ${data.computerTestPassPct}%)`
                  : null,
                ai.status === 'fail'
                  ? `AI Proficiency Test (≥ ${data.aiTestPassPct}%)`
                  : null,
              ]
                .filter(Boolean)
                .join(', ')}
              .
              Salary fixation cannot be finalized. Manage screening tests from the
              requisition's Assessment tab.
            </div>
          )}

          {/* Every session's marks, grouped by session.
              This used to show one row per evaluator — their most recent mark
              only — so a panelist who sat on both the first and second
              interview had their first-round mark silently dropped, and a
              whole round could vanish if the same people ran it. The average
              below is each session averaged, then the sessions averaged, so
              a three-person first round cannot outvote a one-person final. */}
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Committee Scores</p>
            {data.interviewers.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 py-4 text-xs text-slate-400">
                <Users className="h-4 w-4 shrink-0" />
                No interviewer has submitted salary scores yet — they mark this from
                their own interview evaluation link.
              </div>
            ) : (
              <div className="space-y-2">
                {groupByRound(data.interviewers).map((session) => (
                  <div
                    key={session.roundId}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
                      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                        {session.roundKind} interview
                      </p>
                      <span className="shrink-0 text-[0.6875rem] font-semibold text-slate-500">
                        {session.marks.length} marked · avg{' '}
                        <span className="text-brand-700">
                          {session.average.toFixed(1)}
                        </span>
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {session.marks.map((iv) => (
                        <div
                          key={`${iv.roundId}:${iv.evaluatorId}`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-700">
                              {iv.evaluatorName}
                            </p>
                            <p className="text-[0.6875rem] text-slate-400">
                              {formatDate(iv.submittedAt)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-brand-700">
                            {iv.total.toFixed(1)} / {iv.max}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Result */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ResultCard
              label={`Average Score (of ${data.evaluationMax})`}
              value={data.averageScore !== null ? data.averageScore.toFixed(2) : '—'}
            />
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase text-slate-400">Salary Band</p>
              <Select
                className="mt-1 h-9"
                value={form.bandOverride ? String(form.bandOverride) : ''}
                onChange={(e) =>
                  save({ bandOverride: e.target.value ? Number(e.target.value) : null })
                }
                options={BANDS.map((b) => ({ value: String(b), label: `Band - ${String(b).padStart(2, '0')}` }))}
                placeholder={
                  data.computedBand ? `Auto: Band - ${String(data.computedBand).padStart(2, '0')}` : 'Auto'
                }
              />
            </div>
            <ResultCard
              label="Grade Range"
              value={
                form.jobGrade
                  ? activeBand
                    ? `${form.jobGrade}: ${bandSalary(form.jobGrade, activeBand).toLocaleString('en-IN')}`
                    : `${form.jobGrade}: ${gradeLabel(form.jobGrade)}`
                  : '—'
              }
            />
          </div>

          {/* Negotiation — what the candidate asked for vs. what we're offering.
              Their current package sits alongside, read-only: it is recorded
              in the interview room by whoever ran the session, and HR was
              opening the interview notes in another tab to find out what
              they were bidding against. */}
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Negotiation</p>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[0.6875rem] font-semibold uppercase text-slate-400">
                  Present Salary{' '}
                  <span className="normal-case text-slate-300">(from the interview)</span>
                </p>
                <p className="mt-0.5 text-base font-bold text-slate-800">
                  {data.presentSalary != null
                    ? formatCurrency(data.presentSalary)
                    : <span className="font-medium text-slate-300">Not recorded</span>}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[0.6875rem] font-semibold uppercase text-slate-400">
                  Current Benefits
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  {data.salaryBenefitsNote || (
                    <span className="text-slate-300">Nothing recorded</span>
                  )}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[0.6875rem] font-semibold uppercase text-slate-400">
                  Candidate Asked <span className="normal-case text-slate-300">(optional)</span>
                </p>
                <input
                  key={`ask-${data.updatedAt ?? 'new'}`}
                  type="number"
                  defaultValue={data.salaryExpectation ?? ''}
                  placeholder="Not stated"
                  onBlur={(e) =>
                    saveSalaryExpectation(e.target.value === '' ? null : Number(e.target.value))
                  }
                  className="mt-0.5 w-full bg-transparent text-base font-bold text-slate-800 focus:outline-none"
                />
              </div>
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
                <p className="text-[0.6875rem] font-semibold uppercase text-slate-400">
                  Proposed Gross Salary
                </p>
                <input
                  key={`offer-${data.updatedAt ?? 'new'}`}
                  type="number"
                  defaultValue={form.proposedSalaryOverride ?? data.proposedSalary ?? ''}
                  placeholder="Enter amount"
                  onBlur={(e) =>
                    save({
                      proposedSalaryOverride: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="mt-0.5 w-full bg-transparent text-base font-bold text-brand-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4 print:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={data.proposedSalary === null}
              isLoading={markOffered.isPending}
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() => markOffered.mutate()}
            >
              {data.offeredAt ? 'Re-mark as Offered' : 'Mark as Offered'}
            </Button>
            <Button
              disabled={!canFinalize}
              isLoading={finalize.isPending}
              leftIcon={<Check className="h-4 w-4" />}
              onClick={() => finalize.mutate(undefined, { onSuccess: onClose })}
            >
              Finalize
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ScoreChip({
  label,
  result,
}: {
  label: string;
  result: { status: 'not_conducted' | 'pending' | 'pass' | 'fail'; pct: number | null };
}) {
  const tone =
    result.status === 'pass'
      ? { box: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-700', Icon: Check }
      : result.status === 'fail'
        ? { box: 'border-rose-200 bg-rose-50', text: 'text-rose-700', Icon: X }
        : { box: 'border-slate-200 bg-slate-50', text: 'text-slate-600', Icon: null };
  const value =
    result.status === 'not_conducted'
      ? 'Not required'
      : result.status === 'pending'
        ? 'Pending'
        : `${result.pct?.toFixed(1)}%`;
  return (
    <div className={cn('rounded-lg border p-3', tone.box)}>
      <p className="text-[0.6875rem] font-semibold uppercase text-slate-400">{label}</p>
      <p className={cn('mt-0.5 flex items-center gap-1.5 text-base font-bold', tone.text)}>
        {tone.Icon && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/70">
            <tone.Icon className="h-3.5 w-3.5" />
          </span>
        )}
        {value}
      </p>
    </div>
  );
}

function ResultCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        highlight ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-slate-50',
      )}
    >
      <p className="text-[0.6875rem] font-semibold uppercase text-slate-400">{label}</p>
      <p className={cn('mt-0.5 text-base font-bold', highlight ? 'text-brand-700' : 'text-slate-800')}>
        {value}
      </p>
    </div>
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
