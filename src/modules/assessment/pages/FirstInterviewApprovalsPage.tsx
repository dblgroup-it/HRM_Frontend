import { useMemo, useState } from 'react';
import { Check, RotateCcw, Search, UserCheck } from 'lucide-react';

import {
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
} from '@shared/components/ui';
import { useMyPermissions } from '@modules/rbac';

import { canApproveFirstInterviews } from '../access';
import {
  useDecideFirstInterviewApprovals,
  useFirstInterviewApprovals,
} from '../hooks/useAssessment';
import {
  ApprovalRow,
  DecisionDialog,
  TickBox,
  type PendingAction,
} from '../components/CandidateApprovalRow';
import type {
  FirstInterviewApprovalRow,
  HeadDecision,
} from '../types/assessment.types';

/**
 * Candidate Approvals — the Factory HR Head's queue (renamed from First
 * Interview Approvals, 2026-10-15). The Head can also decide from the email
 * each send brings (CandidateApprovalLinkPage).
 *
 * Candidates Factory HR put through after a first interview they were handed.
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
        description="Only a Factory HR Head can approve candidates."
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
        title="Candidate Approvals"
        description="Candidates Factory HR put through after the first interview. Approve them to send them to the Corporate Recruiter for the second interview."
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
              description="Something went wrong fetching the candidates. Try again."
            />
          </div>
        ) : all.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<UserCheck className="h-6 w-6" />}
              title="Nothing waiting"
              description="Every candidate Factory HR sent has been dealt with."
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12">
            <EmptyState title="No matches" description="No candidate matches this search." />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 bg-slate-50/70 px-4 py-2.5">
              <TickBox
              label="Select all"
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
                <ApprovalRow
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

