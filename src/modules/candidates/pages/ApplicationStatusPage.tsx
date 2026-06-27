import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  SearchX,
  XCircle,
} from 'lucide-react';

import { Logo } from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';
import { candidatesApi } from '../api/candidates.api';
import type { ApplicationStatus } from '../types/candidate.types';

const STAGE_STEPS = ['applied', 'shortlisted', 'interview', 'final', 'selected'] as const;

const STAGE_LABEL: Record<string, string> = {
  applied: 'Applied',
  ai_shortlisted: 'Shortlisted',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  final: 'Final Round',
  selected: 'Selected',
  rejected: 'Not Selected',
};

const STAGE_ORDER: Record<string, number> = {
  applied: 0,
  ai_shortlisted: 1,
  shortlisted: 1,
  interview: 2,
  final: 3,
  selected: 4,
  rejected: 4,
};

const STAGE_BADGE: Record<string, string> = {
  selected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-600 border-rose-200',
  final: 'bg-purple-50 text-purple-700 border-purple-200',
  interview: 'bg-orange-50 text-orange-700 border-orange-200',
  shortlisted: 'bg-blue-50 text-blue-700 border-blue-200',
  ai_shortlisted: 'bg-blue-50 text-blue-700 border-blue-200',
  applied: 'bg-slate-50 text-slate-600 border-slate-200',
};

function StageProgress({ stage }: { stage: string }) {
  const isRejected = stage === 'rejected';
  const current = STAGE_ORDER[stage] ?? 0;

  if (isRejected) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600">
        <XCircle className="h-4 w-4 shrink-0" />
        Application was not progressed further
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto pb-1">
      <div className="flex min-w-[300px] items-center">
        {STAGE_STEPS.map((s, i) => {
          const reached = STAGE_ORDER[s] <= current;
          const isCurrent = STAGE_ORDER[s] === current;
          const isLast = i === STAGE_STEPS.length - 1;
          return (
            <div key={s} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    reached
                      ? isCurrent
                        ? 'border-brand-600 bg-brand-600 shadow-md shadow-brand-200'
                        : 'border-brand-600 bg-brand-600'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {reached ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-200" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold whitespace-nowrap ${
                    isCurrent ? 'text-brand-600' : reached ? 'text-brand-400' : 'text-slate-300'
                  }`}
                >
                  {STAGE_LABEL[s]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`h-0.5 flex-1 mx-1 mb-4 rounded-full transition-all duration-700 ${
                    STAGE_ORDER[STAGE_STEPS[i + 1]] <= current ? 'bg-brand-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApplicationCard({ app, index }: { app: ApplicationStatus; index: number }) {
  const appliedDate = new Date(app.appliedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const badgeCls = STAGE_BADGE[app.stage] ?? STAGE_BADGE['applied'];

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-rise-in"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{app.code}</p>
          <h3 className="mt-0.5 text-base font-bold text-slate-900 leading-snug">{app.designation}</h3>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${badgeCls}`}>
          {STAGE_LABEL[app.stage] ?? app.stage}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          {app.unitFactory}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          Applied {appliedDate}
        </span>
      </div>

      <StageProgress stage={app.stage} />
    </div>
  );
}

export default function ApplicationStatusPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState('');

  const status = useMutation({
    mutationFn: (e: string) => candidatesApi.applicationStatus(e),
  });

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return;
    setSubmitted(trimmed);
    status.mutate(trimmed);
  };

  const apps = status.data ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-30 border-b border-white/20 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <Link
            to={ROUTES.careers}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-brand-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Browse all jobs</span>
            <span className="sm:hidden">Jobs</span>
          </Link>
        </div>
      </header>

      {/* ── Hero strip ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 px-4 py-12 text-center">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl animate-blob-1" aria-hidden />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-accent-400/15 blur-3xl animate-blob-2" aria-hidden />
        <div className="relative z-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm animate-float">
            <Mail className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl animate-rise-in">
            Track Your Application
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/70 animate-rise-in" style={{ animationDelay: '80ms' }}>
            Enter the email you used when applying to see your current stage.
          </p>
        </div>
      </section>

      {/* ── Main content ── */}
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">

          {/* Search form */}
          <form
            onSubmit={submit}
            className="flex gap-2 animate-rise-in"
            style={{ animationDelay: '100ms' }}
          >
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={status.isPending}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 active:scale-95"
            >
              {status.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
            </button>
          </form>

          {/* Results */}
          {status.isSuccess && (
            <div className="mt-7">
              {apps.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm animate-fade-in">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <SearchX className="h-7 w-7 text-slate-300" />
                  </div>
                  <p className="mt-5 font-semibold text-slate-700">No applications found</p>
                  <p className="mt-1.5 text-sm text-slate-400">
                    No application submitted using{' '}
                    <span className="font-medium text-slate-600">{submitted}</span>.
                  </p>
                  <Link
                    to={ROUTES.careers}
                    className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-95"
                  >
                    Browse open positions
                  </Link>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-sm text-slate-500 animate-fade-in">
                    Found{' '}
                    <span className="font-semibold text-slate-700">{apps.length}</span>{' '}
                    {apps.length === 1 ? 'application' : 'applications'} for{' '}
                    <span className="font-semibold text-slate-700">{submitted}</span>
                  </p>
                  <div className="space-y-4">
                    {apps.map((app, i) => (
                      <ApplicationCard key={app.requisitionId} app={app} index={i} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {status.isError && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 animate-fade-in">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Something went wrong. Please try again.
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} DBL Group · All rights reserved
          </p>
          <Link to={ROUTES.careers} className="text-xs text-brand-500 hover:underline">
            Browse all open positions
          </Link>
        </div>
      </footer>
    </div>
  );
}
