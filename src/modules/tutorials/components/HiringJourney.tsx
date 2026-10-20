import { cn } from '@shared/lib';

import { STAGES, toneOf } from '../tones';

/**
 * Where this person's guides sit in the hiring workflow — the same idea as
 * the lifecycle strip in the PDFs. The five stages on one line, theirs lit
 * in the stage's tint, one slow streak of light running along it. When their
 * guides span more than one stage, a stage filters the list (`onSelect`).
 * `dark` draws it on the banner.
 */
export function HiringJourney({
  counts,
  selected,
  onSelect,
  dark = false,
  trailing,
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: ((stage: string | null) => void) | null;
  dark?: boolean;
  /** A small note at the right of the heading, e.g. how many guides are opened. */
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className={cn('text-[0.6875rem] font-semibold uppercase tracking-[0.12em]', dark ? 'text-white/55' : 'text-brand-700/70')}>
          Your part of the hiring journey
        </p>
        <div className="flex items-center gap-3">
          {trailing}
          {onSelect && selected && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={cn('text-xs font-medium hover:underline', dark ? 'text-white/80' : 'text-brand-700')}
            >
              Show all
            </button>
          )}
        </div>
      </div>
      {/* The stages wrap until there is room for all five on one line, joined. */}
      <div className="-mx-1 mt-3 px-1 py-1 xl:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative flex flex-wrap items-center gap-2 xl:min-w-max xl:flex-nowrap xl:justify-between xl:gap-3">
          <div
            aria-hidden
            className={cn('absolute inset-x-3 top-1/2 hidden h-0.5 -translate-y-1/2 overflow-hidden rounded-full xl:block', dark ? 'bg-white/15' : 'bg-brand-100')}
          >
            <span
              className={cn(
                'absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent to-transparent opacity-0 motion-safe:animate-journey-streak',
                dark ? 'via-white/90' : 'via-brand-400/80',
              )}
            />
          </div>
          {STAGES.map((stage, i) => {
            const count = counts[stage] ?? 0;
            const tone = toneOf(stage);
            const on = selected === stage;
            const inner = (
              <>
                <span className={cn('h-2 w-2 rounded-full', count ? tone.dot : dark ? 'bg-white/25' : 'bg-slate-300')} />
                <span className={cn(dark && 'mr-0.5 text-[0.625rem] tabular-nums opacity-50')}>{dark ? `0${i + 1}` : null}</span>
                {stage}
                {count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums ring-1 ring-inset',
                      dark ? 'bg-white/15 text-white ring-white/10' : 'bg-white/90 text-slate-600 ring-slate-200/70',
                    )}
                  >
                    {count}
                  </span>
                )}
              </>
            );
            const pill = 'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium';
            const idle = dark ? 'border-white/15 bg-white/10 text-white/90 backdrop-blur hover:border-white/30 hover:bg-white/15' : cn(tone.node, 'hover:shadow-sm');
            const lit = dark ? 'border-white/60 bg-white text-slate-900 shadow-lg shadow-black/20' : tone.nodeOn;
            return (
              // The entrance plays on the wrapper, so it never holds the pill's own hover lift.
              <span key={stage} className="relative shrink-0 motion-safe:animate-card-in" style={{ animationDelay: `${200 + i * 70}ms` }}>
                {!count ? (
                  <span className={cn(pill, dark ? 'border-dashed border-white/15 text-white/40' : 'border-dashed border-slate-200 bg-white/70 text-slate-400')}>{inner}</span>
                ) : onSelect ? (
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSelect(on ? null : stage)}
                    className={cn(pill, 'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 motion-safe:hover:-translate-y-0.5', on ? lit : idle)}
                  >
                    {inner}
                  </button>
                ) : (
                  <span className={cn(pill, idle)}>{inner}</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
