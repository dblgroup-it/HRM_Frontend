import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  ClipboardList,
  Loader2,
  MapPin,
  Search,
  Users,
  ChevronRight,
  Clock,
} from 'lucide-react';

import { Logo } from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';
import { candidatesApi } from '../api/candidates.api';
import type { CareerListing } from '../types/candidate.types';

const EMP_LABEL: Record<string, string> = {
  permanent: 'Permanent',
  contractual: 'Contractual',
  part_time: 'Part Time',
  internship: 'Internship',
  probationary: 'Probationary',
};

const EMP_COLOR: Record<string, string> = {
  permanent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  contractual: 'bg-blue-50 text-blue-700 border-blue-200',
  part_time: 'bg-purple-50 text-purple-700 border-purple-200',
  internship: 'bg-amber-50 text-amber-700 border-amber-200',
  probationary: 'bg-orange-50 text-orange-700 border-orange-200',
};

function postedAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function JobCard({ job, index }: { job: CareerListing; index: number }) {
  const empLabel = EMP_LABEL[job.employmentNature] ?? job.employmentNature;
  const empColor = EMP_COLOR[job.employmentNature] ?? 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <div
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg animate-rise-in"
      style={{ animationDelay: `${Math.min(index * 55, 400)}ms`, animationFillMode: 'both' }}
    >
      <div className="flex flex-col flex-1 p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-100">
            <Briefcase className="h-5 w-5 text-brand-600" />
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${empColor}`}>
            {empLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-brand-600 transition-colors line-clamp-2">
          {job.designation}
        </h3>

        {/* Meta */}
        <div className="mt-2.5 space-y-1.5 flex-1">
          <p className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="font-semibold text-slate-700 truncate">{job.unitFactory}</span>
            <span className="text-slate-300 shrink-0">·</span>
            <span className="truncate">{job.department}</span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{job.placeOfPosting}</span>
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              {job.requiredPosts} {job.requiredPosts === 1 ? 'vacancy' : 'vacancies'}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="h-3 w-3" />
              {postedAgo(job.postedAt)}
            </span>
          </div>
        </div>

        {/* Summary */}
        {job.summary && (
          <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-slate-400 border-t border-slate-100 pt-3">
            {job.summary}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <Link
          to={ROUTES.apply(job.id)}
          className="group/btn flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-700 hover:gap-2.5 active:scale-[0.98]"
        >
          Apply Now
          <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

export default function CareersPage() {
  const [search, setSearch] = useState('');
  const [activeUnit, setActiveUnit] = useState('');

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['open-jobs'],
    queryFn: () => candidatesApi.listOpenJobs(),
    staleTime: 60_000,
  });

  const units = useMemo(
    () => [...new Set(jobs.map((j) => j.unitFactory))].sort(),
    [jobs],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return jobs.filter((j) => {
      const matchSearch =
        !q ||
        j.designation.toLowerCase().includes(q) ||
        j.unitFactory.toLowerCase().includes(q) ||
        j.department.toLowerCase().includes(q) ||
        j.placeOfPosting.toLowerCase().includes(q);
      const matchUnit = !activeUnit || j.unitFactory === activeUnit;
      return matchSearch && matchUnit;
    });
  }, [jobs, search, activeUnit]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-30 border-b border-white/20 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <Link
            to={ROUTES.applyStatus}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-600"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Track my application</span>
            <span className="sm:hidden">Track</span>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 px-4 py-16 text-center sm:py-20">
        {/* animated blobs */}
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl animate-blob-1"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-accent-400/15 blur-3xl animate-blob-2"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-brand-300/10 blur-3xl animate-blob-3"
          aria-hidden
        />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/70 backdrop-blur-sm animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-pulse" />
            DBL Group · Now Hiring
          </span>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl animate-rise-in">
            Build Your Career<br className="hidden sm:block" /> at DBL Group
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base animate-rise-in" style={{ animationDelay: '80ms' }}>
            Explore open positions across our units and factories.<br className="hidden sm:block" />
            Find your fit and apply directly — no account needed.
          </p>

          {/* Search bar */}
          <div
            className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-white/10 animate-rise-in"
            style={{ animationDelay: '150ms' }}
          >
            <Search className="ml-2.5 h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by designation, unit, department…"
              className="flex-1 bg-transparent py-2 pr-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mr-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick stats */}
          {!isLoading && jobs.length > 0 && (
            <p className="mt-4 text-xs text-white/50 animate-fade-in" style={{ animationDelay: '250ms' }}>
              {jobs.length} open {jobs.length === 1 ? 'position' : 'positions'} across {units.length} {units.length === 1 ? 'unit' : 'units'}
            </p>
          )}
        </div>
      </section>

      {/* ── Main content ── */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

          {/* Unit filter chips */}
          {units.length > 1 && (
            <div className="mb-6 flex flex-wrap gap-2 animate-fade-in">
              <button
                onClick={() => setActiveUnit('')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  !activeUnit
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-200'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 shadow-sm'
                }`}
              >
                All units
              </button>
              {units.map((u) => (
                <button
                  key={u}
                  onClick={() => setActiveUnit(activeUnit === u ? '' : u)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    activeUnit === u
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-200'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600 shadow-sm'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          )}

          {/* Count line */}
          {!isLoading && (
            <p className="mb-5 text-sm text-slate-400 animate-fade-in">
              {filtered.length === 0
                ? 'No open positions found'
                : `${filtered.length} open ${filtered.length === 1 ? 'position' : 'positions'}`}
              {activeUnit && <span className="font-medium text-slate-600"> · {activeUnit}</span>}
            </p>
          )}

          {/* Grid / States */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 className="h-9 w-9 animate-spin text-brand-400" />
              <p className="text-sm text-slate-400">Loading open positions…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm animate-fade-in">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Briefcase className="h-7 w-7 text-slate-300" />
              </div>
              <p className="mt-5 text-base font-semibold text-slate-700">
                {jobs.length === 0 ? 'No open positions right now' : 'No positions match your search'}
              </p>
              <p className="mt-1.5 text-sm text-slate-400">
                {jobs.length === 0
                  ? 'Check back soon — we update openings regularly.'
                  : 'Try a different keyword or clear your filters.'}
              </p>
              {(search || activeUnit) && (
                <button
                  onClick={() => { setSearch(''); setActiveUnit(''); }}
                  className="mt-5 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition active:scale-95"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((job, i) => (
                <JobCard key={job.id} job={job} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} DBL Group · All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
