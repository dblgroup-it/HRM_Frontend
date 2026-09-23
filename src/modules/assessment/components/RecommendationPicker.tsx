import { Check } from 'lucide-react';

import { cn } from '@shared/lib';

import type { RecommendationKey } from '../types/assessment.types';
import { RECOMMENDATIONS, recommendationActiveTone } from './recommendation';

/**
 * "What do you suggest?" — the interviewer's own verdict, asked for alongside
 * their marks.
 *
 * Ten scores say how the candidate did; they do not say what the person who
 * sat opposite them thinks should happen. That judgement was travelling by
 * corridor and comments box, or not at all, and Head of Talent Acquisition
 * decided from numbers alone.
 *
 * Three answers rather than two, because "no" and "not for this post" are
 * different outcomes and the second is how the Talent Bank fills up. It is a
 * suggestion and says so: the recruiter still records what actually happens.
 */
export function RecommendationPicker({
  value,
  onChange,
  readOnly = false,
}: {
  value: RecommendationKey | null;
  onChange?: (key: RecommendationKey) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pb-2.5 pt-3.5 sm:px-5">
        <p className="text-sm font-semibold text-slate-800">
          {readOnly ? 'Your recommendation' : 'What do you recommend?'}
        </p>
        <p className="text-xs text-slate-400">
          {readOnly
            ? 'A suggestion — the final decision is the recruiter’s'
            : 'A suggestion, not the final decision'}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-3 sm:px-5">
        {RECOMMENDATIONS.map((r) => {
          const active = value === r.key;
          // A read-only sheet shows what was chosen and drops the rest, rather
          // than greying out two answers nobody gave.
          if (readOnly && !active) return null;
          return (
            <button
              key={r.key}
              type="button"
              disabled={readOnly}
              aria-pressed={active}
              onClick={() => onChange?.(r.key)}
              className={cn(
                'flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200',
                active
                  ? recommendationActiveTone(r.key)
                  : 'border-slate-200 bg-white',
                !readOnly &&
                  !active &&
                  'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm active:translate-y-0',
                readOnly && 'cursor-default sm:col-span-3',
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-bold">
                {active && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
                {r.label}
              </span>
              <span
                className={cn(
                  'text-[0.6875rem] leading-snug',
                  active ? 'text-white/85' : 'text-slate-500',
                )}
              >
                {r.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
