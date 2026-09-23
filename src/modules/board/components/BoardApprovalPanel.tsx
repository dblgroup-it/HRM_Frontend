import {
  BadgeCheck,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  XCircle,
} from 'lucide-react';

import { Avatar, Badge, Card, CardBody } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import type { BoardApprovalStage } from '../types/board.types';
import { useBoardApprovalStatus, useSendBoardApproval } from '../hooks/useBoard';
import { BOARD_STAGE_ORDER, boardStageState, isOnSheet } from '../utils/stageState';

export function BoardApprovalPanel({ candidateId }: { candidateId: string }) {
  const { data: approval, isLoading } = useBoardApprovalStatus(candidateId);
  const send = useSendBoardApproval(candidateId);

  const approvedVotes = approval?.votes.filter((v) => v.status === 'approved') ?? [];
  const pendingVotes  = approval?.votes.filter((v) => v.status === 'pending')  ?? [];
  const isApproved    = approval?.status === 'approved';
  const isRejected    = approval?.status === 'rejected';

  // The chain the request travels: who signs, in order, and where it has got
  // to. Without this the panel only ever said "sent to the board".
  const stageOrder = BOARD_STAGE_ORDER;
  const stageNames: Record<BoardApprovalStage, string> = {
    corporate_hr: approval?.corporateHr?.name ?? 'Head of Talent Acquisition',
    chro: approval?.chro?.name ?? 'CHRO',
    board: 'Board members',
  };
  const stageTitles: Record<BoardApprovalStage, string> = {
    corporate_hr: 'Head of Talent Acquisition',
    chro: 'CHRO',
    board: 'Board',
  };
  const stageState = (stage: BoardApprovalStage) =>
    approval ? boardStageState(approval, stage) : ('upcoming' as const);
  // The recruiter hands the candidate to Head of Talent Acquisition and that
  // is all — they pick the CHRO and board on the sheet. Sending again is only
  // for a request that is still waiting on them (a nudge) or was rejected.
  const canSend = !isApproved && !isOnSheet(approval);

  if (isLoading) return null;

  return (
    <>
      <Card>
        <CardBody className="space-y-3">
          {/* Section label */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Board Approval
            </p>
            {isApproved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Board Approved
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-rose-700">
                <XCircle className="h-3.5 w-3.5" />
                Rejected
              </span>
            )}
          </div>

          {/* Status summary */}
          {!approval ? (
            <p className="text-[0.75rem] text-slate-400">
              Send this candidate for board approval before proceeding with the final hire.
              Head of Talent Acquisition puts it on a Hiring Approval Sheet and
              chooses the CHRO and board members.
            </p>
          ) : (
            <>
              {/* Where it actually is right now. */}
              <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                {stageOrder.map((stage, i) => {
                  const state = stageState(stage);
                  return (
                    <div key={stage} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold',
                          state === 'approved' && 'bg-emerald-500 text-white',
                          state === 'rejected' && 'bg-rose-500 text-white',
                          state === 'waiting' && 'bg-amber-400 text-white',
                          state === 'upcoming' && 'bg-slate-200 text-slate-500',
                        )}
                      >
                        {state === 'approved' ? '✓' : state === 'rejected' ? '✕' : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.75rem] font-medium text-slate-700">
                          {stageTitles[stage]}
                          <span className="ml-1.5 font-normal text-slate-400">
                            {stageNames[stage]}
                          </span>
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-[0.6875rem] font-medium',
                          state === 'approved' && 'text-emerald-600',
                          state === 'rejected' && 'text-rose-600',
                          state === 'waiting' && 'text-amber-600',
                          state === 'upcoming' && 'text-slate-400',
                        )}
                      >
                        {state === 'approved'
                          ? 'Approved'
                          : state === 'rejected'
                            ? 'Rejected'
                            : state === 'waiting'
                              ? 'Awaiting response'
                              : 'Not yet sent'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {isRejected && approval.rejectedReason && (
                <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[0.75rem] leading-5 text-rose-700">
                  <strong>Rejected:</strong> {approval.rejectedReason}
                </p>
              )}

              <div className="flex items-center gap-2 text-[0.75rem] text-slate-500">
                <span className="font-semibold text-emerald-600">{approvedVotes.length} approved</span>
                {pendingVotes.length > 0 && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-amber-600">{pendingVotes.length} pending</span>
                  </>
                )}
                <span className="text-slate-300">·</span>
                <span>{approval.votes.length} notified</span>
              </div>
            </>
          )}

          {/* Vote list */}
          {approval && approval.votes.length > 0 && (
            <div className="space-y-2">
              {approval.votes.map((vote) => (
                <div
                  key={vote.id}
                  className={cn(
                    'rounded-xl border px-3 py-2.5',
                    vote.status === 'approved'
                      ? 'border-emerald-100 bg-emerald-50/60'
                      : 'border-slate-100 bg-slate-50/60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Avatar name={vote.member.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.75rem] font-medium text-slate-800">
                        {vote.member.name}
                      </p>
                      {vote.respondedAt ? (
                        <div className="flex items-center gap-1 text-[0.625rem] text-slate-400">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDate(vote.respondedAt)}
                        </div>
                      ) : (
                        <p className="text-[0.625rem] text-amber-500">Awaiting response</p>
                      )}
                    </div>
                    <Badge tone={vote.status === 'approved' ? 'success' : 'neutral'}>
                      {vote.status === 'approved' ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                  {vote.notes && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                      <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                      <p className="text-[0.6875rem] leading-relaxed text-slate-600">{vote.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isOnSheet(approval) && (
            <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-[0.75rem] leading-5 text-sky-700">
              On a Hiring Approval Sheet with the {approval?.currentStage === 'chro' ? 'CHRO' : 'board'}.
              Head of Talent Acquisition follows it up from here.
            </p>
          )}

          {canSend && (
            <button
              type="button"
              onClick={() => send.mutate()}
              disabled={send.isPending}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[0.8125rem] font-semibold transition-all active:scale-[0.98] disabled:opacity-60',
                approval
                  ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
              )}
            >
              {send.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {!approval
                ? 'Send for Board Approval'
                : isRejected
                  ? 'Send again for Board Approval'
                  : 'Remind Head of Talent Acquisition'}
            </button>
          )}
        </CardBody>
      </Card>

    </>
  );
}
