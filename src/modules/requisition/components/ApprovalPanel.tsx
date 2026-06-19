import { useState, useEffect, useRef } from 'react';
import { Check, X, Clock, Undo2, History, ArrowUpFromLine } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  BusyOverlay,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Textarea,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate, formatRelative } from '@shared/utils';
import { useMyPermissions } from '@modules/rbac';

import type {
  ApprovalDecision,
  ApprovalStep,
  Requisition,
} from '../types/requisition.types';
import { useApprovalAction } from '../hooks/useRequisitionActions';

export function ApprovalPanel({ requisition }: { requisition: Requisition }) {
  const [note, setNote] = useState('');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const lastDecisionRef = useRef<ApprovalDecision | null>(null);
  const action = useApprovalAction();
  const { data: perms } = useMyPermissions();

  // Keep the overlay visible for at least 1 s so fast responses don't flicker
  useEffect(() => {
    if (action.isPending) {
      setOverlayVisible(true);
      return;
    }
    const id = setTimeout(() => setOverlayVisible(false), 1000);
    return () => clearTimeout(id);
  }, [action.isPending]);

  const chain = requisition.approvalChain;
  const nextPendingIndex = chain.findIndex((s) => s.status === 'pending');
  const isRejected = requisition.status === 'rejected';
  const allDone = nextPendingIndex === -1 && !isRejected;
  const canRollback = nextPendingIndex > 0;

  // Can the current user act on the active step?
  const currentStep = nextPendingIndex >= 0 ? chain[nextPendingIndex] : null;
  const unit = requisition.unitFactory.toLowerCase();
  const canAct =
    !currentStep ||
    !!perms?.isSuperUser ||
    (perms?.roles ?? []).some(
      (r) =>
        r.key === currentStep.role &&
        (r.unitId === null || (r.unitName ?? '').toLowerCase() === unit)
    );

  const act = (decision: ApprovalDecision) => {
    lastDecisionRef.current = decision;
    action.mutate(
      { id: requisition.id, decision, note },
      { onSuccess: () => setNote('') }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign-off Chain · Step 2</CardTitle>
        <span className="text-xs text-slate-400">
          {chain.filter((s) => s.status === 'approved').length}/{chain.length}{' '}
          approved
        </span>
      </CardHeader>
      <CardBody>
        <ol className="space-y-1">
          {chain.map((step, index) => (
            <ChainRow
              key={step.role}
              step={step}
              isLast={index === chain.length - 1}
              isNext={index === nextPendingIndex && !isRejected}
            >
              {index === nextPendingIndex &&
                !isRejected &&
                (canAct ? (
                  <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-surface-muted p-3">
                    <Textarea
                      rows={2}
                      placeholder="Add a remark (required to request more info)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    {action.isError && (
                      <p className="text-sm text-red-600">
                        {(action.error as Error).message}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        isLoading={
                          action.isPending &&
                          action.variables?.decision === 'approved'
                        }
                        leftIcon={<Check className="h-4 w-4" />}
                        onClick={() => act('approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={
                          action.isPending &&
                          action.variables?.decision === 'rejected'
                        }
                        leftIcon={<X className="h-4 w-4" />}
                        onClick={() => act('rejected')}
                      >
                        Reject
                      </Button>
                      {canRollback && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={note.trim().length < 2}
                          isLoading={
                            action.isPending &&
                            action.variables?.decision === 'need_more_info'
                          }
                          leftIcon={<Undo2 className="h-4 w-4" />}
                          onClick={() => act('need_more_info')}
                        >
                          Need more info
                        </Button>
                      )}
                      {currentStep?.role === 'corporate_hr' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={
                            action.isPending &&
                            action.variables?.decision === 'escalate'
                          }
                          leftIcon={<ArrowUpFromLine className="h-4 w-4" />}
                          onClick={() => act('escalate')}
                        >
                          Send to CHRO
                        </Button>
                      )}
                    </div>
                    {canRollback && (
                      <p className="text-xs text-slate-400">
                        “Need more info” sends this back to{' '}
                        {chain[nextPendingIndex - 1].title} for clarification.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    <Clock className="h-4 w-4" />
                    Awaiting {currentStep?.title} approval
                    {currentStep?.assignee ? ` — ${currentStep.assignee}` : ''}
                  </div>
                ))}
            </ChainRow>
          ))}
        </ol>

        {allDone && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            ✓ {APPROVED_MESSAGE[requisition.status] ?? APPROVED_MESSAGE.approved}
          </p>
        )}
        {isRejected && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            This requisition was rejected during sign-off.
          </p>
        )}

        {requisition.activityLog.length > 0 && (
          <ActivityLog requisition={requisition} />
        )}
      </CardBody>
      <BusyOverlay
        show={overlayVisible}
        label={DECISION_OVERLAY_LABEL[lastDecisionRef.current ?? ''] ?? 'Submitting decision…'}
      />
    </Card>
  );
}

