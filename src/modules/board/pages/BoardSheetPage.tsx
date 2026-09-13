import { Fragment, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileText, XCircle } from 'lucide-react';

import { Button, Spinner, Textarea } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { useSheetVote, useSubmitSheetVote } from '../hooks/useBoard';
import type { SheetRow } from '../types/board.types';

const money = (n: number | null) =>
  n == null
    ? '—'
    : `${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}/-`;

/**
 * A Hiring Approval Sheet, opened from the emailed link. No login.
 *
 * The CHRO and the board see the same table Head of Talent Acquisition assembled, and sign
 * it as a whole — one decision for every candidate on it, the way the paper
 * form is signed at the bottom.
 */
export default function BoardSheetPage() {
  const { token = '' } = useParams();
  const { data, isLoading, isError, error } = useSheetVote(token);
  const submit = useSubmitSheetVote(token);
  const [deciding, setDeciding] = useState<'approved' | 'rejected' | null>(null);
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <p className="text-base font-semibold text-slate-900">
            This link can&apos;t be opened
          </p>
          <p className="max-w-sm text-sm leading-6 text-slate-500">
            {(error as Error)?.message ??
              'The link may have expired or already been used.'}
          </p>
        </div>
      </Shell>
    );
  }

  const settled = done ?? (data.alreadyVoted ? data.status : null);

  if (settled) {
    const approved = settled === 'approved';
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full',
              approved
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600',
            )}
          >
            {approved ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : (
              <XCircle className="h-7 w-7" />
            )}
          </span>
          <p className="text-lg font-semibold text-slate-900">
            {approved ? 'Sheet approved' : 'Sheet returned'}
          </p>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Thank you, {data.memberName}. Your decision on{' '}
            <span className="font-semibold text-slate-700">{data.reference}</span>{' '}
            — {data.rows.length} candidate{data.rows.length === 1 ? '' : 's'} —
            has been recorded and HR has been notified.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Ref
            </p>
            <p className="font-mono text-sm font-semibold text-slate-800">
              {data.reference}
            </p>
          </div>
          <p className="text-sm text-slate-500">
            Prepared by{' '}
            <span className="font-semibold text-slate-700">
              {data.preparedBy}
            </span>
          </p>
        </div>

        <p className="mt-5 text-sm leading-7 text-slate-600">
          Dear <span className="font-semibold text-slate-900">{data.memberName}</span>,
          your approval is requested as{' '}
          <span className="font-semibold text-slate-900">{data.stageLabel}</span>{' '}
          for the {data.rows.length} appointment
          {data.rows.length === 1 ? '' : 's'} below. This sheet is approved or
          returned as a whole.
        </p>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[64rem] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[0.6875rem] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 text-center">SL</th>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Position</th>
                <th className="px-3 py-2.5">Dept.</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5">Education</th>
                <th className="px-3 py-2.5 text-center">Req.</th>
                <th className="px-3 py-2.5">Team</th>
                <th className="px-3 py-2.5 text-center">Total Exp.</th>
                <th className="px-3 py-2.5">Last Organization</th>
                <th className="px-3 py-2.5 text-right">Salary</th>
                <th className="px-3 py-2.5">Remark</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r: SheetRow, i: number) => (
                <Fragment key={r.approvalId}>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-2.5 text-center text-slate-400">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">
                    {r.name}
                    {/* An approver asked to sign for a hire should be able to
                        read the CV without leaving the sheet. */}
                    {r.cvUrl && (
                      <a
                        href={r.cvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 flex items-center gap-1 text-[0.6875rem] font-normal text-brand-600 hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        View CV
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{r.position}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.department}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.unit}</td>
                  <td className="max-w-[16rem] px-3 py-2.5 text-slate-600">
                    {r.education || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center text-slate-600">
                    {r.requirement}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{r.team || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-slate-600">
                    {r.totalExperience || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {r.lastOrganization || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                    {money(r.salary)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{r.remark}</td>
                </tr>
                {/* Who signed the vacancy off, under the row it explains —
                    an approver sanctioning a hire wants to see who
                    sanctioned the post. */}
                {r.approvalChain && (
                  <tr>
                    <td
                      colSpan={12}
                      className="bg-slate-50/70 px-3 pb-2 pt-1 text-[0.6875rem] leading-relaxed text-slate-500"
                    >
                      <span className="text-slate-400">Vacancy approved: </span>
                      {r.approvalChain}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {!deciding ? (
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              className="border-rose-200 text-rose-600 hover:bg-rose-50"
              leftIcon={<XCircle className="h-4 w-4" />}
              onClick={() => setDeciding('rejected')}
            >
              Return the sheet
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => setDeciding('approved')}
            >
              Approve all {data.rows.length}
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              'mt-6 space-y-3 rounded-xl border-2 p-4',
              deciding === 'approved'
                ? 'border-emerald-200 bg-emerald-50/50'
                : 'border-rose-200 bg-rose-50/50',
            )}
          >
            <p
              className={cn(
                'text-sm font-semibold',
                deciding === 'approved' ? 'text-emerald-700' : 'text-rose-700',
              )}
            >
              {deciding === 'approved'
                ? `Approving all ${data.rows.length} candidate${data.rows.length === 1 ? '' : 's'} on ${data.reference}`
                : `Returning ${data.reference} — none of the candidates proceed`}
            </p>
            <Textarea
              rows={3}
              label={
                deciding === 'approved' ? 'Remarks (optional)' : 'Reason'
              }
              placeholder={
                deciding === 'approved'
                  ? 'Anything to record with your approval'
                  : 'Why is the sheet being returned?'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {submit.isError && (
              <p className="text-xs text-red-600">
                {(submit.error as Error).message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeciding(null);
                  setNotes('');
                }}
              >
                Back
              </Button>
              <Button
                variant={deciding === 'approved' ? undefined : 'danger'}
                className={
                  deciding === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                    : undefined
                }
                disabled={deciding === 'rejected' && !notes.trim()}
                isLoading={submit.isPending}
                onClick={() =>
                  submit.mutate(
                    { decision: deciding, notes: notes.trim() || undefined },
                    { onSuccess: () => setDone(deciding) },
                  )
                }
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="bg-brand-600 px-6 py-5 text-center">
            <p className="text-lg font-bold tracking-tight text-white">
              DBL Group
            </p>
            <p className="mt-0.5 text-sm text-brand-100">
              Hiring Approval Sheet
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
