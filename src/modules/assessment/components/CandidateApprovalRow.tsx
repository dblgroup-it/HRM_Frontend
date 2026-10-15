import { Check, ChevronDown, RotateCcw, X } from 'lucide-react';

import { Button, Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { CvLink } from '@modules/candidates/components/CvLink';

import { recommendationLabel, recommendationTone } from './recommendation';
import type {
  FirstInterviewApprovalRow,
  HeadDecision,
} from '../types/assessment.types';

/**
 * One candidate awaiting the Factory HR Head's approval, and the reason
 * dialog for returning or rejecting — shared by Candidate Approvals in the app
 * and the page the Candidate Approval email opens, so both read the same.
 */

/** A decision that needs a reason before it goes. */
export interface PendingAction {
  decision: Exclude<HeadDecision, 'approve'>;
  ids: string[];
  label: string;
}

/** Already decided — shown instead of the actions (the emailed page). */
export interface DecidedState {
  status: 'approved' | 'returned' | 'rejected' | 'pending';
  by: string | null;
  note: string | null;
}

/** A bare tick box — the shared Checkbox is a bordered card, too big for a row. */
export function TickBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
    />
  );
}

function pct(row: FirstInterviewApprovalRow): number | null {
  const { averageTotal, maxTotal } = row.interview;
  if (averageTotal === null || !maxTotal) return null;
  return Math.round((averageTotal / maxTotal) * 100);
}

