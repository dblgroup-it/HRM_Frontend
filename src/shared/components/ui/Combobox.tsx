import { useEffect, useMemo, useRef, useState } from 'react';
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
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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

        {open && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
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
              className="max-h-64 overflow-y-auto py-1"
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
          </div>
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
