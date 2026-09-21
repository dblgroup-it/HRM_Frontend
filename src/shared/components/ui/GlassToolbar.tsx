import {
  createContext,
  useContext,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

import { useFitLabels } from '@shared/hooks';
import { cn } from '@shared/lib';

/** The frosted bar itself — shared with the requisition's lifecycle tabs. */
export const glassSurface =
  'rounded-full border border-white/80 bg-white/60 p-1.5 ring-1 ring-slate-900/[0.06] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_32px_-14px_rgba(15,42,69,0.28)]';

/** The colour the glass is frosting — a translucent bar on a pale page is grey. */
export const glassGlow =
  'pointer-events-none absolute -inset-x-4 inset-y-0 -z-10 rounded-full bg-gradient-to-r from-brand-200/40 via-sky-100/50 to-accent-200/40 blur-xl';

/** The brand pill — the active tab, the primary action. */
export const glassPill =
  'rounded-full bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_18px_-8px_rgba(24,119,192,0.75)]';

const CompactContext = createContext(false);

/**
 * A row of actions on one glass bar, with an optional primary pill at the end.
 *
 * The actions show their labels when they all fit and drop to icons when they
 * don't (useFitLabels); narrower still they scroll sideways with faded edges.
 * The primary action never scrolls away.
 */
export function GlassToolbar({
  children,
  primary,
  label,
  className,
}: {
  children: ReactNode;
  /** A GlassToolbarPrimary — kept outside the scrolling row. */
  primary?: ReactNode;
  /** What the group is, for screen readers. */
  label: string;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const { compact, refit, maskStyle } = useFitLabels({
    frameRef,
    barRef,
    rowRef,
  });

  return (
    <CompactContext.Provider value={compact}>
      <div ref={frameRef} className={cn('flex min-w-0 justify-end', className)}>
        <div className="relative isolate max-w-full">
          <div aria-hidden className={glassGlow} />
          <div
            ref={barRef}
            role="toolbar"
            aria-label={label}
            className={cn('flex items-center gap-1', glassSurface)}
          >
            <div
              ref={rowRef}
              onScroll={refit}
              className="flex min-w-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={maskStyle}
            >
              {children}
            </div>
            {primary}
          </div>
        </div>
      </div>
    </CompactContext.Provider>
  );
}

const tones = {
  neutral: 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
  danger: 'text-rose-600 hover:bg-rose-50/90',
  bdjobs: 'text-[#d9652c] hover:bg-orange-50/90',
  success: 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80',
  magic:
    'animate-gradient-pan bg-[length:200%_200%] bg-gradient-to-r from-brand-600 via-violet-600 to-brand-600 text-white shadow-sm shadow-violet-500/30 hover:brightness-110',
} as const;

/** One action on a GlassToolbar. Its label is also its accessible name. */
export function GlassToolbarButton({
  icon,
  children,
  tone = 'neutral',
  title,
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ReactNode;
  /** The label — shown when there is room, the tooltip when there is not. */
  children: string;
  tone?: keyof typeof tones;
}) {
  const compact = useContext(CompactContext);
  return (
    <button
      type="button"
      aria-label={children}
      title={title ?? (compact ? children : undefined)}
      className={cn(
        'group inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200',
        'focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
        compact ? 'w-9 justify-center' : 'px-3.5',
        tones[tone],
        className,
      )}
      {...props}
    >
      <span className="flex shrink-0 transition-transform duration-200 group-hover:scale-110 group-disabled:scale-100 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      {!compact && <span>{children}</span>}
    </button>
  );
}

/** A hairline between groups of actions. */
export function GlassToolbarDivider() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-slate-900/10" />;
}

/** The primary action at the end of the bar — the brand pill. */
export function GlassToolbarPrimary({
  icon,
  children,
  compactLabel,
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ReactNode;
  children: string;
  /** A shorter label for when the bar is tight — "Add" for "Add candidate". */
  compactLabel?: string;
}) {
  const compact = useContext(CompactContext);
  return (
    <button
      type="button"
      aria-label={children}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap px-4 text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.97]',
        'focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
        glassPill,
        className,
      )}
      {...props}
    >
      <span className="flex shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {compact && compactLabel ? compactLabel : children}
    </button>
  );
}