export function ApprovalRow({
  row,
  checked,
  open,
  busy,
  onToggle,
  onExpand,
  onApprove,
  onReject,
  onReturn,
  decided,
  actions = true,
  hideNote = false,
}: {
  row: FirstInterviewApprovalRow;
  checked: boolean;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  onReturn: () => void;
  /** Set once someone has decided: a status in place of the actions. */
  decided?: DecidedState | null;
  /** False when the page draws the buttons itself (a lone candidate). */
  actions?: boolean;
  /** The page already shows Factory HR's note (one note for a whole send). */
  hideNote?: boolean;
}) {
  const done = Boolean(decided && decided.status !== 'pending');
  const act = actions && !done;
  const score = pct(row);
  const verdicts = row.interview.panel.filter((p) => p.recommendation);
  return (
    <div className={cn('transition-colors', checked && 'bg-brand-50/40')}>
      <div
        className={cn(
          'flex items-start gap-3 px-4 py-3.5',
          // A phone puts the decision under the candidate, not beside it.
          done && 'flex-wrap sm:flex-nowrap'
        )}
      >
        {actions && (
          <div className={cn('pt-0.5', !act && 'invisible')}>
            <TickBox
              checked={checked}
              onChange={onToggle}
              label={`Select ${row.candidateName}`}
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {row.candidateName}
            </p>
            {score !== null && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[0.625rem] font-bold tabular-nums',
                  score >= 70
                    ? 'bg-emerald-50 text-emerald-700'
                    : score >= 50
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                )}
                title={`Average ${row.interview.averageTotal} of ${row.interview.maxTotal}`}
              >
                {score}%
              </span>
            )}
            {verdicts.map((p, i) => (
              <span
                key={`${p.name}-${i}`}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ring-1',
                  recommendationTone(p.recommendation!)
                )}
                title={`${p.name}'s recommendation`}
              >
                {recommendationLabel(p.recommendation!)}
              </span>
            ))}
          </div>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {row.requisition.designation} · {row.requisition.unitFactory}
          </p>
          <p className="mt-1 text-[0.6875rem] text-slate-400">
            {row.requisition.code}
            {row.submittedBy ? ` · sent by ${row.submittedBy}` : ''}
            {` · ${formatDate(row.submittedAt)}`}
          </p>

          {row.note && !hideNote && (
            <p className="mt-2 border-l-2 border-slate-200 pl-2.5 text-xs italic text-slate-600">
              {row.note}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExpand}
              className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-slate-500 hover:text-slate-800"
            >
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform',
                  open && 'rotate-180'
                )}
              />
              {open ? 'Hide interview' : 'View interview'}
            </button>
            <CvLink
              cvUrl={row.cvUrl}
              profileCvUrl={row.profileCvUrl}
              profileCvSource={row.profileCvSource}
              label="CV"
              className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-brand-600 hover:text-brand-800"
            />
          </div>
        </div>

        {done && decided ? (
          <DecidedChip decided={decided} />
        ) : !act ? null : (
          <div className="flex shrink-0 items-center gap-1">
            <IconAction
              title="Approve — send for the second interview"
              tone="ok"
              disabled={busy}
              onClick={onApprove}
              icon={Check}
            />
            <IconAction
              title="Reject this candidate"
              tone="alert"
              disabled={busy}
              onClick={onReject}
              icon={X}
            />
            <IconAction
              title="Return to Factory HR"
              tone="plain"
              disabled={busy}
              onClick={onReturn}
              icon={RotateCcw}
            />
          </div>
        )}
      </div>

      {open && (
        <div className={cn('space-y-3 px-4 pb-4', actions && 'sm:pl-11')}>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Fact label="Interviewed">
              {row.interview.scheduledAt
                ? formatDate(row.interview.scheduledAt)
                : '—'}
            </Fact>
            <Fact label="Average score">
              {row.interview.averageTotal !== null
                ? `${row.interview.averageTotal} / ${row.interview.maxTotal}`
                : 'Not marked'}
            </Fact>
            <Fact label="Present salary">
              {row.presentSalary != null
                ? `৳ ${row.presentSalary.toLocaleString()}`
                : '—'}
            </Fact>
            <Fact label="Expected salary">
              {row.salaryExpectation != null
                ? `৳ ${row.salaryExpectation.toLocaleString()}`
                : '—'}
            </Fact>
          </div>
          {row.interview.panel.length > 0 ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {row.interview.panel.map((p, i) => (
                <li key={`${p.name}-${i}`} className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      {p.name}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {p.total} / {row.interview.maxTotal}
                    </span>
                    {p.recommendation && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ring-1',
                          recommendationTone(p.recommendation)
                        )}
                      >
                        {recommendationLabel(p.recommendation)}
                      </span>
                    )}
                  </div>
                  {p.comments && (
                    <p className="mt-1 text-xs text-slate-600">{p.comments}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">No panel marks recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <p className="text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-slate-800">{children}</p>
    </div>
  );
}

function IconAction({
  title,
  tone,
  disabled,
  onClick,
  icon: Icon,
}: {
  title: string;
  tone: 'ok' | 'alert' | 'plain';
  disabled?: boolean;
  onClick: () => void;
  icon: typeof Check;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors disabled:opacity-40',
        tone === 'ok' &&
          'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
        tone === 'alert' &&
          'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
        tone === 'plain' && 'hover:bg-slate-50 hover:text-slate-800'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/** Returning or rejecting overrules the interviewer, so it carries a reason. */
export function DecisionDialog({
  pending,
  note,
  busy,
  onNote,
  onCancel,
  onConfirm,
}: {
  pending: PendingAction | null;
  note: string;
  busy: boolean;
  onNote: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const reject = pending?.decision === 'reject';
  const enough = note.trim().length >= 3;
  return (
    <Modal
      open={Boolean(pending)}
      onClose={onCancel}
      size="md"
      title={
        reject ? 'Reject after the first interview' : 'Return to Factory HR'
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={reject ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={!enough}
            isLoading={busy}
          >
            {reject ? 'Reject' : 'Return'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{pending?.label}</span>{' '}
          {reject
            ? 'will be rejected and taken off the pipeline. Factory HR and the recruiter are told.'
            : 'will go back to Factory HR, still at the first interview. They can put them through again or turn them down.'}
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {reject
              ? 'Reason for rejecting'
              : 'What should Factory HR look at again?'}
          </span>
          <textarea
            autoFocus
            rows={4}
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder={
              reject
                ? 'e.g. Not enough hands-on experience with the knitting line'
                : 'e.g. Confirm the notice period and re-check the practical test'
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
      </div>
    </Modal>
  );
}

const DECIDED_LABEL = {
  approved: 'Approved',
  returned: 'Returned to Factory HR',
  rejected: 'Rejected',
} as const;

function DecidedChip({ decided }: { decided: DecidedState }) {
  if (decided.status === 'pending') return null;
  return (
    <div className="w-full shrink-0 pl-7 sm:w-auto sm:pl-0 sm:text-right">
      <span
        className={cn(
          'inline-flex rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ring-1',
          decided.status === 'approved' &&
            'bg-emerald-50 text-emerald-700 ring-emerald-200',
          decided.status === 'rejected' &&
            'bg-rose-50 text-rose-700 ring-rose-200',
          decided.status === 'returned' &&
            'bg-amber-50 text-amber-700 ring-amber-200'
        )}
      >
        {DECIDED_LABEL[decided.status]}
      </span>
      {decided.by && (
        <p className="mt-1 text-[0.6875rem] text-slate-400">by {decided.by}</p>
      )}
      {decided.note && (
        <p className="mt-1 max-w-[14rem] text-[0.6875rem] italic text-slate-500">
          “{decided.note}”
        </p>
      )}
    </div>
  );
}
