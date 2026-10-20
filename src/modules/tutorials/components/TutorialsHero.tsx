import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { HiringJourney } from './HiringJourney';

interface Stats {
  guides: number;
  pages: number;
  readingTime: string;
  opened: number;
}

/**
 * The top of the Tutorials page: a greeting, the person's roles, a search
 * across every guide and chapter ("/" jumps to it), a few numbers that count
 * up, and their part of the hiring journey.
 */
export function TutorialsHero({
  greeting,
  intro,
  roles,
  stats,
  query,
  onQuery,
  counts,
  stage,
  onStage,
}: {
  greeting: string;
  intro: string;
  roles: { key: string; name: string }[];
  stats: Stats | null;
  query: string;
  onQuery: (q: string) => void;
  counts: Record<string, number>;
  stage: string | null;
  onStage: ((s: string | null) => void) | null;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-brand-50/60 px-5 py-6 motion-safe:animate-page-in sm:px-8 sm:py-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(#bcdcf1_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_left,black,transparent)] opacity-70"
      />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-brand-700/80">
              Learning hub
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Tutorials</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              <span className="font-medium text-slate-800">{greeting}</span> {intro}
            </p>
            {roles.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {roles.map((r) => (
                  <span
                    key={r.key}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-brand-100"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    {r.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <SearchBox value={query} onChange={onQuery} />
        </div>

        {stats && stats.guides > 1 && (
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/80 ring-1 ring-inset ring-brand-100">
              <div className="h-full rounded-full bg-brand-500 transition-[width] duration-700" style={{ width: `${(stats.opened / stats.guides) * 100}%` }} />
            </div>
            <span className="shrink-0 tabular-nums">
              {stats.opened} of {stats.guides} guides opened · ~{stats.readingTime} to read it all
            </span>
          </div>
        )}

        <HiringJourney counts={counts} selected={stage} onSelect={onStage} />
      </div>
    </section>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);

  // "/" jumps to the search, as on most documentation sites — unless typing somewhere already.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="group/search relative flex w-full shrink-0 items-center lg:w-80">
      <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400 transition-colors group-focus-within/search:text-brand-600" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search guides and chapters"
        aria-label="Search guides and chapters"
        className="h-11 w-full rounded-xl border border-brand-100 bg-white/90 pl-10 pr-11 text-sm text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-2.5 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-3 hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium text-slate-400 sm:inline">
          /
        </kbd>
      )}
    </div>
  );
}
