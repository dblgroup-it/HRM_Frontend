import { Check, FileText } from 'lucide-react';

import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import type { Tutorial } from '../types/tutorials.types';

/**
 * A guide's cover. Keeps its A4 shape whatever the card's height — stretched,
 * it would crop sideways. With `tilt` it leans with the pointer, reading the
 * card's `--rx` / `--ry` (see `useTilt`).
 */
export function GuideCover({
  guide,
  className,
  tilt = false,
}: {
  guide: Tutorial;
  className?: string;
  tilt?: boolean;
}) {
  return (
    <div className={cn('shrink-0 self-start [perspective:1000px]', className)}>
      <div
        className={cn(
          'relative aspect-[210/297] w-full overflow-hidden rounded-md bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08),0_10px_24px_-14px_rgba(15,23,42,0.4)] ring-1 ring-slate-200/80',
          tilt &&
            'transition-transform duration-300 ease-out [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]',
        )}
      >
        {guide.thumbUrl ? (
          <img
            src={resolveApiFileUrl(guide.thumbUrl)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50">
            <FileText className="h-6 w-6 text-slate-300" />
          </div>
        )}
      </div>
    </div>
  );
}

/** "Opened" — this person has opened the guide before, on this browser. */
export function OpenedTick() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
      <Check className="h-3 w-3" strokeWidth={2.5} />
      Opened
    </span>
  );
}
