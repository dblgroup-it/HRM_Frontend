import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  UserCheck,
  XCircle,
} from 'lucide-react';

import { Button, FullPageSpinner } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import { assessmentApi } from '../api/assessment.api';
import {
  ApprovalRow,
  DecisionDialog,
  TickBox,
  type PendingAction,
} from '../components/CandidateApprovalRow';
import type {
  CandidateApprovalLinkRow,
  HeadDecision,
} from '../types/assessment.types';

const DONE_TOAST: Record<HeadDecision, (n: string) => string> = {
  approve: (n) =>
    `${n} approved — sent to the Corporate Recruiter for the second interview`,
  return: (n) => `${n} returned to Factory HR`,
  reject: (n) => `${n} rejected`,
};

/**
 * What a Candidate Approval email opens (2026-10-15). No sign-in: the token
 * in the address is the key, it covers the candidates that one send carried,
 * and decisions are made as the Factory HR Head it was sent to — the same
 * decisions, rules and notices as Candidate Approvals in the app.
 *
 * One candidate or a whole batch: each can be decided on its own, or every
 * one still waiting approved at once. Returning or rejecting asks a reason.
 */
export default function CandidateApprovalLinkPage() {
  const { token = '' } = useParams<{ token: string }>();
  const info = useQuery({
    queryKey: ['candidate-approval-link', token],
    queryFn: () => assessmentApi.candidateApprovalLink(token),
    retry: false,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');

  const decide = useMutation({
    mutationFn: (input: {
      candidateIds: string[];
      decision: HeadDecision;
      note?: string;
      label: string;
    }) =>
      assessmentApi.decideByApprovalLink(token, {
        candidateIds: input.candidateIds,
        decision: input.decision,
        note: input.note,
      }),
    onSuccess: (res, input) => {
      if (res.decided > 0) {
        const who =
          res.decided === input.candidateIds.length
            ? input.label
            : `${res.decided} candidate${res.decided === 1 ? '' : 's'}`;
        toast.success(DONE_TOAST[input.decision](who));
      }
      for (const r of res.results) if (!r.ok && r.error) toast.warning(r.error);
      setSelected(new Set());
      setPending(null);
      setNote('');
      void info.refetch();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (info.isLoading)
    return <FullPageSpinner label="Loading the candidates…" />;
  if (info.isError || !info.data) {
    return (
      <Shell>
        <Notice
          tone="red"
          icon={<XCircle className="h-8 w-8 text-red-500" />}
          title="Link not found"
          body="This approval link is not valid. Please use the link in your most recent email, or open Candidate Approvals in DBL HRM."
        />
      </Shell>
    );
  }

  const d = info.data;
  const rows = d.candidates;
  const waiting = rows.filter((r) => r.status === 'pending');
  const count = (s: CandidateApprovalLinkRow['status']) =>
    rows.filter((r) => r.status === s).length;
  const one = rows.length === 1;
  // A lone candidate opens with the interview showing — there is nothing
  // else on the page to read.
  const open = expanded ?? new Set(one ? rows.map((r) => r.candidateId) : []);
  // One send carries one note: say it once, not on every row.
  const sharedNote =
    !one && rows.every((r) => r.note && r.note === rows[0].note)
      ? rows[0].note
      : null;

  if (d.expired) {
    return (
      <Shell>
        <Notice
          tone="amber"
          icon={<Clock className="h-8 w-8 text-amber-600" />}
          title="This link has expired"
          body={`It worked until ${formatDate(d.expiresAt)}. ${
            waiting.length
              ? `${waiting.length} candidate${waiting.length === 1 ? ' is' : 's are'} still waiting — you can decide them in DBL HRM.`
              : 'Every candidate it covered has been decided.'
          }`}
        />
        {waiting.length > 0 && (
          <div className="mt-5 flex justify-center">
            <Link to={ROUTES.firstInterviewApprovals}>
              <Button leftIcon={<UserCheck className="h-4 w-4" />}>
                Open Candidate Approvals
              </Button>
            </Link>
          </div>
        )}
      </Shell>
    );
  }

  const chosen = waiting.filter((r) => selected.has(r.candidateId));
  const allChosen = waiting.length > 0 && chosen.length === waiting.length;
  const label = (target: CandidateApprovalLinkRow[]) =>
    target.length === 1
      ? target[0].candidateName
      : `${target.length} candidates`;

  const run = (
    target: CandidateApprovalLinkRow[],
    decision: HeadDecision,
    why?: string
  ) =>
    decide.mutate({
      candidateIds: target.map((r) => r.candidateId),
      decision,
      note: why,
      label: label(target),
    });

  const ask = (
    decision: PendingAction['decision'],
    target: CandidateApprovalLinkRow[]
  ) => {
    if (!target.length) return;
    setNote('');
    setPending({
      decision,
      ids: target.map((r) => r.candidateId),
      label: label(target),
    });
  };

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  return (
    <Shell wide>
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <p className="text-sm text-slate-500">Dear {d.headName},</p>
        <h1 className="mt-1 text-lg font-bold text-slate-800">
          {one
            ? `${rows[0].candidateName} is waiting for your approval`
            : `${rows.length} candidates sent for your approval`}
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {d.submittedBy ?? 'Factory HR'} put {one ? 'this candidate' : 'them'}{' '}
          through the first interview on {formatDate(d.sentAt)}. Approved
          candidates go to the Corporate Recruiter for the second interview.
        </p>
        {sharedNote && (
          <p className="mt-3 border-l-2 border-brand-300 pl-3 text-sm italic text-slate-600">
            {sharedNote}
          </p>
        )}
        {!one && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Count n={waiting.length} label="waiting" tone="slate" />
            <Count n={count('approved')} label="approved" tone="green" />
            <Count n={count('returned')} label="returned" tone="amber" />
            <Count n={count('rejected')} label="rejected" tone="red" />
          </div>
        )}
      </div>

      {waiting.length === 0 ? (
        <div className="flex items-center gap-3 bg-emerald-50/60 px-5 py-3.5 text-sm text-emerald-800 sm:px-6">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>
            All done —{' '}
            {one ? 'this candidate has' : 'every candidate on this link has'}{' '}
            been decided. Nothing more is needed.
          </span>
        </div>
      ) : (
        !one && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-50/70 px-4 py-2.5">
            <TickBox
              label="Select all"
              checked={allChosen}
              onChange={() =>
                setSelected(
                  allChosen
                    ? new Set()
                    : new Set(waiting.map((r) => r.candidateId))
                )
              }
            />
            <span className="text-xs font-medium text-slate-500">
              {chosen.length
                ? `${chosen.length} selected`
                : waiting.length > 1
                  ? `Select all ${waiting.length}`
                  : '1 still waiting'}
            </span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {chosen.length > 0 ? (
                <>
                  <Button
                    size="sm"
                    isLoading={decide.isPending}
                    leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
                    onClick={() => run(chosen, 'approve')}
                  >
                    Approve {chosen.length}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => ask('reject', chosen)}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={decide.isPending}
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    onClick={() => ask('return', chosen)}
                  >
                    Return to Factory HR
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  isLoading={decide.isPending}
                  leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
                  onClick={() => run(waiting, 'approve')}
                >
                  {waiting.length > 1
                    ? `Approve all ${waiting.length}`
                    : 'Approve the last one'}
                </Button>
              )}
            </div>
          </div>
        )
      )}

      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <ApprovalRow
            key={row.candidateId}
            row={row}
            checked={selected.has(row.candidateId)}
            open={open.has(row.candidateId)}
            busy={decide.isPending}
            onToggle={() => setSelected((p) => toggle(p, row.candidateId))}
            onExpand={() => setExpanded(toggle(open, row.candidateId))}
            onApprove={() => run([row], 'approve')}
            onReject={() => ask('reject', [row])}
            onReturn={() => ask('return', [row])}
            decided={{
              status: row.status,
              by: row.decidedBy,
              note: row.decisionNote,
            }}
            actions={!one}
            hideNote={Boolean(sharedNote)}
          />
        ))}
      </div>

      {one && waiting.length === 1 && (
        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:px-6">
          <Button
            fullWidth
            isLoading={decide.isPending}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
            onClick={() => run(waiting, 'approve')}
          >
            Approve
          </Button>
          <Button
            fullWidth
            variant="outline"
            disabled={decide.isPending}
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={() => ask('return', waiting)}
          >
            Return to Factory HR
          </Button>
          <Button
            fullWidth
            variant="danger"
            disabled={decide.isPending}
            leftIcon={<XCircle className="h-4 w-4" />}
            onClick={() => ask('reject', waiting)}
          >
            Reject
          </Button>
        </div>
      )}

      <p className="border-t border-slate-100 px-5 py-3.5 text-center text-xs leading-5 text-slate-400 sm:px-6">
        This link is personal to {d.headName} and works until{' '}
        {formatDate(d.expiresAt)}. If another Factory HR Head decides a
        candidate first, that decision stands.
      </p>

      <DecisionDialog
        pending={pending}
        note={note}
        busy={decide.isPending}
        onNote={setNote}
        onCancel={() => setPending(null)}
        onConfirm={() =>
          pending &&
          run(
            waiting.filter((r) => pending.ids.includes(r.candidateId)),
            pending.decision,
            note.trim()
          )
        }
      />
    </Shell>
  );
}

function Shell({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
      <div className={cn('mx-auto', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg,#0d1f3c,#1877c0)' }}
          >
            <UserCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[0.9375rem] font-bold text-slate-800">
              DBL Group HR
            </p>
            <p className="text-[0.6875rem] text-slate-400">
              Candidate Approval · Factory HR Head
            </p>
          </div>
        </div>
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
            !wide && 'p-6'
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function Count({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: 'slate' | 'green' | 'amber' | 'red';
}) {
  if (!n) return null;
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums ring-1',
        tone === 'slate' && 'bg-slate-50 text-slate-600 ring-slate-200',
        tone === 'green' && 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        tone === 'amber' && 'bg-amber-50 text-amber-700 ring-amber-200',
        tone === 'red' && 'bg-rose-50 text-rose-700 ring-rose-200'
      )}
    >
      {n} {label}
    </span>
  );
}

function Notice({
  tone,
  icon,
  title,
  body,
}: {
  tone: 'red' | 'amber';
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-2xl',
          tone === 'red' ? 'bg-red-100' : 'bg-amber-100'
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-slate-800">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{body}</p>
      </div>
    </div>
  );
}
