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
 * The top of the Tutorials page, kept short: the title and a greeting on
 * one side, the search on the other ("/" jumps to it), and the person's part
 * of the hiring journey underneath. Soft light in the brand colours drifts
 * behind it (motion-safe); the stages arrive one after another.
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
    <section className="relative isolate overflow-hidden rounded-3xl border border-brand-100 bg-white px-5 py-5 shadow-[0_18px_50px_-30px_rgba(24,119,192,0.45)] motion-safe:animate-page-in sm:px-7">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span className="absolute -left-24 -top-32 h-[22rem] w-[22rem] rounded-full bg-brand-200/60 blur-3xl motion-safe:animate-blob-1" />
        <span className="absolute -right-16 -top-24 h-[18rem] w-[18rem] rounded-full bg-[#8cc63f]/25 blur-3xl motion-safe:animate-blob-2" />
        <span className="absolute inset-0 bg-[radial-gradient(#bcdcf1_1px,transparent_1px)] [background-size:18px_18px] opacity-60 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Tutorials<span className="text-brand-500">.</span>
          </h1>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{greeting}</span>{' '}
            <span className="hidden sm:inline">{intro}</span>
          </p>
          {roles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {roles.map((r, i) => (
                <span
                  key={r.key}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-brand-100 motion-safe:animate-card-in"
                  style={{ animationDelay: `${120 + i * 60}ms` }}
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

      <div className="mt-4 border-t border-brand-100 pt-4">
        <HiringJourney
          counts={counts}
          selected={stage}
          onSelect={onStage}
          trailing={
            stats && stats.guides > 1 ? (
              <span className="text-xs tabular-nums text-slate-400">
                {stats.opened} of {stats.guides} opened
              </span>
            ) : null
          }
        />
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
        className="h-10 w-full rounded-xl border border-brand-100 bg-white pl-10 pr-11 text-sm text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 [&::-webkit-search-cancel-button]:hidden"
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
