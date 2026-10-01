import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  Landmark,
  Users,
  XCircle,
} from 'lucide-react';

import { Button, FullPageSpinner, Textarea } from '@shared/components/ui';
import { formatDate } from '@shared/utils';
import { cn } from '@shared/lib';

import { requisitionApi } from '../api/requisition.api';

/**
 * A board member's emailed requisition link. No sign-in: the token in the
 * address is the key, and it opens this one requisition only.
 */
export default function RequisitionBoardVotePage() {
  const { token = '' } = useParams<{ token: string }>();
  const info = useQuery({
    queryKey: ['requisition-board', token],
    queryFn: () => requisitionApi.boardVoteInfo(token),
    retry: false,
  });
  const [note, setNote] = useState('');
  const [result, setResult] = useState<
    'approved' | 'rejected' | 'already' | null
  >(null);
  const vote = useMutation({
    mutationFn: (decision: 'approved' | 'rejected') =>
      requisitionApi.boardVote(token, decision, note.trim() || undefined),
    onSuccess: (res, decision) =>
      setResult(res.alreadyVoted || res.alreadyDecided ? 'already' : decision),
  });

  if (info.isLoading) return <FullPageSpinner label="Loading the requisition…" />;
  if (info.isError || !info.data) {
    return (
      <Shell>
        <Notice
          tone="red"
          icon={<XCircle className="h-8 w-8 text-red-500" />}
          title="Link not found"
          body="This approval link is not valid. Please use the link in your most recent email."
        />
      </Shell>
    );
  }
  const d = info.data;
  const r = d.requisition;

  if (result === 'approved' || result === 'rejected') {
    return (
      <Shell>
        <Notice
          tone={result === 'approved' ? 'green' : 'red'}
          icon={
            result === 'approved' ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )
          }
          title={result === 'approved' ? 'Requisition approved' : 'Requisition rejected'}
          body={`Thank you, ${d.voter}. Your decision on ${r.code} has been recorded and HR has been notified.`}
        />
      </Shell>
    );
  }
  if (result === 'already' || d.status !== 'pending' || d.decided) {
    const outcome = d.decided?.outcome ?? (d.status === 'pending' ? null : d.status);
    return (
      <Shell>
        <Notice
          tone="slate"
          icon={<BadgeCheck className="h-8 w-8 text-slate-500" />}
          title="Already decided"
          body={
            d.status !== 'pending'
              ? `You already ${d.status} ${r.code}.`
              : d.decided
                ? `${d.decided.by} has already ${d.decided.outcome} ${r.code} on behalf of the board.`
                : `${r.code} has already been decided${outcome ? ` (${outcome})` : ''}.`
          }
        />
      </Shell>
    );
  }
  if (d.expired) {
    return (
      <Shell>
        <Notice
          tone="amber"
          icon={<Clock className="h-8 w-8 text-amber-600" />}
          title="This link has expired"
          body="Please ask HR to send the requisition again."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm text-slate-500">Dear {d.voter},</p>
      <h1 className="mt-1 text-lg font-bold text-slate-800">
        {r.designation}
      </h1>
      <p className="text-sm text-slate-500">
        {r.code} · {r.requiredPosts} post{r.requiredPosts === 1 ? '' : 's'} ·{' '}
        {r.requirementType === 'new' ? 'New position' : 'Replacement'}
      </p>

      <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4">
        <Row icon={<Building2 className="h-4 w-4" />} label="Unit" value={r.unit} />
        <Row icon={<Users className="h-4 w-4" />} label="Department" value={[r.department, r.section].filter(Boolean).join(' · ')} />
        <Row icon={<Landmark className="h-4 w-4" />} label="Place of posting" value={r.placeOfPosting} />
        <Row icon={<Clock className="h-4 w-4" />} label="Needed by" value={r.neededDate ? formatDate(r.neededDate) : '—'} />
        <Row icon={<Users className="h-4 w-4" />} label="Raised by" value={r.raisedBy ?? '—'} />
      </div>

      {[
        ['Job description', r.jobDescription],
        ['Education', r.education],
        ['Experience', r.experience],
      ].map(([label, text]) =>
        text ? (
          <section key={label} className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
              {text}
            </p>
          </section>
        ) : null
      )}

      <section className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Approvals so far
        </p>
        <ol className="mt-2 space-y-1.5">
          {r.chain.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span
                className={cn(
                  'mt-1 h-2 w-2 shrink-0 rounded-full',
                  s.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-300'
                )}
              />
              <span className="text-slate-700">
                <span className="font-medium">{s.title}</span>
                {s.assignee ? ` · ${s.assignee}` : ''}
                {s.note ? <span className="text-slate-500"> — “{s.note}”</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <Textarea
          rows={3}
          placeholder="Remarks (required to reject)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {vote.isError && (
          <p className="mt-2 text-sm text-red-600">
            {(vote.error as Error).message}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            fullWidth
            isLoading={vote.isPending && vote.variables === 'approved'}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
            onClick={() => vote.mutate('approved')}
          >
            Approve
          </Button>
          <Button
            fullWidth
            variant="danger"
            disabled={note.trim().length < 2}
            isLoading={vote.isPending && vote.variables === 'rejected'}
            leftIcon={<XCircle className="h-4 w-4" />}
            onClick={() => vote.mutate('rejected')}
          >
            Reject
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">
          The first board member to decide settles this requisition.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg,#0d1f3c,#1877c0)' }}
          >
            <Landmark className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[0.9375rem] font-bold text-slate-800">DBL Group HR</p>
            <p className="text-[0.6875rem] text-slate-400">Board Approval · Manpower Requisition</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

function Notice({
  tone,
  icon,
  title,
  body,
}: {
  tone: 'red' | 'green' | 'amber' | 'slate';
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const bg = {
    red: 'bg-red-100',
    green: 'bg-emerald-100',
    amber: 'bg-amber-100',
    slate: 'bg-slate-100',
  }[tone];
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className={cn('flex h-16 w-16 items-center justify-center rounded-2xl', bg)}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-slate-800">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{body}</p>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 text-[0.8125rem]">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <span className="w-28 shrink-0 text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value || '—'}</span>
    </div>
  );
}
