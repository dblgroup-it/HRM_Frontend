import { useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  MessageSquare,
  Send,
  Users,
  XCircle,
} from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Combobox,
  Modal,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import type { BoardApprovalStage } from '../types/board.types';
import {
  useBoardApprovalStatus,
  useBoardGroups,
  useChainApprovers,
  useSendBoardApproval,
} from '../hooks/useBoard';

/* ─── Send-for-approval modal (also exported for use in OnboardingManagePage) ─── */
export function SendApprovalModal({
  candidateId,
  onClose,
}: {
  candidateId: string;
  onClose: () => void;
}) {
  const { data: groups = [] } = useBoardGroups();
  const send = useSendBoardApproval(candidateId);
  const { data: approvers } = useChainApprovers(candidateId);
  // Head of Talent Acquisition is held by several people — the requester names the one who
  // should sign, rather than every holder being emailed.
  const needsCorporateHr = approvers?.startsAt === 'corporate_hr';
  // The CHRO link is reached from either start, so it is named in both cases.
  const needsChro = approvers?.startsAt !== 'board';
  const [corporateHrId, setCorporateHrId] = useState('');
  const [chroId, setChroId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedGroup, setExpandedGroup] = useState<string | null>(groups[0]?.id ?? null);

  const toggle = (userId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  const selectAll = (groupId: string) => {
    const g = groups.find((g) => g.id === groupId);
    if (!g) return;
    setSelected((prev) => {
      const next = new Set(prev);
      g.members.forEach((m) => next.add(m.userId));
      return next;
    });
  };

  return (
    <Modal open onClose={onClose} title="Send for Board Approval" size="md">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          This request travels in order — Head of Talent Acquisition, then the CHRO, then the
          board. Each person gets their own one-click approve link, and the
          board is only emailed once the CHRO has signed off.
        </p>

        {needsCorporateHr && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wider text-slate-500">
              1 · Send to Head of Talent Acquisition
            </p>
            <Combobox
              placeholder="Choose who should approve first"
              options={(approvers?.corporateHr ?? []).map((h) => ({
                value: h.id,
                label: `${h.name} · ${h.employeeCode}`,
              }))}
              value={corporateHrId}
              onChange={setCorporateHrId}
            />
            <p className="mt-2 text-[0.6875rem] leading-5 text-slate-500">
              They approve first, then it goes to the CHRO, and only then to the
              board members chosen below.
            </p>
          </div>
        )}

        {needsChro && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wider text-slate-500">
              2 · Then to CHRO
            </p>
            <Combobox
              placeholder="Choose the CHRO who should approve"
              options={(approvers?.chro ?? []).map((h) => ({
                value: h.id,
                label: `${h.name} · ${h.employeeCode}`,
              }))}
              value={chroId}
              onChange={setChroId}
            />
          </div>
        )}

        <p className="text-[0.75rem] font-semibold uppercase tracking-wider text-slate-500">
          3 · Then to the board
        </p>
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
            <Users className="mx-auto mb-2 h-6 w-6 text-slate-300" />
            <p className="text-sm text-slate-400">No board groups configured yet.</p>
            <p className="text-xs text-slate-400">Set up groups under Configuration → Board Groups.</p>
          </div>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
            {groups.map((g) => (
              <div key={g.id} className="overflow-hidden rounded-xl border border-slate-200">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                    <Users className="h-3.5 w-3.5 text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[0.8125rem] font-semibold text-slate-800">{g.name}</p>
                    <p className="text-[0.6875rem] text-slate-400">
                      {g.members.length} member{g.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); selectAll(g.id); }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[0.625rem] font-medium text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Select all
                  </button>
                  {expandedGroup === g.id
                    ? <ChevronUp className="h-4 w-4 text-slate-400" />
                    : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                {expandedGroup === g.id && (
                  <div className="divide-y divide-slate-50 border-t border-slate-100">
                    {g.members.map((m) => (
                      <label
                        key={m.userId}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors',
                          selected.has(m.userId) ? 'bg-brand-50/60' : 'hover:bg-slate-50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(m.userId)}
                          onChange={() => toggle(m.userId)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <Avatar name={m.user.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.75rem] font-medium text-slate-800">{m.user.name}</p>
                          <p className="text-[0.625rem] text-slate-400">
                            {[m.user.employee?.designation, m.user.email].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        {selected.has(m.userId) && (
                          <Mail className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selected.size > 0 && (
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-[0.75rem] text-brand-700">
            <strong>{selected.size}</strong> member{selected.size !== 1 ? 's' : ''} selected — they
            are emailed once the chain reaches the board.
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={
              selected.size === 0 ||
              send.isPending ||
              (needsCorporateHr && !corporateHrId) ||
              (needsChro && !chroId)
            }
            isLoading={send.isPending}
            onClick={() =>
              send.mutate(
                {
                  memberIds: [...selected],
                  corporateHrId: needsCorporateHr ? corporateHrId : undefined,
                  chroId: needsChro ? chroId : undefined,
                },
                { onSuccess: onClose },
              )
            }
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {needsCorporateHr ? 'Send to Head of Talent Acquisition' : 'Send Approval Emails'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Board Approval Panel — embedded in onboarding sidebar ─── */
export function BoardApprovalPanel({ candidateId }: { candidateId: string }) {
  const { data: approval, isLoading } = useBoardApprovalStatus(candidateId);
  const [showModal, setShowModal] = useState(false);

  const approvedVotes = approval?.votes.filter((v) => v.status === 'approved') ?? [];
  const pendingVotes  = approval?.votes.filter((v) => v.status === 'pending')  ?? [];
  const isApproved    = approval?.status === 'approved';
  const isRejected    = approval?.status === 'rejected';

  // The chain the request travels: who signs, in order, and where it has got
  // to. Without this the panel only ever said "sent to the board".
  const stageOrder: BoardApprovalStage[] = ['corporate_hr', 'chro', 'board'];
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
  /** A stage is done when any of its votes came back approved. */
  const stageState = (stage: BoardApprovalStage) => {
    const votes = approval?.votes.filter((v) => v.stage === stage) ?? [];
    if (votes.some((v) => v.status === 'rejected')) return 'rejected' as const;
    if (votes.some((v) => v.status === 'approved')) return 'approved' as const;
    if (votes.length) return 'waiting' as const;
    return 'upcoming' as const;
  };

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

          {/* Action button — always at the bottom, full width */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[0.8125rem] font-semibold transition-all active:scale-[0.98]',
              approval
                ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
            )}
          >
            <Send className="h-3.5 w-3.5" />
            {approval ? 'Resend / Add Members' : 'Send for Board Approval'}
          </button>
        </CardBody>
      </Card>

      {showModal && (
        <SendApprovalModal candidateId={candidateId} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
