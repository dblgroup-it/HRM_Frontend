import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, Building2, CheckCircle2, Clock, FileText, Layers, Sparkles, XCircle } from 'lucide-react';

import { FullPageSpinner } from '@shared/components/ui';
import { useSubmitVote, useVoteInfo } from '../hooks/useBoard';
import { resolveApiFileUrl } from '@shared/api';

export default function BoardVotePage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isLoading, isError } = useVoteInfo(token);
  const submit = useSubmitVote(token);
  const [notes, setNotes] = useState('');
  const [rejectHint, setRejectHint] = useState(false);
  const [done, setDone] = useState(false);

  if (isLoading) return <FullPageSpinner label="Loading approval details…" />;

  /* ── Error / invalid ── */
  if (isError || !data) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">Link not found</p>
            <p className="mt-1 text-sm text-slate-500">This approval link is invalid, expired, or has already been used.</p>
          </div>
        </div>
      </PageShell>
    );
  }

  /* ── Already voted ── */
  if (data.alreadyVoted || done) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">
              {done ? 'Approval submitted!' : 'Already approved'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {done
                ? `Thank you, ${data.memberName}. Your approval has been recorded and HR has been notified.`
                : `You already approved this candidate, ${data.memberName}.`}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <BadgeCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[0.8125rem] font-semibold text-emerald-700">Board Approved</span>
          </div>
        </div>
      </PageShell>
    );
  }

  const c = data.candidate!;

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-[0.8125rem] text-slate-500">Dear <span className="font-semibold text-slate-700">{data.memberName}</span>,</p>
          <p className="mt-1 text-[0.8125rem] text-slate-500 leading-relaxed">
            HR has requested your board approval for the following candidate who is currently in the onboarding process.
            A single board approval is sufficient to proceed.
          </p>
        </div>

        {/* Candidate card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"
            style={{ background: 'linear-gradient(to right,#f8fafc,#eff6ff)' }}>
            <p className="text-xl font-bold text-slate-800">{c.name}</p>
            <p className="mt-0.5 text-[0.8125rem] text-slate-500">{c.designation}</p>
          </div>

          <div className="space-y-2.5 px-5 py-4">
            <InfoRow icon={<Building2 className="h-4 w-4 text-slate-400" />} label="Unit" value={c.unit} />
            <InfoRow icon={<Layers className="h-4 w-4 text-slate-400" />} label="Department" value={c.department} />
            <InfoRow icon={<Clock className="h-4 w-4 text-slate-400" />} label="Requisition" value={c.code} />
            {c.salary !== null && c.salary !== undefined && (
              <InfoRow
                icon={<Sparkles className="h-4 w-4 text-emerald-500" />}
                label="Salary Fixed Amount"
                value={new Intl.NumberFormat('en-BD', {
                  style: 'currency',
                  currency: 'BDT',
                  maximumFractionDigits: 0,
                }).format(c.salary)}
              />
            )}
          </div>

          {c.cvUrl && (
            <div className="border-t border-slate-100 px-5 py-3">
              <a href={resolveApiFileUrl(c.cvUrl)} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 text-[0.8125rem] font-medium text-brand-600 hover:text-brand-700">
                <FileText className="h-4 w-4" />
                View Candidate CV
              </a>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-[0.75rem] font-semibold text-slate-700">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any remarks or comments…"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Approve button */}
        <button
          type="button"
          disabled={submit.isPending}
          onClick={() =>
            submit.mutate(
              { notes: notes || undefined, decision: 'approved' },
              { onSuccess: () => setDone(true) },
            )
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[0.9375rem] font-bold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-60 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#059669,#0d9488)', boxShadow: '0 8px 24px -4px rgba(5,150,105,.35)' }}
        >
          <BadgeCheck className="h-5 w-5" />
          {submit.isPending ? 'Submitting…' : 'Approve Candidate'}
        </button>

        {/* Rejecting stops the chain, so it needs a reason on the record. */}
        <button
          type="button"
          disabled={submit.isPending}
          onClick={() => {
            if (!notes.trim()) {
              setRejectHint(true);
              return;
            }
            submit.mutate(
              { notes: notes.trim(), decision: 'rejected' },
              { onSuccess: () => setDone(true) },
            );
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white py-3.5 text-[0.9375rem] font-semibold text-rose-600 transition-all hover:bg-rose-50 disabled:opacity-60 active:scale-[0.98]"
        >
          <XCircle className="h-5 w-5" />
          Reject
        </button>
        {rejectHint && (
          <p className="mt-2 text-center text-[0.8125rem] text-rose-600">
            Add a short reason above before rejecting.
          </p>
        )}

        <p className="text-center text-[0.6875rem] text-slate-400">
          This link is valid for 30 days and can only be used once.
        </p>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg,#0d1f3c,#1877c0)' }}>
            <BadgeCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[0.9375rem] font-bold text-slate-800">DBL Group HR</p>
            <p className="text-[0.6875rem] text-slate-400">Board Approval Portal</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[0.8125rem]">
      {icon}
      <span className="w-28 shrink-0 text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
