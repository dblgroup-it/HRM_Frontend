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
        className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200"
        role="img"
        aria-label={`${filled} of ${sanctioned} seats filled`}
      >
        <span
          className={cn(
            'block h-full rounded-full transition-all',
            vacant === 0 ? 'bg-emerald-500' : 'bg-brand-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-500">
        {filled}/{sanctioned}
      </span>
    </span>
  );
}
