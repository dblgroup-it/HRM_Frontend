import { Check, ClipboardCheck, PartyPopper } from 'lucide-react';

import { cn } from '@shared/lib';

import type { EvaluationCriterionView } from '../types/assessment.types';

/**
 * Renders the 10 fixed evaluation criteria as an option-chip picker —
 * embedded in the interviewer's own evaluation form (token link or the
 * logged-in "My Interviews" page). This is the panelist's actual scoring
 * mechanism: it feeds both the hiring-decision scorecard and salary
 * fixation, so all 10 criteria must be completed before submitting.
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
  const answeredCount = criteria.filter((c) => scores[c.key] !== undefined).length;
  const started = answeredCount > 0;
  const complete = answeredCount === criteria.length && criteria.length > 0;
  const pct = totalMax > 0 ? Math.min(100, (total / totalMax) * 100) : 0;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border p-4 transition-colors duration-500',
          complete
            ? 'border-emerald-300 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/25'
            : 'border-slate-200 bg-white',
        )}
      >
        {!complete && (
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-brand-400/10 blur-3xl" />
        )}
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className={cn('flex items-center gap-1.5 text-sm font-semibold', complete ? 'text-white' : 'text-slate-700')}>
              {complete ? (
                <PartyPopper className="h-4 w-4 animate-loader-pop" />
              ) : (
                <ClipboardCheck className="h-4 w-4 text-brand-500" />
              )}
              {complete ? 'All criteria scored' : 'Score each criterion'}
            </p>
            <p className={cn('mt-0.5 text-[0.6875rem]', complete ? 'text-emerald-100' : 'text-slate-400')}>
              {answeredCount} of {criteria.length} marked
            </p>
          </div>
          <ScoreRing pct={pct} label={started ? total.toFixed(1) : '—'} sub={`/ ${totalMax}`} inverted={complete} />
        </div>
      </div>

      <div className="space-y-2">
        {criteria.map((c, i) => {
          const sel = scores[c.key];
          const done = sel !== undefined;
          return (
            <div
              key={c.key}
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              className={cn(
                'animate-rise-in rounded-xl border p-3 transition-all duration-200 [animation-duration:0.4s]',
                done ? 'border-emerald-200/70 bg-emerald-50/30' : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold transition-all duration-300',
                      done ? 'animate-loader-pop bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400',
                    )}
                  >
                    {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{c.label}</p>
                    {c.hint && <p className="text-[0.625rem] text-slate-400">{c.hint}</p>}
                  </div>
                </div>
                <span className="shrink-0 text-[0.625rem] font-medium text-slate-400">Max {c.max} pts</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.options.map(([v, l]) => {
                  const isSel = sel === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={readOnly}
                      onClick={() => onChange?.(c.key, v)}
                      className={cn(
                        'flex-1 min-w-[110px] rounded-lg border px-2.5 py-2 text-left text-[0.6875rem] transition-all duration-150',
                        isSel
                          ? 'scale-[1.02] border-brand-600 bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/25'
                          : 'border-slate-200 bg-white text-slate-500',
                        !readOnly && !isSel && 'hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-sm',
                        readOnly && 'cursor-default',
                      )}
                    >
                      <b className="flex items-center gap-1">
                        {isSel && <Check className="h-3 w-3" strokeWidth={3} />}
                        {v} pt{v !== 1 ? 's' : ''}
                      </b>
                      <span className={isSel ? 'text-white/80' : undefined}>{l}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Small circular progress indicator for the running total. */
function ScoreRing({
  pct,
  label,
  sub,
  inverted,
}: {
  pct: number;
  label: string;
  sub: string;
  inverted: boolean;
}) {
  const size = 52;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);
  const trackColor = inverted ? 'rgba(255,255,255,0.25)' : '#e2e8f0';
  const fillColor = inverted ? '#ffffff' : pct >= 70 ? '#10b981' : pct >= 40 ? '#1877c0' : '#f59e0b';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={fillColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn('text-[0.6875rem] font-bold tabular-nums', inverted ? 'text-white' : 'text-slate-700')}>
          {label}
        </span>
        <span className={cn('text-[0.5rem] font-medium', inverted ? 'text-white/70' : 'text-slate-400')}>{sub}</span>
      </div>
    </div>
  );
}
