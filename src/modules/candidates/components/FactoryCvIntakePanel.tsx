import { lazy, Suspense, useState, type ComponentType } from 'react';
import {
  ArrowRight,
  ExternalLink,
  FileText,
  Files,
  History,
  Inbox,
  Send,
  UserPlus,
} from 'lucide-react';

import { Avatar } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import type { CvSource } from '@modules/requisition/types/requisition.types';

import { useSubmittedCvs } from '../hooks/useCandidates';
import { GenderBadge } from './GenderBadge';
import { SubmitCvsModal, type SubmitMode } from './SubmitCvsModal';

const ApplyHistoryModal = lazy(() =>
  import('./ApplyHistoryModal').then((m) => ({ default: m.ApplyHistoryModal })),
);

/**
 * Factory HR / Factory HR Head's part in a published job: sending CVs in.
 *
 * Leads Profile & Posting for them, above the public job link — the other way
 * CVs reach the recruiter. Two ways to start (one CV, several), then what this
 * person has already sent: the gender the AI read off each CV, and whether the
 * same person — by email or mobile — has applied to DBL before, and where.
 */
export function FactoryCvIntakePanel({
  reqId,
  reqLabel,
  cvSources,
}: {
  reqId: string;
  reqLabel: string;
  cvSources?: CvSource[];
}) {
  const [open, setOpen] = useState<SubmitMode | null>(null);
  const [history, setHistory] = useState<{ id: string; name: string } | null>(
    null,
  );
  const { data: sent = [], isLoading } = useSubmittedCvs(reqId);

  const referrals = sent.filter((c) => c.referral).length;
  const repeat = sent.filter((c) => c.applyCount > 1).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm motion-safe:animate-rise-in">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-brand-50 via-white to-emerald-50/60 px-5 py-5 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand-200/30 blur-2xl"
        />
        <div className="relative flex flex-wrap items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/25 motion-safe:animate-float">
            <Send className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">
              Send CVs to the recruiter
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              For <span className="font-medium text-slate-700">{reqLabel}</span>.
              They reach the recruiter as Applied, and the recruiter shortlists.
            </p>
          </div>
          {sent.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Stat label="Sent" value={sent.length} />
              <Stat label="Referrals" value={referrals} />
              <Stat label="Applied before" value={repeat} tone="amber" />
            </div>
          )}
        </div>

        {/* The two ways in */}
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
          <ActionTile
            icon={FileText}
            title="One CV"
            hint="With name, mobile and an employee referral"
            onClick={() => setOpen('single')}
          />
          <ActionTile
            icon={Files}
            title="Several CVs"
            hint="Up to 30 PDFs at once, one referral for all"
            onClick={() => setOpen('bulk')}
          />
        </div>
      </div>

      {/* What they sent */}
      <div className="px-5 py-4 sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sent by you
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : sent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
            <Inbox className="h-7 w-7 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No CVs sent yet</p>
            <p className="text-xs text-slate-400">
              Start with one CV or several above.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sent.map((c, i) => (
              <li
                key={c.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="group flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-all duration-200 hover:border-brand-200 hover:shadow-sm motion-safe:animate-card-in"
              >
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {c.name}
                    </span>
                    <GenderBadge gender={c.gender} />
                    {c.applyCount > 1 && (
                      <button
                        type="button"
                        onClick={() => setHistory({ id: c.id, name: c.name })}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.625rem] font-semibold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
                        title="Where else this person applied"
                      >
                        <History className="h-2.5 w-2.5" />
                        Applied {c.applyCount}×
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {[c.phone, c.email].filter(Boolean).join(' · ') ||
                      'Contact is read from the CV'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {c.cvSourceLabel && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      {c.cvSourceLabel}
                    </span>
                  )}
                  {c.referral && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-700"
                      title={[c.referral.employeeCode, c.referral.name, c.referral.designation]
                        .filter(Boolean)
                        .join(' – ')}
                    >
                      <UserPlus className="h-3 w-3" />
                      {c.referral.name}
                    </span>
                  )}
                  <span className="tabular-nums text-slate-400">
                    {formatDate(c.createdAt)}
                  </span>
                  {c.cvUrl && (
                    <a
                      href={c.cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-brand-700 transition-colors hover:bg-brand-50"
                    >
                      CV <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {sent.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            Male / Female and "Applied N×" appear once the AI has read the CV —
            usually within a minute.
          </p>
        )}
      </div>

      <SubmitCvsModal
        reqId={reqId}
        reqLabel={reqLabel}
        cvSources={cvSources}
        open={open !== null}
        initialMode={open ?? 'single'}
        onClose={() => setOpen(null)}
      />
      {history && (
        <Suspense fallback={null}>
          <ApplyHistoryModal
            candidateId={history.id}
            candidateName={history.name}
            onClose={() => setHistory(null)}
          />
        </Suspense>
      )}
    </section>
  );
}

function ActionTile({
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-left shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 motion-safe:hover:-translate-y-0.5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">{title}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:text-brand-600 motion-safe:group-hover:translate-x-0.5" />
    </button>
  );
}

function Stat({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'amber';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white/80 px-3 py-1.5 text-center backdrop-blur-sm',
        tone === 'amber' && value > 0 ? 'border-amber-200' : 'border-slate-200',
      )}
    >
      <p
        className={cn(
          'text-base font-bold tabular-nums leading-tight',
          tone === 'amber' && value > 0 ? 'text-amber-700' : 'text-slate-800',
        )}
      >
        {value}
      </p>
      <p className="text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}
