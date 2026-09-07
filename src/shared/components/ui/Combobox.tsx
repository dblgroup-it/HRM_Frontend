import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

import { cn } from '@shared/lib';
import type { SelectOption } from '@shared/types';

export interface ComboboxProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** Show the search box once the list is at least this long. */
  searchThreshold?: number;
  className?: string;
}

/**
 * Select-with-search.
 *
 * The requisition form's vocabulary runs to 130+ departments and 150+
 * designations — a native <select> gives no way to find one except scrolling.
 * Typing here only ever *filters*: the value must still come from the list, so
 * the field stays as constrained as the select it replaces.
 */
export function Combobox({
  label,
  placeholder = 'Select…',
  options,
  value,
  onChange,
  error,
  hint,
  disabled,
  searchThreshold = 10,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /**
   * The panel is portalled to <body> and positioned by hand.
   *
   * Rendered in place it was clipped by any ancestor with `overflow-hidden` —
   * the Approval Paths accordion needs that for its rounded corners, and it
   * cut the 136-department list down to a single visible row.
   */
  const [panelBox, setPanelBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    above: boolean;
  } | null>(null);

  const positionPanel = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const GAP = 4;
    const below = window.innerHeight - r.bottom - GAP;
    const above = r.top - GAP;
    // Flip upward only when there is meaningfully more room there.
    const flip = below < 220 && above > below;
    setPanelBox({
      top: flip ? 0 : r.bottom + GAP,
      left: r.left,
      width: r.width,
      maxHeight: Math.max(160, Math.min(360, flip ? above : below)),
      above: flip,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelBox(null);
      return;
    }
    positionPanel();

    // The app scrolls an inner container, not the window, so listen on every
    // scrollable ancestor of the trigger. A capture listener on window alone
    // left the panel stranded where it opened while the field scrolled away.
    const scrollParents: (HTMLElement | Window)[] = [window];
    for (
      let el = triggerRef.current?.parentElement;
      el;
      el = el.parentElement
    ) {
      const { overflowY, overflow } = getComputedStyle(el);
      if (/(auto|scroll|overlay)/.test(`${overflowY} ${overflow}`)) {
        scrollParents.push(el);
      }
    }

    // Reposition, and give up if the field itself has been scrolled out of
    // sight — a menu floating beside unrelated content is worse than none.
    const onScroll = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      if (r.bottom < 0 || r.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      positionPanel();
    };

    scrollParents.forEach((t) => t.addEventListener('scroll', onScroll));
    window.addEventListener('resize', positionPanel);
    return () => {
      scrollParents.forEach((t) => t.removeEventListener('scroll', onScroll));
      window.removeEventListener('resize', positionPanel);
    };
  }, [open, positionPanel]);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const showSearch = options.length >= searchThreshold;

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return options;
    // Prefix matches first — typing "acc" should surface "Accounts…" ahead of
    // things that merely contain it.
    const starts: SelectOption[] = [];
    const contains: SelectOption[] = [];
    for (const o of options) {
      const label = String(o.label).toLowerCase();
      if (label.startsWith(t)) starts.push(o);
      else if (label.includes(t)) contains.push(o);
    }
    return [...starts, ...contains];
  }, [options, query]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus the search on the next frame, once the popover is mounted.
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = filtered[active];
      if (hit) commit(hit.value);
    }
  };

  return (
    <div className={cn('w-full', className)} ref={rootRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-sm transition',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/30',
            error ? 'border-red-300' : 'border-slate-200 hover:border-slate-300',
            disabled && 'cursor-not-allowed bg-slate-50 text-slate-400',
          )}
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              selected ? 'text-slate-800' : 'text-slate-400',
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              title="Clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="shrink-0 rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-slate-400 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>

        {open &&
          panelBox &&
          createPortal(
            <div
              ref={panelRef}
              // Portalled out of the DOM tree, so components with their own
              // outside-click handling (TreeAddNode, Modal) need a way to tell
              // that a click in here still belongs to the field.
              data-portal-panel="true"
              style={{
                position: 'fixed',
                left: panelBox.left,
                width: panelBox.width,
                maxHeight: panelBox.maxHeight,
                ...(panelBox.above
                  ? { bottom: window.innerHeight - (triggerRef.current?.getBoundingClientRect().top ?? 0) + 4 }
                  : { top: panelBox.top }),
              }}
              className="z-50 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {showSearch && (
              <div className="border-b border-slate-100 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActive(0);
                    }}
                    onKeyDown={onKeyDown}
                    placeholder={`Search ${options.length} options…`}
                    className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-2 text-sm focus:border-brand-300 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <ul
              ref={listRef}
              role="listbox"
              className="flex-1 overflow-y-auto py-1"
            >
              {filtered.map((o, i) => (
                <li key={o.value} data-index={i}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => commit(o.value)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                      i === active ? 'bg-brand-50 text-brand-700' : 'text-slate-700',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.value === value && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                    )}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-slate-400">
                  No match for “{query.trim()}”
                </li>
              )}
            </ul>
            </div>,
            document.body,
          )}
      </div>

      {error ? (
        <p className="mt-1 px-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 px-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
