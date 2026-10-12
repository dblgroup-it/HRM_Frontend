import { cn } from '@shared/lib';

import { STAGES, toneOf } from '../tones';

/**
 * Where this person's guides sit in the hiring workflow — the same idea as
 * the lifecycle strip in the PDFs. The five stages on one line, theirs lit
 * in the stage's tint, one slow streak of light running along it. When their
 * guides span more than one stage, a stage filters the list (`onSelect`).
 */
export function HiringJourney({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: ((stage: string | null) => void) | null;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-brand-700/70">
          Your part of the hiring journey
        </p>
        {onSelect && selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Show all
          </button>
        )}
      </div>
      {/* The stages wrap until there is room for all five on one line, joined. */}
      <div className="-mx-1 mt-3 px-1 py-1 xl:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative flex flex-wrap items-center gap-2 xl:min-w-max xl:flex-nowrap xl:justify-between xl:gap-3">
          <div
            aria-hidden
            className="absolute inset-x-3 top-1/2 hidden h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-brand-100 xl:block"
          >
            <span className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-brand-400/80 to-transparent opacity-0 motion-safe:animate-journey-streak" />
          </div>
          {STAGES.map((stage, i) => {
            const count = counts[stage] ?? 0;
            const tone = toneOf(stage);
            const on = selected === stage;
            const inner = (
              <>
                <span className={cn('h-2 w-2 rounded-full', count ? tone.dot : 'bg-slate-300')} />
                {stage}
                {count > 0 && (
                  <span className="rounded-full bg-white/90 px-1.5 text-[0.625rem] font-semibold tabular-nums text-slate-600 ring-1 ring-inset ring-slate-200/70">
                    {count}
                  </span>
                )}
              </>
            );
            const pill =
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium';
            return (
              // The entrance plays on the wrapper, so it never holds the pill's own hover lift.
              <span
                key={stage}
                className="relative shrink-0 motion-safe:animate-card-in"
                style={{ animationDelay: `${200 + i * 70}ms` }}
              >
                {!count ? (
                  <span className={cn(pill, 'border-dashed border-slate-200 bg-white/70 text-slate-400')}>
                    {inner}
                  </span>
                ) : onSelect ? (
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSelect(on ? null : stage)}
                    className={cn(
                      pill,
                      'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                      on ? tone.nodeOn : cn(tone.node, 'hover:shadow-sm motion-safe:hover:-translate-y-0.5'),
                    )}
                  >
                    {inner}
                  </button>
                ) : (
                  <span className={cn(pill, tone.node)}>{inner}</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
