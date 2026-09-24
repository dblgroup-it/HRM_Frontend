import { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  FileText,
  RotateCcw,
  Search,
  UserCheck,
  X,
} from 'lucide-react';

import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Spinner,
} from '@shared/components/ui';
import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { useMyPermissions } from '@modules/rbac';

import { canApproveFirstInterviews } from '../access';
import {
  useDecideFirstInterviewApprovals,
  useFirstInterviewApprovals,
} from '../hooks/useAssessment';
import { recommendationLabel, recommendationTone } from '../components/recommendation';
import type {
  FirstInterviewApprovalRow,
  HeadDecision,
} from '../types/assessment.types';

/** A decision that needs a reason before it goes. */
interface PendingAction {
  decision: Exclude<HeadDecision, 'approve'>;
  ids: string[];
  label: string;
}

/**
 * The Factory HR Head's queue.
 *
 * Finalists Factory HR put through after a first interview they were handed.
 * Nothing reaches the Corporate Recruiter for the second interview until it
 * is approved here. Built like Medical Approvals — oldest first, searchable,
 * one action for a whole selection — because it is worked the same way.
 */
export default function FirstInterviewApprovalsPage() {
  const { data: perms } = useMyPermissions();
  const allowed = canApproveFirstInterviews(perms);
  const { data, isLoading, isError } = useFirstInterviewApprovals(allowed);
  const decide = useDecideFirstInterviewApprovals();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');

  const all = useMemo(() => data ?? [], [data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) =>
        r.candidateName.toLowerCase().includes(q) ||
        r.requisition.code.toLowerCase().includes(q) ||
        r.requisition.designation.toLowerCase().includes(q) ||
        r.requisition.unitFactory.toLowerCase().includes(q),
    );
  }, [all, search]);

  // Only rows on screen can be swept — acting on rows hidden by a search is
  // how people approve candidates they never looked at.
  const visibleSelected = rows.filter((r) => selected.has(r.candidateId));
  const allVisibleSelected =
    rows.length > 0 && visibleSelected.length === rows.length;

  if (!allowed) {
    return (
      <EmptyState
        title="Not available"
        description="Only a Factory HR Head can approve first-interview finalists."
      />
    );
  }

  const run = (ids: string[], decision: HeadDecision, why?: string) =>
    decide.mutate(
      { candidateIds: ids, decision, note: why },
      {
        onSuccess: () => {
          setSelected(new Set());
          setPending(null);
          setNote('');
        },
      },
    );

  const ask = (
    decision: PendingAction['decision'],
    target: FirstInterviewApprovalRow[],
  ) => {
    if (!target.length) return;
    setNote('');
    setPending({
      decision,
      ids: target.map((r) => r.candidateId),
      label:
        target.length === 1
          ? target[0].candidateName
          : `${target.length} candidates`,
    });
  };

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="First Interview Approvals"
        description="Finalists Factory HR put through after the first interview. Approve them to send them to the Corporate Recruiter for the second interview."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[13rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, designation, unit or requisition"
              className="pl-9"
            />
          </div>
          <p className="text-xs font-medium tabular-nums text-slate-500">
            {all.length} awaiting
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Spinner className="h-4 w-4" />
            Loading the queue…
          </div>
        ) : isError ? (
          <div className="py-12">
            <EmptyState
              title="Could not load the queue"
              description="Something went wrong fetching the finalists. Try again."
            />
          </div>
        ) : all.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<UserCheck className="h-6 w-6" />}
              title="Nothing waiting"
              description="Every finalist Factory HR sent has been dealt with."
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12">
            <EmptyState title="No matches" description="No finalist matches this search." />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 bg-slate-50/70 px-4 py-2.5">
              <Checkbox
                label=""
                checked={allVisibleSelected}
                onChange={() =>
                  setSelected(
                    allVisibleSelected
                      ? new Set()
                      : new Set(rows.map((r) => r.candidateId)),
                  )
                }
              />
              <span className="text-xs font-medium text-slate-500">
                {visibleSelected.length
                  ? `${visibleSelected.length} selected`
                  : `Select all ${rows.length}`}
              </span>
              {visibleSelected.length > 0 && (
                <div className="ml-auto flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    isLoading={decide.isPending}
                    leftIcon={<Check className="h-3.5 w-3.5" />}
                    onClick={() =>
                      run(visibleSelected.map((r) => r.candidateId), 'approve')
                    }
                  >
                    Approve {visibleSelected.length}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => ask('reject', visibleSelected)}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={decide.isPending}
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    onClick={() => ask('return', visibleSelected)}
                  >
                    Return to Factory HR
                  </Button>
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {rows.map((row) => (
                <Row
                  key={row.candidateId}
                  row={row}
                  checked={selected.has(row.candidateId)}
                  open={expanded.has(row.candidateId)}
                  busy={decide.isPending}
                  onToggle={() => setSelected((p) => toggle(p, row.candidateId))}
                  onExpand={() => setExpanded((p) => toggle(p, row.candidateId))}
                  onApprove={() => run([row.candidateId], 'approve')}
                  onReject={() => ask('reject', [row])}
                  onReturn={() => ask('return', [row])}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      <DecisionDialog
        pending={pending}
        note={note}
        busy={decide.isPending}
        onNote={setNote}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && run(pending.ids, pending.decision, note.trim())}
      />
    </div>
  );
}

function pct(row: FirstInterviewApprovalRow): number | null {
  const { averageTotal, maxTotal } = row.interview;
  if (averageTotal === null || !maxTotal) return null;
  return Math.round((averageTotal / maxTotal) * 100);
}

function Row({
  row,
  checked,
  open,
  busy,
  onToggle,
  onExpand,
  onApprove,
  onReject,
  onReturn,
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
}) {
  const score = pct(row);
  const verdicts = row.interview.panel.filter((p) => p.recommendation);
  return (
    <div className={cn('transition-colors', checked && 'bg-brand-50/40')}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="pt-1">
          <Checkbox label="" checked={checked} onChange={onToggle} />
        </div>

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
                      : 'bg-rose-50 text-rose-700',
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
                  recommendationTone(p.recommendation!),
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

          {row.note && (
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
                className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
              />
              {open ? 'Hide interview' : 'View interview'}
            </button>
            {row.cvUrl && (
              <a
                href={resolveApiFileUrl(row.cvUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-brand-600 hover:text-brand-800"
              >
                <FileText className="h-3 w-3" /> CV
              </a>
            )}
          </div>
        </div>

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
      </div>

      {open && (
        <div className="space-y-3 px-3 pb-4 sm:px-4 sm:pl-[3.25rem]">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Fact label="Interviewed">
              {row.interview.scheduledAt ? formatDate(row.interview.scheduledAt) : '—'}
            </Fact>
            <Fact label="Average score">
              {row.interview.averageTotal !== null
                ? `${row.interview.averageTotal} / ${row.interview.maxTotal}`
                : 'Not marked'}
            </Fact>
            <Fact label="Present salary">
              {row.presentSalary != null ? `৳ ${row.presentSalary.toLocaleString()}` : '—'}
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
                    <span className="text-xs font-semibold text-slate-800">{p.name}</span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {p.total} / {row.interview.maxTotal}
                    </span>
                    {p.recommendation && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ring-1',
                          recommendationTone(p.recommendation),
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

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
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
        tone === 'ok' && 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
        tone === 'alert' && 'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
        tone === 'plain' && 'hover:bg-slate-50 hover:text-slate-800',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/** Returning or rejecting overrules the interviewer, so it carries a reason. */
function DecisionDialog({
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
      title={reject ? 'Reject after the first interview' : 'Return to Factory HR'}
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
            {reject ? 'Reason for rejecting' : 'What should Factory HR look at again?'}
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
