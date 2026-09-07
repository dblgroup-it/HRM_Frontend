import { Skeleton } from '@shared/components/ui';

/**
 * Placeholder shaped like a collapsed unit card.
 *
 * Skeletons rather than a centred spinner: the list keeps its geometry while it
 * loads, so nothing jumps when the data lands.
 */
export function UnitSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card"
          style={{ opacity: 1 - i * 0.13 }}
        >
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3 max-w-[14rem]" />
            <Skeleton className="h-2.5 w-1/2 max-w-[20rem]" />
          </div>
          <Skeleton className="hidden h-1.5 w-20 rounded-full md:block" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