/** Post-approval status message — updates as Corporate HR moves the requisition on. */
const APPROVED_MESSAGE: Record<string, string> = {
  approved: 'Fully approved — ready to generate the role profile.',
  profile_generated: 'Role profile ready — continue to post the vacancy.',
  posted: 'Vacancy posted — now collecting candidates.',
};

const DECISION_OVERLAY_LABEL: Record<string, string> = {
  approved: 'Approving requisition…',
  rejected: 'Rejecting requisition…',
  need_more_info: 'Sending back for clarification…',
  escalate: 'Escalating to CHRO…',
  escalated: 'Escalating to CHRO…',
};

const ACTION_LABEL: Record<ApprovalDecision, string> = {
  approved: 'approved',
  rejected: 'rejected',
  need_more_info: 'requested more info',
  escalate: 'escalated to CHRO',
  escalated: 'escalated to CHRO',
};

function ActivityLog({ requisition }: { requisition: Requisition }) {
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <History className="h-3.5 w-3.5" />
        Activity
      </p>
      <ul className="space-y-2">
        {[...requisition.activityLog].reverse().map((entry, i) => (
          <li key={i} className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{entry.actor}</span>{' '}
            {ACTION_LABEL[entry.action]}
            {entry.note && (
              <span className="text-slate-500"> — “{entry.note}”</span>
            )}
            <span className="text-slate-400">
              {' '}
              · {formatRelative(entry.at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChainRow({
  step,
  isLast,
  isNext,
  children,
}: {
  step: ApprovalStep;
  isLast: boolean;
  isNext: boolean;
  children?: ReactNode;
}) {
  const approved = step.status === 'approved';
  const rejected = step.status === 'rejected';

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
            approved
              ? 'border-accent-500 bg-accent-500 text-white'
              : rejected
                ? 'border-red-500 bg-red-500 text-white'
                : isNext
                  ? 'border-brand-600 bg-brand-50 text-brand-600'
                  : 'border-slate-200 bg-white text-slate-300'
          )}
        >
          {approved ? (
            <Check className="h-4 w-4" />
          ) : rejected ? (
            <X className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
        </span>
        {!isLast && (
          <span
            className={cn(
              'my-1 w-0.5 flex-1',
              approved ? 'bg-accent-300' : 'bg-slate-200'
            )}
          />
        )}
      </div>

      <div className={cn('pb-4', isLast && 'pb-0')}>
        <p className="text-sm font-medium text-slate-800">{step.title}</p>
        <p className="text-xs text-slate-400">
          {step.assignee ? step.assignee : step.subtitle}
        </p>
        {step.note && (
          <p className="mt-1 text-xs italic text-slate-500">“{step.note}”</p>
        )}
        {step.actedAt && (
          <p className="mt-0.5 text-xs text-slate-400">
            {approved ? 'Approved' : rejected ? 'Rejected' : 'Updated'} ·{' '}
            {formatDate(step.actedAt, 'dd MMM yyyy, p')}
          </p>
        )}
        {children}
      </div>
    </li>
  );
}
