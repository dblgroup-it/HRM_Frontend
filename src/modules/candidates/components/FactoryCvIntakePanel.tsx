import { lazy, Suspense, useRef, useState } from 'react';
import { ArrowUpRight, History, Inbox, Send, UploadCloud } from 'lucide-react';

import { Avatar } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
// By path, not the barrel: the requisition barrel already imports this module.
import { cvSourceDisplay } from '@modules/requisition/cvSourceMeta';
import type { CvSource } from '@modules/requisition/types/requisition.types';

import { useSubmittedCvs } from '../hooks/useCandidates';
import type { SubmittedCv } from '../types/candidate.types';
import { GenderBadge } from './GenderBadge';
import { SubmitCvsModal } from './SubmitCvsModal';

const ApplyHistoryModal = lazy(() =>
  import('./ApplyHistoryModal').then((m) => ({ default: m.ApplyHistoryModal })),
);

/**
 * Factory HR / Factory HR Head's part in a published job: sending CVs in.
 *
 * The whole panel is a drop target — drag one PDF or thirty onto it and the
 * dialog opens with them already in. Below is what this person has sent,
 * with the two things worth knowing about each: the gender the AI read off
 * the CV, and whether the same person (by email or mobile) applied before.
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
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null);
  const pick = useRef<HTMLInputElement>(null);
  const { data: sent = [], isLoading } = useSubmittedCvs(reqId);

  const start = (list?: FileList | File[] | null) => {
    setFiles(list ? Array.from(list) : []);
    setOpen(true);
  };

  const referrals = sent.filter((c) => c.referral).length;
  const repeat = sent.filter((c) => c.applyCount > 1).length;

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm motion-safe:animate-rise-in"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) start(e.dataTransfer.files);
      }}
    >
      {/* Drop veil — the whole card takes the files. */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-3xl border-2 border-dashed border-brand-400 bg-brand-50/90 backdrop-blur-sm transition-opacity duration-200',
          dragging ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="text-center">
          <UploadCloud className="mx-auto h-10 w-10 text-brand-600 motion-safe:animate-float" />
          <p className="mt-2 text-sm font-semibold text-brand-800">Drop to send these CVs</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-6 py-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-sky-500 text-white shadow-md shadow-brand-600/20">
          <Send className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">Send CVs to the recruiter</h2>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {reqLabel} · they arrive as Applied, and the recruiter shortlists.
          </p>
        </div>
        <dl className="flex divide-x divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
          <Metric label="Sent" value={sent.length} />
          <Metric label="Referrals" value={referrals} tone="fuchsia" />
          <Metric label="Applied before" value={repeat} tone="amber" />
        </dl>
      </div>

      {/* The drop zone */}
      <div className="px-6 pt-5">
        <input
          ref={pick}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) start(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="group relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-brand-50/40 px-6 py-7 text-center transition-colors duration-300 hover:border-brand-300 sm:flex-row sm:text-left">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-brand-200/30 blur-2xl transition-transform duration-500 group-hover:scale-125"
          />
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200 transition-transform duration-300 group-hover:-translate-y-1">
            <UploadCloud className="h-7 w-7" />
          </span>
          <div className="relative min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">
              Drag CVs here — one, or up to thirty
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              PDF only. Then say how they reached you — a job site, a campus, or an
              employee who referred them.
            </p>
          </div>
          <div className="relative flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => pick.current?.click()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Browse files
            </button>
            <button
              type="button"
              onClick={() => start()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.98]"
            >
              <Send className="h-4 w-4" />
              Send CVs
            </button>
          </div>
        </div>
      </div>

      {/* What they sent */}
      <div className="px-6 pb-6 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Sent by you</p>
          {sent.length > 0 && (
            <p className="text-xs text-slate-400">
              Male / Female and &ldquo;Applied&rdquo; show once the AI has read the CV
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : sent.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
            <Inbox className="h-5 w-5 shrink-0 text-slate-300" />
            Nothing sent yet for this job.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {sent.map((c, i) => (
              <SentRow
                key={c.id}
                cv={c}
                index={i}
                onHistory={() => setHistory({ id: c.id, name: c.name })}
              />
            ))}
          </ul>
        )}
      </div>

      <SubmitCvsModal
        reqId={reqId}
        reqLabel={reqLabel}
        cvSources={cvSources}
        open={open}
        initialFiles={files}
        onClose={() => {
          setOpen(false);
          setFiles([]);
        }}
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

function SentRow({
  cv,
  index,
  onHistory,
}: {
  cv: SubmittedCv;
  index: number;
  onHistory: () => void;
}) {
  const source = cvSourceDisplay(cv.cvSource);
  const SourceIcon = source?.icon;
  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="group flex flex-wrap items-center gap-x-4 gap-y-2 bg-white px-4 py-3 transition-colors hover:bg-slate-50/80 motion-safe:animate-card-in"
    >
      <Avatar name={cv.name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-slate-800">{cv.name}</span>
          <GenderBadge gender={cv.gender} />
          {cv.applyCount > 1 && (
            <button
              type="button"
              onClick={onHistory}
              title="Where else this person applied"
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.625rem] font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
            >
              <History className="h-2.5 w-2.5" />
              Applied {cv.applyCount}×
            </button>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {[cv.phone, cv.email].filter(Boolean).join(' · ') || 'Contact is read from the CV'}
        </p>
      </div>

      {source && SourceIcon && (
        <span
          className={cn(
            'inline-flex max-w-[16rem] items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-xs font-medium',
            source.tone,
          )}
          title={
            cv.referral
              ? [cv.referral.employeeCode, cv.referral.name, cv.referral.designation]
                  .filter(Boolean)
                  .join(' – ')
              : undefined
          }
        >
          <SourceIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {cv.referral ? `Referred by ${cv.referral.name}` : source.label}
          </span>
        </span>
      )}

      <span className="w-24 text-right text-xs tabular-nums text-slate-400">
        {formatDate(cv.createdAt)}
      </span>
      {cv.cvUrl ? (
        <a
          href={cv.cvUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
        >
          CV
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
        </a>
      ) : (
        <span className="w-10" />
      )}
    </li>
  );
}

function Metric({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'amber' | 'fuchsia';
}) {
  const color =
    value > 0 && tone === 'amber'
      ? 'text-amber-600'
      : value > 0 && tone === 'fuchsia'
        ? 'text-fuchsia-600'
        : 'text-slate-800';
  return (
    <div className="px-4 py-2 text-center">
      <dd className={cn('text-lg font-bold tabular-nums leading-tight', color)}>{value}</dd>
      <dt className="text-[0.625rem] font-medium uppercase tracking-wider text-slate-400">{label}</dt>
    </div>
  );
}
