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
} from 'lucide-react';

import { Avatar, Badge, Button, Card, CardBody, Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import {
  useBoardApprovalStatus,
  useBoardGroups,
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedGroup, setExpandedGroup] = useState<string | null>(groups[0]?.id ?? null);

  const toggle = (userId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
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
          Select board members to send an approval email to. Each member gets a unique one-click
          approve link. A single approval is enough to mark the candidate as{' '}
          <strong className="text-emerald-700">Board Approved</strong>.
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
                    <p className="text-[13px] font-semibold text-slate-800">{g.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {g.members.length} member{g.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); selectAll(g.id); }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
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
                          <p className="text-[12px] font-medium text-slate-800">{m.user.name}</p>
                          <p className="text-[10px] text-slate-400">
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
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-[12px] text-brand-700">
            <strong>{selected.size}</strong> member{selected.size !== 1 ? 's' : ''} selected — each
            will receive an approval email.
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={selected.size === 0 || send.isPending}
            isLoading={send.isPending}
            onClick={() => send.mutate([...selected], { onSuccess: onClose })}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send Approval Emails
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
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Board Approved
              </span>
            )}
          </div>

          {/* Status summary */}
          {!approval ? (
            <p className="text-[12px] text-slate-400">
              Send this candidate for board approval before proceeding with the final hire.
            </p>
          ) : (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
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
                      <p className="truncate text-[12px] font-medium text-slate-800">
                        {vote.member.name}
                      </p>
                      {vote.respondedAt ? (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDate(vote.respondedAt)}
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-500">Awaiting response</p>
                      )}
                    </div>
                    <Badge tone={vote.status === 'approved' ? 'success' : 'neutral'}>
                      {vote.status === 'approved' ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                  {vote.notes && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                      <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                      <p className="text-[11px] leading-relaxed text-slate-600">{vote.notes}</p>
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
              'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-all active:scale-[0.98]',
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
