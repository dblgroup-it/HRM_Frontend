import { Check, ClipboardCheck } from 'lucide-react';

import { cn } from '@shared/lib';

import type { EvaluationCriterionView } from '../types/assessment.types';

/**
 * The 10 fixed evaluation criteria, as a scoring sheet.
 *
 * Shared by both places a panelist marks: the emailed token page and the
 * logged-in "My Interviews" page. It feeds the hiring-decision scorecard and
 * salary fixation, so all 10 must be answered before submitting.
 *
 * Laid out for the people who actually use it — senior interviewers, often on
 * a phone between two sessions, sometimes a board member who opens the link
 * once a quarter. That argues for a calm document rather than a busy app: the
 * options sit on a fixed 2-up / 4-up grid so every row is the same shape and
 * the eye can run down the sheet, and the chosen answer is echoed in the row
 * header so a completed sheet can be read back without decoding the chips.
 *
 * The four options used to be `flex-1 min-w-[110px]`, which on a phone put
 * three on one line and orphaned the fourth on its own — ten times down the
 * page, on every single criterion, for 6,700px of scrolling.
 */
export function CriteriaScoringSection({
  criteria,
  scores,
  onChange,
  readOnly = false,
}: {
  criteria: EvaluationCriterionView[];
  scores: Record<string, number>;
  onChange?: (key: string, value: number) => void;
  readOnly?: boolean;
}) {
  const total = criteria.reduce((sum, c) => sum + (scores[c.key] ?? 0), 0);
  const totalMax = criteria.reduce((sum, c) => sum + c.max, 0);
  const answered = criteria.filter((c) => scores[c.key] !== undefined).length;
  const complete = answered === criteria.length && criteria.length > 0;
  const pct = totalMax > 0 ? Math.min(100, (total / totalMax) * 100) : 0;

  return (
    <section className="space-y-3">
      {/* Progress header — a statement of where you are, not a celebration.
          This was a full emerald gradient card with a party-popper on
          completion, which is not the register a board member reading a
          shortlist is in. */}
      <header
        className={cn(
          'animate-card-in rounded-2xl border bg-white px-4 py-3.5 transition-colors duration-500 sm:px-5',
          complete ? 'border-emerald-300' : 'border-slate-300',
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-lg',
                complete ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-50 text-brand-600',
              )}
            >
              {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <ClipboardCheck className="h-3.5 w-3.5" />}
            </span>
            {readOnly ? 'Evaluation' : complete ? 'All criteria scored' : 'Score each criterion'}
          </h2>
          <p className="text-xs tabular-nums text-slate-500">
            <span className={cn('font-semibold', complete ? 'text-emerald-600' : 'text-slate-700')}>
              {answered}
            </span>
            {' of '}{criteria.length} scored
            <span className="mx-2 text-slate-300">|</span>
            <span className="font-semibold text-slate-800">{total.toFixed(1)}</span>
            <span className="text-slate-400">/{totalMax}</span>
          </p>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              complete ? 'bg-emerald-500' : 'bg-brand-600',
            )}
            style={{ width: `${(answered / Math.max(1, criteria.length)) * 100}%` }}
          />
        </div>
        <span className="sr-only">{pct.toFixed(1)}% of the available marks</span>
      </header>

      {/* One column. This was two from `xl`, which worked while the sheet had
          the whole page; beside the candidate rail each card is ~500px and
          four options across it wrap "Above Required, Partial Related" onto
          three lines apiece. */}
      <ol className="space-y-2.5">
        {criteria.map((c, i) => {
          const sel = scores[c.key];
          const done = sel !== undefined;
          const chosen = done ? c.options.find(([v]) => v === sel) : undefined;
          return (
            <li
              key={c.key}
              style={{ animationDelay: `${Math.min(i, 9) * 35}ms` }}
              className={cn(
                'animate-card-in rounded-2xl border bg-white transition-[border-color,box-shadow] duration-300',
                done
                  ? 'border-emerald-300 shadow-sm shadow-emerald-600/5'
                  : 'border-slate-300 hover:border-brand-400',
              )}
            >
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-3.5 pb-2.5 pt-3 sm:px-4">
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold tabular-nums transition-colors duration-300',
                    done ? 'animate-loader-pop bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400',
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-slate-800">{c.label}</p>
                  {c.hint && <p className="mt-0.5 text-xs leading-snug text-slate-400">{c.hint}</p>}
                </div>
                {/* The answer, echoed. A marked sheet should be readable as
                    prose — "Education: Above Required, Related" — without
                    hunting for which chip is filled in. */}
                {chosen ? (
                  <span className="inline-flex shrink-0 animate-fade-in items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <span className="tabular-nums">{chosen[0]}</span>
                    <span className="hidden font-medium text-emerald-600 sm:inline">{chosen[1]}</span>
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">
                    Max {c.max}
                  </span>
                )}
              </div>

              {/* A fixed grid, so every row is the same shape whatever the
                  labels say and nothing is ever left orphaned on its own line. */}
              <div className="grid grid-cols-2 gap-2 px-3.5 pb-3.5 sm:grid-cols-4 sm:px-4">
                {c.options.map(([v, l]) => {
                  const isSel = sel === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={readOnly}
                      aria-pressed={isSel}
                      onClick={() => onChange?.(c.key, v)}
                      className={cn(
                        'flex h-full flex-col justify-start gap-0.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-200',
                        isSel
                          ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/25'
                          : 'border-slate-200 bg-white',
                        !readOnly && !isSel &&
                          'hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/60 hover:shadow-sm active:translate-y-0',
                        !readOnly && isSel && 'active:scale-[0.98]',
                        readOnly && !isSel && 'opacity-60',
                        readOnly && 'cursor-default',
                      )}
                    >
                      <span className="flex items-center gap-1 text-xs font-bold tabular-nums">
                        {isSel && <Check className="h-3 w-3 shrink-0 animate-loader-pop" strokeWidth={3} />}
                        {v} pt{v !== 1 ? 's' : ''}
                      </span>
                      <span
                        className={cn(
                          'text-[0.6875rem] leading-snug',
                          isSel ? 'text-white/85' : 'text-slate-500',
                        )}
                      >
                        {l}
                      </span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
