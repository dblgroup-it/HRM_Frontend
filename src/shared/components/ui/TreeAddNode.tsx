import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';

import { cn } from '@shared/lib';

export interface TreeAddNodeProps {
  /** What clicking this node adds, e.g. "Add approval step". */
  label: string;
  /**
   * The existing control this node reveals — a picker, an inline form.
   * Called with a `close` callback so it can collapse the branch when done.
   */
  children: (close: () => void) => ReactNode;
  className?: string;
  panelClassName?: string;
  /**
   * Draw a short connector up into the branch above, for a node that continues
   * a trunk rather than starting one.
   */
  railAbove?: boolean;
}

/**
 * A "+" node that grows the hierarchy from the point it sits on.
 *
 * Hierarchy-building actions used to be full-width dashed buttons, which read
 * as form chrome rather than as part of the tree. Here the control is a node on
 * the connector itself: always visible, clearly interactive, and — when opened
 * — it branches out to the existing picker instead of replacing it.
 *
 * Purely presentational: the action it reveals, and what that action does, are
 * unchanged.
 */
export function TreeAddNode({
  label,
  children,
  className,
  panelClassName,
  railAbove = false,
}: TreeAddNodeProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Collapse the branch when attention moves elsewhere, the way a menu would.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {railAbove && (
        <span
          aria-hidden
          className="absolute -top-3 left-[1.125rem] hidden h-[1.875rem] w-px -translate-x-1/2 bg-slate-200 sm:block"
        />
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group/add relative z-10 inline-flex max-w-full items-center gap-2.5 rounded-full py-0 pr-3.5 text-left',
          'transition-[background-color,box-shadow] duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          open
            ? 'bg-brand-50'
            : 'hover:bg-brand-50/70 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        )}
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white',
            'transition-[transform,background-color,border-color,box-shadow] duration-200',
            'group-hover/add:scale-105 group-active/add:scale-95',
            open
              ? 'border-[1.5px] border-brand-600 bg-brand-600 text-white shadow-[0_4px_10px_-3px_rgba(24,119,192,0.6)]'
              : 'border-[1.5px] border-dashed border-brand-400 bg-brand-50 text-brand-600 shadow-sm group-hover/add:border-solid group-hover/add:border-brand-500 group-hover/add:bg-brand-100 group-hover/add:shadow-md',
          )}
        >
          <Plus
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              open && 'rotate-45',
            )}
          />
        </span>
        <span
          className={cn(
            'truncate text-xs font-semibold transition-colors duration-200',
            open ? 'text-brand-700' : 'text-brand-600 group-hover/add:text-brand-700',
          )}
        >
          {label}
        </span>
      </button>

      {open && (
        <div
          className={cn(
            'relative animate-branch-open pl-7 pt-2 sm:pl-12',
            panelClassName,
          )}
        >
          {/* the branch drawn from the node down to the revealed control */}
          <span
            aria-hidden
            className="absolute left-[1.125rem] top-0 h-[1.375rem] w-px -translate-x-1/2 origin-top animate-rail-draw bg-brand-200"
          />
          <span
            aria-hidden
            className="absolute left-[1.125rem] top-[1.375rem] h-px w-2 rounded bg-brand-200 sm:w-6"
          />
          {children(close)}
        </div>
      )}
    </div>
  );
}
