import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { LucideIcon } from 'lucide-react';

import { glassGlow, glassPill, glassSurface } from './GlassToolbar';
import { useFitLabels } from '@shared/hooks';
import { cn } from '@shared/lib';

export interface LifecycleTab<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
  /** Shown as a small badge when above zero. */
  count?: number;
}

/**
 * Centred glass tab bar with a sliding pill — the requisition's lifecycle tabs,
 * and Access Control's. Lives in the UI kit because both use it; it knows
 * nothing about either.
 *
 * One row, never wrapped: the old bar wrapped to a second line on a phone and
 * the pill, positioned by offsetLeft alone, slid along the wrong row. When the
 * labelled tabs do not fit the column they sit in, the inactive ones drop to
 * their icon and the active one keeps its label (useFitLabels — measured, not
 * a breakpoint, because the column's width depends on the sidebar as much as
 * the screen). Narrower still, the row scrolls sideways with faded edges.
 *
 * A proper tablist: arrow keys, Home and End move between tabs.
 */
export function LifecycleTabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: LifecycleTab<K>[];
  active: K;
  onChange: (key: K) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(
    null,
  );
  // No slide on first paint — the pill should appear under the tab, not fly
  // in from the left edge.
  const [animate, setAnimate] = useState(false);

  const measurePill = useCallback(() => {
    const el = rowRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
    if (!el) return;
    setPill((prev) =>
      prev && prev.left === el.offsetLeft && prev.width === el.offsetWidth
        ? prev
        : { left: el.offsetLeft, width: el.offsetWidth },
    );
  }, []);

  const { compact, refit, maskStyle } = useFitLabels({
    frameRef,
    barRef,
    rowRef,
    onLayout: measurePill,
  });

  useLayoutEffect(measurePill, [measurePill, active, compact]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Bring the active tab into view when the row overflows. Scrolls the row
  // only — scrollIntoView would also drag the page to the tab bar on load.
  // Instant the first time (arriving on the page), smooth after that.
  const scrolledOnce = useRef(false);
  useEffect(() => {
    const row = rowRef.current;
    const el = row?.querySelector<HTMLElement>('[data-active="true"]');
    if (!row || !el) return;
    if (row.scrollWidth > row.clientWidth) {
      row.scrollTo({
        left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2,
        behavior: scrolledOnce.current ? 'smooth' : 'auto',
      });
    }
    scrolledOnce.current = true;
  }, [active, compact]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.key === active);
    const next =
      e.key === 'ArrowRight'
        ? (i + 1) % tabs.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + tabs.length) % tabs.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].key);
    rowRef.current
      ?.querySelector<HTMLElement>(`[data-key="${tabs[next].key}"]`)
      ?.focus();
  };

  return (
    <div
      ref={frameRef}
      className="animate-rise-in flex justify-center"
      style={{ animationDelay: '110ms', animationFillMode: 'backwards' }}
    >
      <div className="relative isolate max-w-full">
        <div aria-hidden className={glassGlow} />
        <div ref={barRef} className={glassSurface}>
          <div
            ref={rowRef}
            role="tablist"
            aria-label="Requisition sections"
            onKeyDown={onKeyDown}
            onScroll={refit}
            className="relative flex items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={maskStyle}
          >
            {pill && (
              <span
                aria-hidden
                className={cn(
                  'absolute inset-y-0 z-0',
                  glassPill,
                  animate &&
                    'transition-[left,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                )}
                style={{ left: pill.left, width: pill.width }}
              />
            )}
            {tabs.map((t) => {
              const on = t.key === active;
              const Icon = t.icon;
              const count = t.count ?? 0;
              const full = on || !compact;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-label={count > 0 ? `${t.label}, ${count}` : t.label}
                  title={t.label}
                  tabIndex={on ? 0 : -1}
                  data-active={on}
                  data-key={t.key}
                  onClick={() => onChange(t.key)}
                  className={cn(
                    'group relative z-10 inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors duration-300',
                    // The pill sits behind the ring, so the focus ring must
                    // not be offset onto the glass.
                    'focus-visible:ring-offset-0',
                    full ? 'px-3.5 sm:px-4' : 'w-9 justify-center',
                    on
                      ? 'text-white'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform duration-300',
                      on ? 'scale-110' : 'group-hover:scale-110',
                    )}
                  />
                  {full && <span>{t.label}</span>}
                  {count > 0 && full && (
                    <span
                      className={cn(
                        'min-w-[1.25rem] rounded-full px-1.5 text-center text-[0.6875rem] font-semibold tabular-nums leading-5 transition-colors duration-300',
                        on
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-900/[0.06] text-slate-500',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
