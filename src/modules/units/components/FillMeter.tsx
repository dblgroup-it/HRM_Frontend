import { cn } from '@shared/lib';

/**
 * Filled-vs-sanctioned at a glance.
 *
 * Seat counts are the whole point of this screen, so they get a visual as well
 * as a number — a full bar reads "no hiring needed" instantly, a gap reads
 * "vacancies here".
 */
export function FillMeter({
  filled,
  sanctioned,
  className,
}: {
  filled: number;
  sanctioned: number;
  className?: string;
}) {
  const vacant = Math.max(0, sanctioned - filled);
  const pct = sanctioned > 0 ? Math.min(100, (filled / sanctioned) * 100) : 0;

  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200/80 sm:w-20"
        role="img"
        aria-label={`${filled} of ${sanctioned} seats filled`}
      >
        <span
          className={cn(
            'block h-full rounded-full transition-[width] duration-500 ease-out',
            vacant === 0
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              : 'bg-gradient-to-r from-brand-400 to-brand-600',
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-11 shrink-0 text-right text-xs font-medium tabular-nums text-slate-600">
        {filled}/{sanctioned}
      </span>
    </span>
  );
}
