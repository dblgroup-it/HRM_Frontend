import { useState, useEffect, useRef } from 'react';
import {
  ArrowUpFromLine,
  Check,
  Clock,
  History,
  Undo2,
  UserRound,
  X,
} from 'lucide-react';
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
import { useAuthStore } from '@modules/auth';

import type {
  ApprovalDecision,
  ApprovalStep,
  Requisition,
} from '../types/requisition.types';
import {
  useApprovalAction,
  useResubmitRequisition,
} from '../hooks/useRequisitionActions';
import {
  hidesCorporateChain,
  visibleActivity,
  visibleChain,
} from '../approvalVisibility';

export function ApprovalPanel({ requisition }: { requisition: Requisition }) {
  const [note, setNote] = useState('');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const lastDecisionRef = useRef<ApprovalDecision | null>(null);
  const action = useApprovalAction();
  const resubmit = useResubmitRequisition();
  const { data: perms } = useMyPermissions();
  const myUserId = useAuthStore((s) => s.user?.id);

  // Keep the overlay visible for at least 1 s so fast responses don't flicker
  useEffect(() => {
    if (action.isPending) {
      setOverlayVisible(true);
      return;
    }
    const id = setTimeout(() => setOverlayVisible(false), 1000);
    return () => clearTimeout(id);
  }, [action.isPending]);

  /**
   * The requisitioner and the unit's Factory HR see the chain as far as their
   * own unit takes it. Whether Head of Talent Acquisition or the CHRO signs
   * it, and which of them, is corporate business — see `approvalVisibility`.
   */
  const hideCorporate = hidesCorporateChain(perms, myUserId, requisition);
  const { chain, hiddenNames } = visibleChain(requisition, hideCorporate);
  const activity = visibleActivity(requisition, hiddenNames);
  const isRejected = requisition.status === 'rejected';

  // "Need more info" parks the whole chain with the requisitioner: the asking
  // step is held as info_requested and every later step stays pending, so the
  // chain has no active approver until the raiser resends it.
  const infoStep = chain.find((s) => s.status === 'info_requested') ?? null;
  const awaitingRaiser = !!infoStep && !isRejected;

  /**
   * The chain is snapshotted when the requisition is raised, but it does not
   * start until the job analysis is done — so its first step is on the page
   * with nobody entitled to act on it yet.
   */
  const awaitingJobAnalysis = requisition.status === 'pending_job_analysis';

  const nextPendingIndex =
    awaitingRaiser || awaitingJobAnalysis
      ? -1
      : chain.findIndex((s) => s.status === 'pending');
  /**
   * Still with corporate, from a unit-side viewer's point of view.
   *
   * Their chain ends at the last unit step, so with the corporate step hidden
   * a requisition waiting on it looks finished. Saying "fully approved" when
   * it has not been signed is the one thing this must never do — so the fact
   * that it is out of their hands is stated, without saying whose hands.
   */
  const withCorporate =
    hideCorporate &&
    !isRejected &&
    requisition.status === 'pending_approval' &&
    !awaitingRaiser &&
    !awaitingJobAnalysis &&
    chain.every((s) => s.status !== 'pending');
  const allDone =
    !awaitingRaiser &&
    !awaitingJobAnalysis &&
    !withCorporate &&
    nextPendingIndex === -1 &&
    !isRejected;
  const isRaiser =
    !!myUserId && !!requisition.raisedById && requisition.raisedById === myUserId;
  const canResend = awaitingRaiser && (isRaiser || !!perms?.isSuperUser);

  // Can the current user act on the active step? A configured step names one
  // person; legacy chains and the escalated CHRO step still go by role.
  const currentStep = nextPendingIndex >= 0 ? chain[nextPendingIndex] : null;
  const unit = requisition.unitFactory.toLowerCase();
  const isLastStep = nextPendingIndex === chain.length - 1;
  const canAct =
    !currentStep ||
    !!perms?.isSuperUser ||
    (currentStep.approverUserId
      ? currentStep.approverUserId === myUserId
      : (perms?.roles ?? []).some(
          (r) =>
            r.key === currentStep.role &&
            (r.unitId === null || (r.unitName ?? '').toLowerCase() === unit)
        ));

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
        <CardTitle>Sign-off Chain · Step 3</CardTitle>
        <span className="text-xs text-slate-400">
          {chain.filter((s) => s.status === 'approved').length}/{chain.length}{' '}
          approved
        </span>
      </CardHeader>
      <CardBody>
        {awaitingJobAnalysis && (
          <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This chain starts once the job analysis is complete — nobody here
              has anything to sign yet.
            </span>
          </p>
        )}
        <ol className="space-y-1">
          {/* Who raised it. Not a sign-off step — the raiser's own approval is
              implicit in submitting — but the chain is unreadable without it:
              an approver needs to know whose request they are signing. */}
          {requisition.raisedBy && (
            <li className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100 text-slate-500">
                  <UserRound className="h-4 w-4" />
                </span>
                {chain.length > 0 && (
                  <span className="my-1 w-0.5 flex-1 bg-slate-200" />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-3">
                <p className="text-sm font-medium text-slate-800">
                  {requisition.raisedBy}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Raised this requisition · {formatDate(requisition.createdAt)}
                </p>
              </div>
            </li>
          )}

          {chain.map((step, index) => (
            <ChainRow
              key={step.id}
              step={step}
              isLast={index === chain.length - 1}
              isNext={index === nextPendingIndex && !isRejected}
              leadsToActive={index === nextPendingIndex - 1 && !isRejected}
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
                      {isLastStep && (
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
                    <p className="text-xs text-slate-400">
                      “Need more info” sends this back to{' '}
                      {requisition.raisedBy || 'the requisitioner'} to edit.
                      Once they resend it, the chain restarts from the first
                      approver.
                    </p>
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

        {awaitingRaiser && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <Undo2 className="h-4 w-4 shrink-0" />
              Sent back to {requisition.raisedBy || 'the requisitioner'} for
              clarification
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
              {infoStep?.assignee ? `${infoStep.assignee} ` : ''}asked on the “
              {infoStep?.title}” step
              {infoStep?.note ? ` — “${infoStep.note}”` : ''}. Sign-off is paused
              until it is resent, and the chain then restarts from the first
              approver.
            </p>
            {canResend && (
              <div className="mt-3">
                {resubmit.isError && (
                  <p className="mb-2 text-sm text-red-600">
                    {(resubmit.error as Error).message}
                  </p>
                )}
                <Button
                  size="sm"
                  isLoading={resubmit.isPending}
                  leftIcon={<ArrowUpFromLine className="h-4 w-4" />}
                  onClick={() => resubmit.mutate(requisition.id)}
                >
                  Send for approval
                </Button>
                <p className="mt-2 text-xs text-amber-700">
                  Edit the details first if you haven't — resending restarts the
                  chain from step 1.
                </p>
              </div>
            )}
          </div>
        )}

        {withCorporate && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Signed off by this unit and with corporate for final approval —
              you will be notified when it is decided.
            </span>
          </p>
        )}
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

        {activity.length > 0 && <ActivityLog entries={activity} />}
      </CardBody>
      <BusyOverlay
        show={overlayVisible}
        label={DECISION_OVERLAY_LABEL[lastDecisionRef.current ?? ''] ?? 'Submitting decision…'}
      />
    </Card>
  );
}

/** Post-approval status message — updates as Head of Talent Acquisition moves the requisition on. */
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
  edited: 'made an edit',
};

function ActivityLog({ entries }: { entries: Requisition['activityLog'] }) {
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <History className="h-3.5 w-3.5" />
        Activity
      </p>
      <ul className="space-y-2">
        {[...entries].reverse().map((entry, i) => (
          <li key={i} className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{entry.actor}</span>{' '}
            {ACTION_LABEL[entry.action]}
            {entry.note && (
              <span className="text-slate-500"> — “{entry.note}”</span>
            )}
            <span className="text-slate-400">
              {' '}
              · {formatRelative(entry.createdAt)}
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
  leadsToActive,
  children,
}: {
  step: ApprovalStep;
  isLast: boolean;
  isNext: boolean;
  leadsToActive: boolean;
  children?: ReactNode;
}) {
  const approved = step.status === 'approved';
  const rejected = step.status === 'rejected';
  const infoRequested = step.status === 'info_requested';

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300',
            approved
              ? 'animate-loader-pop border-accent-500 bg-accent-500 text-white'
              : rejected
                ? 'border-red-500 bg-red-500 text-white'
                : infoRequested
                  ? 'border-amber-500 bg-amber-50 text-amber-600'
                  : isNext
                    ? 'animate-pulse border-brand-600 bg-brand-50 text-brand-600'
                    : 'border-slate-200 bg-white text-slate-300'
          )}
        >
          {approved ? (
            <Check className="h-4 w-4" />
          ) : rejected ? (
            <X className="h-4 w-4" />
          ) : infoRequested ? (
            <Undo2 className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
        </span>
        {!isLast && (
          <span
            className={cn(
              'my-1 w-0.5 flex-1',
              approved
                ? 'bg-accent-300 transition-colors duration-700 ease-out'
                : leadsToActive
                  ? 'animate-flow-down bg-gradient-to-b from-brand-200 via-brand-500 to-brand-200 bg-[length:100%_50%]'
                  : 'bg-slate-200 transition-colors duration-700 ease-out'
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
