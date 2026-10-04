/**
 * Interviews tab — full inline workspace replacing the old slide-over drawer.
 * Left: candidate list (interview stage). Right: schedule + history for the
 * selected candidate. Bulk scheduling via modal.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  BadgeDollarSign,
  Loader2,
  Bell,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Lightbulb,
  Lock,
  Mail,
  MailX,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Video,
  UserX,
} from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  BusyOverlay,
  Card,
  CardBody,
  EmptyState,
  Input,
  Modal,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { dhakaInputToIso, formatDate } from '@shared/utils';
import { useAnchoredPanel, useDebounce } from '@shared/hooks';
import { useEmployees } from '@modules/employees';
import type { Requisition } from '@modules/requisition/types/requisition.types';
import {
  RegretMailModal,
  RegretMailToggle,
  useCandidates,
  useSendRegretMail,
  useUpdateCandidate,
} from '@modules/candidates';
import type { Candidate } from '@modules/candidates';
import { SalaryFixationModal, useSalaryFixation } from '@modules/salaryFixation';

import {
  useAddCommitteeMember,
  useAssessmentSetup,
  useCandidateInterviews,
  useGenerateEvaluationSummary,
  useRemoveInterview,
  useResendEvalToken,
  useScheduleInterview,
  useUpdateInterview,
  useRejectAtInterview,
  useAddPanelists,} from '../hooks/useAssessment';
import type {
  InterviewKindKey,
  InterviewModeKey,
  InterviewRoundView,
} from '../types/assessment.types';
import { BulkInterviewModal } from './BulkInterviewModal';
import { PanelGroups, PanelSideToggle } from './PanelGroups';
import { panelHandlers, panelPayload, type PanelEntry } from './panelEntry';
import { heldByLabel } from './heldByLabel';
import {
  recommendationLabel,
  recommendationTone,
} from './recommendation';
import { RescheduleButton, RescheduledNote } from './RescheduleInterview';
import { slotLabel } from './slotLabel';
import { VenueField } from './VenueField';

// ─── constants ────────────────────────────────────────────────────────────────

const KIND_OPTIONS: { value: InterviewKindKey; label: string }[] = [
  { value: 'first',  label: 'First' },
  { value: 'second', label: 'Second' },
  { value: 'final',  label: 'Final' },
];
const KIND_ORDER: InterviewKindKey[] = ['first', 'second', 'final'];
const KIND_IDX: Record<InterviewKindKey, number> = { first: 0, second: 1, final: 2 };
const KIND_LABEL: Record<InterviewKindKey, string> = { first: 'First', second: 'Second', final: 'Final' };

function suggestNextKind(rounds: InterviewRoundView[]): InterviewKindKey {
  let hi = -1;
  for (const r of rounds) {
    if (r.status === 'completed') {
      const i = KIND_IDX[r.kind];
      if (i > hi) hi = i;
    }
  }
  if (hi === -1) return 'first';
  return KIND_ORDER[Math.min(hi + 1, KIND_ORDER.length - 1)];
}

function matchTone(s: number) {
  if (s >= 80) return 'bg-emerald-100 text-emerald-700';
  if (s >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-500';
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function InterviewsPanel({ requisition }: { requisition: Requisition }) {
  const reqId = requisition.id;

  const { data: page, isLoading } = useCandidates(reqId, {
    stage: 'interview',
    pageSize: 200,
    sortBy: 'match',
  });
  /**
   * Finalists belong here too. A first interview the factory ran ends with the
   * candidate at Final, waiting for the recruiter's second round — and this
   * tab listed only the Interview stage, so they vanished from the one screen
   * the second round is booked on. Moving them back to Interview to find them
   * brought the factory's lock back with them.
   */
  const { data: finalPage, isLoading: finalLoading } = useCandidates(reqId, {
    stage: 'final',
    pageSize: 200,
    sortBy: 'match',
  });

  const candidates = useMemo(
    () => [...(page?.items ?? []), ...(finalPage?.items ?? [])],
    [page, finalPage],
  );
  /**
   * Bulk scheduling must skip anyone whose first interview is out with a
   * delegate. "Schedule all at once" over the whole list would arrange rounds
   * on top of the ones the factory is already running — the very collision
   * the per-candidate lock exists to prevent, done wholesale.
   */
  const schedulable = useMemo(
    () => candidates.filter((c) => !c.firstInterviewHold),
    [candidates],
  );
  const heldCount = candidates.length - schedulable.length;
  /**
   * Two lists. The main one is who the recruiter can act on now — the
   * factory's finalists and their own interviews. "Other candidates" are
   * still out with the factory for a first interview: shown, but apart, so
   * a vacancy where the factory sent back three of ten does not open on
   * seven locked rows.
   */
  const held = useMemo(
    () => candidates.filter((c) => c.firstInterviewHold),
    [candidates],
  );
  // Always opens on Ready — the work that is the recruiter's to do. Other
  // is one click away, never chosen for them.
  const [listTab, setListTab] = useState<'ready' | 'other'>('ready');
  const listed = listTab === 'ready' ? schedulable : held;
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  /**
   * Ticked for one session. Only Ready candidates can be ticked — anyone out
   * with the factory is not the recruiter's to book.
   */
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  /** Who the bulk dialog was opened for: the ticked few, or everyone ready. */
  const [bulkFor, setBulkFor] = useState<Candidate[]>([]);
  const tickedCandidates = useMemo(
    () => schedulable.filter((c) => ticked.has(c.id)),
    [schedulable, ticked],
  );
  // Drop ticks for anyone who has left the Ready list.
  useEffect(() => {
    setTicked((prev) => {
      const ids = new Set(schedulable.map((c) => c.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [schedulable]);
  const toggleTick = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allTicked =
    schedulable.length > 0 && tickedCandidates.length === schedulable.length;
  const openBulk = (list: Candidate[]) => {
    setBulkFor(list);
    setBulkOpen(true);
  };

  // Auto-select the first candidate of the list being shown.
  useEffect(() => {
    if (listed.length === 0) return;
    if (!selected || !listed.some((c) => c.id === selected.id)) {
      setSelected(listed[0]);
    }
  }, [listed, selected]);

  // Keep selection in sync if candidate data refreshes
  useEffect(() => {
    if (selected) {
      const fresh = candidates.find((c) => c.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  if (isLoading || finalLoading) {
    return (
      <Card>
        <CardBody className="flex justify-center py-20">
          <Spinner />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100">
            <Users className="h-4 w-4 text-brand-600" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} at interview or final stage
            </p>
            <p className="text-xs text-slate-500">
              {schedulable.length} ready to schedule
              {heldCount > 0 && ` · ${heldCount} out for a first interview`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setAddOpen(true)}
          >
            Add candidates
          </Button>
          {schedulable.length > 0 && (
            <Button
              size="sm"
              variant={tickedCandidates.length > 0 ? 'outline' : 'primary'}
              leftIcon={<CalendarClock className="h-4 w-4" />}
              onClick={() => openBulk(schedulable)}
            >
              Schedule all at once
            </Button>
          )}
          {tickedCandidates.length > 0 && (
            <Button
              size="sm"
              leftIcon={<CalendarClock className="h-4 w-4" />}
              onClick={() => openBulk(tickedCandidates)}
            >
              Schedule {tickedCandidates.length} selected
            </Button>
          )}
        </div>
      </div>

      {/* ── Workspace: list ↔ detail ─────────────────────────────────── */}
      {candidates.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No candidates at interview or final stage"
          description="Search and add a candidate above, or move one to Interview from the Recruitment tab."
        />
      ) : (
        <div className="grid min-h-[70vh] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[18rem_minmax(0,1fr)]">

          {/* LEFT — candidate list */}
          <div className="flex max-h-[40vh] min-w-0 flex-col border-b border-slate-200 bg-slate-50/40 lg:max-h-none lg:border-b-0 lg:border-r">
            <div className="space-y-2 border-b border-slate-200 p-2.5">
              {held.length > 0 && (
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/60 p-1">
                  {(
                    [
                      ['ready', 'Ready', schedulable.length],
                      ['other', 'Other', held.length],
                    ] as const
                  ).map(([key, label, n]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setListTab(key)}
                      title={
                        key === 'other'
                          ? 'Still with the factory for their first interview'
                          : 'Decided — ready for you to interview'
                      }
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
                        listTab === key
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700',
                      )}
                    >
                      {label}
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-[0.625rem] tabular-nums',
                          listTab === key
                            ? 'bg-brand-50 text-brand-700'
                            : 'bg-slate-200 text-slate-500',
                        )}
                      >
                        {n}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {listTab === 'ready' && schedulable.length > 0 ? (
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-xs font-medium text-slate-600 hover:bg-white">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allTicked}
                      ref={(el) => {
                        if (el) el.indeterminate = ticked.size > 0 && !allTicked;
                      }}
                      onChange={() =>
                        setTicked(
                          allTicked
                            ? new Set()
                            : new Set(schedulable.map((c) => c.id)),
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Select all
                  </span>
                  {ticked.size > 0 && (
                    <span className="text-[0.6875rem] font-semibold text-brand-700">
                      {ticked.size} selected
                    </span>
                  )}
                </label>
              ) : (
                held.length === 0 && (
                  <p className="px-1 text-[0.625rem] font-semibold uppercase tracking-widest text-slate-400">
                    Candidates
                  </p>
                )
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {listed.length === 0 && (
                <p className="px-4 py-8 text-center text-xs leading-5 text-slate-400">
                  {listTab === 'ready'
                    ? 'Nobody is back from the factory yet. Their candidates are under Other until they decide.'
                    : 'Nobody is out with the factory.'}
                </p>
              )}
              {listed.map((c) => (
                <CandidateListCard
                  key={c.id}
                  candidate={c}
                  active={selected?.id === c.id}
                  onSelect={() => setSelected(c)}
                  ticked={listTab === 'ready' ? ticked.has(c.id) : undefined}
                  onTick={() => toggleTick(c.id)}
                />
              ))}
            </div>
          </div>

          {/* RIGHT — interview workspace */}
          {selected ? (
            <InterviewWorkspace
              key={selected.id}
              reqId={reqId}
              designation={requisition.designationLabel || requisition.designation}
              candidate={selected}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Select a candidate to begin
            </div>
          )}
        </div>
      )}

      {/* Bulk modal — everyone ready, or just the ticked ones */}
      <BulkInterviewModal
        reqId={reqId}
        candidates={bulkFor}
        open={bulkOpen}
        onClose={() => {
          setBulkOpen(false);
          setTicked(new Set());
        }}
      />

      {/* Add-to-interview modal */}
      <AddToInterviewModal
        reqId={reqId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(c) => setSelected(c)}
      />
    </div>
  );
}

// ─── Add candidates to interview stage ─────────────────────────────────────────

/** Only Shortlisted and later stages are eligible — earlier-stage candidates
 * haven't cleared screening yet. */
const STAGE_RANK: Record<string, number> = {
  applied: 0,
  ai_shortlisted: 1,
  shortlisted: 2,
  interview: 3,
  final: 4,
  selected: 5,
  rejected: -1,
};

function AddToInterviewModal({
  reqId,
  open,
  onClose,
  onAdded,
}: {
  reqId: string;
  open: boolean;
  onClose: () => void;
  onAdded: (candidate: Candidate) => void;
}) {
  const { data, isLoading } = useCandidates(reqId, { pageSize: 200 }, open);
  const update = useUpdateCandidate(reqId);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setPicked(new Set());
  }, [open]);

  // Final is already listed on the tab; moving a finalist back to Interview
  // would only lose where they had got to.
  const eligible = (data?.items ?? []).filter(
    (c) =>
      (STAGE_RANK[c.stage] ?? -1) >= STAGE_RANK.shortlisted &&
      c.stage !== 'interview' &&
      c.stage !== 'final',
  );

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    const chosen = eligible.filter((c) => picked.has(c.id));
    for (const c of chosen) {
      await update.mutateAsync({ id: c.id, input: { stage: 'interview' } });
    }
    onClose();
    if (chosen[0]) onAdded({ ...chosen[0], stage: 'interview' });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Candidates to Interview" size="md">
      <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : eligible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
            No Shortlisted (or later) candidates available to add.
          </p>
        ) : (
          eligible.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={picked.has(c.id)}
                onChange={() => toggle(c.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <Avatar name={c.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{c.name}</span>
              </span>
              <Badge tone="neutral" className="shrink-0 capitalize">
                {c.stage.replace('_', ' ')}
              </Badge>
            </label>
          ))
        )}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={picked.size === 0}
          isLoading={update.isPending}
          leftIcon={<UserPlus className="h-4 w-4" />}
          onClick={submit}
        >
          Add {picked.size} candidate{picked.size === 1 ? '' : 's'}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Candidate list card (left sidebar) ───────────────────────────────────────

/**
 * A round's marks in one place: the average of whoever has marked, out of
 * what, and as a percentage — the number people actually compare.
 */
function roundScore(round: InterviewRoundView) {
  const max = round.criteria.reduce((sum, c) => sum + c.max, 0);
  const n = round.evaluations.length;
  const avg = n > 0 ? round.evaluations.reduce((sum, e) => sum + e.total, 0) / n : 0;
  return {
    max,
    marked: n,
    avg: Math.round(avg * 10) / 10,
    pct: n > 0 && max > 0 ? Math.round((avg / max) * 100) : null,
  };
}

const pctOf = (total: number, max: number) =>
  max > 0 ? Math.round((total / max) * 100) : null;

function pctTone(pct: number) {
  if (pct >= 75) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (pct >= 50) return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-rose-50 text-rose-700 ring-rose-200';
}

function CandidateListCard({
  candidate,
  active,
  onSelect,
  ticked,
  onTick,
}: {
  candidate: Candidate;
  active: boolean;
  onSelect: () => void;
  /** Undefined: this row cannot be ticked (out with the factory). */
  ticked?: boolean;
  onTick: () => void;
}) {
  const held = candidate.firstInterviewHold;
  // Fetch rounds to show progress dots
  const { data: rounds = [] } = useCandidateInterviews(candidate.id);
  const completedCount = rounds.filter((r) => r.status === 'completed').length;
  const scheduledCount = rounds.filter((r) => r.status === 'scheduled').length;
  const totalRounds = rounds.length;
  // The latest round anybody has marked — what the candidate scored last.
  const lastMarked = [...rounds].reverse().find((r) => r.evaluations.length > 0);
  const lastScore = lastMarked ? roundScore(lastMarked) : null;

  return (
    <div
      className={cn(
        'group flex w-full items-start gap-2.5 border-b border-slate-100 px-3 py-3 transition-colors duration-150',
        active
          ? 'bg-brand-50/70'
          : 'hover:bg-white',
      )}
    >
      {ticked !== undefined && (
        <input
          type="checkbox"
          checked={ticked}
          onChange={onTick}
          aria-label={`Select ${candidate.name}`}
          className="mt-2 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
      )}
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
      >
        <Avatar name={candidate.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p
            title={candidate.name}
            className={cn(
              'truncate text-sm font-semibold',
              active ? 'text-brand-800' : 'text-slate-800',
            )}
          >
            {candidate.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {candidate.matchScore !== null && (
              <span
                title="CV match"
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold',
                  matchTone(candidate.matchScore),
                )}
              >
                <Sparkles className="h-2.5 w-2.5" />
                {candidate.matchScore}%
              </span>
            )}
            {lastScore?.pct != null && lastMarked && (
              <span
                title={`${KIND_LABEL[lastMarked.kind]} interview — average ${lastScore.avg} / ${lastScore.max} from ${lastScore.marked} interviewer${lastScore.marked === 1 ? '' : 's'}`}
                className={cn(
                  'inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold ring-1',
                  pctTone(lastScore.pct),
                )}
              >
                {KIND_LABEL[lastMarked.kind][0]} · {lastScore.pct}%
              </span>
            )}
            {candidate.salaryExpectation != null && (
              <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-emerald-700">
                ৳ {candidate.salaryExpectation.toLocaleString()}
              </span>
            )}
          </div>

          {/* Out with a delegate: name who has it, so nobody has to open the
              card to find out whose desk to chase. */}
          {held && (
            <p
              // Two names do not fit the rail, and "Md. Karim and …" hides the
              // very person the recruiter would go and ask.
              title={`First interview with ${heldByLabel(held)}`}
              className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[0.625rem] font-medium text-slate-500"
            >
              <Lock className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">First interview with {heldByLabel(held)}</span>
            </p>
          )}
          {/* Round progress dots */}
          {totalRounds > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              {rounds.map((r) => (
                <span
                  key={r.id}
                  title={`${KIND_LABEL[r.kind]} — ${r.status}`}
                  className={cn(
                    'h-2 w-2 rounded-full',
                    r.status === 'completed'
                      ? 'bg-emerald-400'
                      : r.status === 'scheduled'
                        ? 'bg-amber-400'
                        : r.status === 'absent'
                          ? 'bg-rose-400'
                          : 'bg-slate-300',
                  )}
                />
              ))}
              <span className="ml-1 text-[0.625rem] text-slate-400">
                {completedCount > 0 && `${completedCount} done`}
                {scheduledCount > 0 && completedCount > 0 && ' · '}
                {scheduledCount > 0 && `${scheduledCount} upcoming`}
              </span>
            </div>
          )}
          {totalRounds === 0 && !held && (
            <p className="mt-1 text-[0.625rem] text-slate-400">No interviews yet</p>
          )}
        </div>
      </button>
    </div>
  );
}

// ─── Interview workspace (right panel) ────────────────────────────────────────

function InterviewWorkspace({
  reqId,
  designation,
  candidate,
}: {
  reqId: string;
  designation: string;
  candidate: Candidate;
}) {
  const { data: setup } = useAssessmentSetup(reqId);
  /**
   * The first interview is out with somebody else.
   *
   * The recruiter sees all of it — when it is, who is on the panel, who has
   * marked — and can act on none of it. Marking the session complete, calling
   * the candidate a no-show, deleting the round, re-issuing evaluation links
   * and scheduling on top of it are all the delegate's, because the delegate
   * is the one in the room. Corporate watching a factory interview is not the
   * same thing as running it.
   */
  const held = candidate.firstInterviewHold;
  const { data: rounds = [], isLoading } = useCandidateInterviews(candidate.id);
  const schedule = useScheduleInterview(candidate.id);
  const remove = useRemoveInterview(candidate.id);
  const evalSummary = useGenerateEvaluationSummary();
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const rejectCandidate = useRejectAtInterview(candidate.id);
  // Opt-in, never automatic: rejecting does not write to anybody by itself.
  const [rejectRegret, setRejectRegret] = useState(false);
  const [regretOpen, setRegretOpen] = useState(false);
  const sendRegret = useSendRegretMail();
  const [selectOpen, setSelectOpen] = useState(false);
  // Selection leads to board approval, which signs off on a salary — so the
  // figure is settled first. Read only when the confirmation is open.
  const salary = useSalaryFixation(candidate.id, selectOpen);
  const salaryFixed =
    salary.data?.status === 'fixed' &&
    (salary.data.proposedSalaryOverride ?? salary.data.proposedSalary) != null;
  const updateCandidate = useUpdateCandidate(reqId);
  // Offered once a second or final round is done — the rounds a hire is
  // decided at. A completed first interview is a screen, not a decision.
  const decisionRound = rounds.find(
    (r) => r.status === 'completed' && (r.kind === 'second' || r.kind === 'final'),
  );
  const hasEvaluations = rounds.some((r) => r.evaluations.length > 0);

  // Form state
  const [kind, setKind]               = useState<InterviewKindKey>('first');
  const [mode, setMode]               = useState<InterviewModeKey>('physical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation]       = useState('');
  const [customLink, setCustomLink]   = useState(false);
  const [panel, setPanel]             = useState<PanelEntry[]>([]);
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const [notifyPanel, setNotifyPanel]         = useState(true);
  const [notifyCalendar, setNotifyCalendar]   = useState(true);
  const [locationError, setLocationError]     = useState(false);

  const kindAutoSetRef = useRef(false);

  /**
   * Two views of one candidate: what has been arranged, and arranging the
   * next one. They used to sit side by side in three narrow columns, which
   * wrapped every panelist's name and cut the form off; each now gets the
   * full width. Opens on the rounds when there are any, else on the form.
   */
  const [view, setView] = useState<'rounds' | 'schedule'>('rounds');
  const viewAutoSetRef = useRef(false);
  useEffect(() => {
    if (viewAutoSetRef.current || isLoading) return;
    viewAutoSetRef.current = true;
    if (rounds.length === 0 && !held) setView('schedule');
  }, [isLoading, rounds.length, held]);

  /**
   * The factory ran the first interview. Once they have given their verdict
   * the recruiter books the second or final round as usual — but the first
   * round is the factory's, so it is neither offered nor editable here.
   */
  const factoryFirst = Boolean(candidate.firstRoundByFactory);
  const kindOptions = factoryFirst
    ? KIND_OPTIONS.filter((k) => k.value !== 'first')
    : KIND_OPTIONS;

  useEffect(() => {
    // Auto-suggest kind when rounds load
    if (!kindAutoSetRef.current && (rounds.length > 0 || factoryFirst)) {
      const next = suggestNextKind(rounds);
      setKind(factoryFirst && next === 'first' ? 'second' : next);
      kindAutoSetRef.current = true;
    }
  }, [rounds, factoryFirst]);

  const committee = setup?.committee ?? [];
  const panelOps = panelHandlers(setPanel);

  const lastCompleted = rounds.reduce<InterviewKindKey | null>((best, r) => {
    if (r.status !== 'completed') return best;
    if (!best || KIND_IDX[r.kind] > KIND_IDX[best]) return r.kind;
    return best;
  }, null);

  const submit = () => {
    if (mode !== 'online' && !customLink && !location.trim()) {
      setLocationError(true);
      return;
    }
    setLocationError(false);
    schedule.mutate(
      {
        kind, mode,
        // Always Dhaka time, whatever zone this computer is in.
        scheduledAt: dhakaInputToIso(scheduledAt),
        location: location.trim() || undefined,
        ...panelPayload(panel),
        notifyCandidate, notifyPanel, notifyCalendar,
      },
      {
        onSuccess: () => {
          setScheduledAt('');
          setLocation('');
          setPanel([]);
          setLocationError(false);
          setView('rounds');
        },
      },
    );
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">

      {/* ── Workspace header ────────────────────────────────────── */}
      <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={candidate.name} size="md" />
            <div>
              <h3 className="text-[0.9375rem] font-semibold text-slate-900">{candidate.name}</h3>
              <p className="text-[0.6875rem] text-slate-400">
                {candidate.email || 'No email'}{candidate.phone ? ` · ${candidate.phone}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {held && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <Lock className="h-3.5 w-3.5" /> With {heldByLabel(held)}
              </span>
            )}
            {/* Round progress strip */}
            <div className="flex items-center gap-1.5">
              {KIND_ORDER.map((k) => {
                const r = rounds.find((r) => r.kind === k);
                return (
                  <div key={k} className="flex flex-col items-center gap-0.5">
                    <span className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-full border-2 text-[0.625rem] font-bold',
                      !r
                        ? 'border-slate-200 bg-white text-slate-300'
                        : r.status === 'completed'
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                          : 'border-amber-400 bg-amber-50 text-amber-600',
                    )}>
                      {KIND_LABEL[k][0]}
                    </span>
                    <span className="text-[0.5625rem] uppercase tracking-wide text-slate-400">{KIND_LABEL[k]}</span>
                  </div>
                );
              })}
            </div>
            {/* Compensation is the recruiter's own job, not the delegate's,
                so it stays available while the interview is out. */}
            <Button
              size="sm"
              variant="outline"
              leftIcon={<BadgeDollarSign className="h-4 w-4" />}
              onClick={() => setSalaryOpen(true)}
            >
              Salary
            </Button>
            {/* The decision belongs where the interview was just run — going to
                the candidate list to change a stage is a detour through another
                screen to record something that was settled here. */}
            {held ? null : candidate.stage === 'selected' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Selected
              </span>
            ) : candidate.stage === 'rejected' ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                  <UserX className="h-3.5 w-3.5" /> Rejected
                </span>
                {candidate.regretSentAt ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                    title={`Regret mail sent${candidate.regretSentByName ? ` by ${candidate.regretSentByName}` : ''}`}
                  >
                    <MailX className="h-3.5 w-3.5" /> Regret sent ·{' '}
                    {formatDate(candidate.regretSentAt)}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<MailX className="h-4 w-4" />}
                    onClick={() => setRegretOpen(true)}
                    disabled={!candidate.email}
                    title={
                      candidate.email
                        ? 'Send DBL’s regret letter'
                        : 'No email on file'
                    }
                  >
                    Regret mail
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* Both halves of the decision sit together. Selecting was
                    here already; turning somebody down meant leaving for the
                    candidate list, so it tended to be left undone and the
                    pipeline filled with people nobody had ruled out. */}
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<UserX className="h-4 w-4" />}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
                {decisionRound && (
                  <Button
                    size="sm"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => setSelectOpen(true)}
                  >
                    Mark as selected
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <SalaryFixationModal
        reqId={reqId}
        candidate={{ id: candidate.id, name: candidate.name }}
        open={salaryOpen}
        onClose={() => setSalaryOpen(false)}
      />

      {/* A reason is asked for, not required. It is the only thing anyone
          reading this candidate later will have to go on — but a gate on it
          would just produce "not suitable" over and over. */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        size="sm"
        title={`Reject ${candidate.name}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={rejectCandidate.isPending}
              leftIcon={<UserX className="h-4 w-4" />}
              onClick={() =>
                rejectCandidate.mutate(rejectReason.trim() || undefined, {
                  onSuccess: () => {
                    // Only once the rejection has landed — the server
                    // refuses a regret to anyone still in the running.
                    if (rejectRegret && candidate.email) {
                      sendRegret.mutate([candidate.id]);
                    }
                    setRejectOpen(false);
                    setRejectReason('');
                    setRejectRegret(false);
                  },
                })
              }
            >
              Reject candidate
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Turn <span className="font-semibold">{candidate.name}</span> down at
          the interview stage? They come off this requisition&rsquo;s pipeline.
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
          placeholder="Why — e.g. not enough hands-on experience with the line equipment."
          className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
        />
        <RegretMailToggle
          className="mt-3"
          checked={rejectRegret}
          onChange={setRejectRegret}
          email={candidate.email}
          alreadySentAt={candidate.regretSentAt}
        />
      </Modal>

      <RegretMailModal
        open={regretOpen}
        onClose={() => setRegretOpen(false)}
        designation={designation}
        candidates={[candidate]}
      />

      {/* Confirmed rather than done on one click: selecting a candidate is what
          starts onboarding, and the button sits beside routine ones. */}
      <Modal
        open={selectOpen}
        onClose={() => setSelectOpen(false)}
        size="sm"
        title="Mark as selected"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={updateCandidate.isPending}
              disabled={!salaryFixed}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() =>
                updateCandidate.mutate(
                  { id: candidate.id, input: { stage: 'selected' } },
                  {
                    onSuccess: () => {
                      setSelectOpen(false);
                      toast.success(`${candidate.name} marked as selected`);
                    },
                  },
                )
              }
            >
              Mark as selected
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Move <span className="font-semibold">{candidate.name}</span> to
          selected after the{' '}
          {decisionRound ? KIND_LABEL[decisionRound.kind].toLowerCase() : ''}{' '}
          interview? This starts their onboarding.
        </p>
        {salary.isLoading ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking the salary…
          </p>
        ) : salaryFixed ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Salary finalized at ৳{' '}
            {(
              salary.data?.proposedSalaryOverride ??
              salary.data?.proposedSalary ??
              0
            ).toLocaleString()}
            {salary.data?.jobGrade ? ` · ${salary.data.jobGrade}` : ''} — this
            is the figure board approval signs off on.
          </p>
        ) : (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-800">
              Finalize the salary first. Board approval signs off on that
              figure, and a candidate selected without one cannot be sent.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              leftIcon={<BadgeDollarSign className="h-4 w-4" />}
              onClick={() => {
                setSelectOpen(false);
                setSalaryOpen(true);
              }}
            >
              Fix salary
            </Button>
          </div>
        )}
      </Modal>

      {/* ── View switch ───────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-5 py-2">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="tablist">
          {(
            [
              ['rounds', `Interviews${rounds.length ? ` · ${rounds.length}` : ''}`, CalendarCheck],
              ['schedule', 'Schedule new', CalendarClock],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                view === key
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        {view === 'rounds' && !held && rounds.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<CalendarClock className="h-4 w-4" />}
            onClick={() => setView('schedule')}
          >
            Schedule next round
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/50">
        {view === 'rounds' ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : rounds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
                <CalendarClock className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No interviews yet</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {held
                    ? `${heldByLabel(held)} has not arranged it yet.`
                    : 'Schedule the first one from the Schedule new tab.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                {rounds.map((r) => (
                  <RoundCard
                    key={r.id}
                    round={r}
                    candidateId={candidate.id}
                    onRemove={() => remove.mutate(r.id)}
                    readOnly={Boolean(held) || (factoryFirst && r.kind === 'first')}
                  />
                ))}
              </div>
            )}

            {/* AI Evaluation Summary */}
            {hasEvaluations && (
              <div className="overflow-hidden rounded-xl border border-violet-200 bg-violet-50/60">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Evaluation Summary
                  </span>
                  <button
                    type="button"
                    disabled={evalSummary.isPending}
                    onClick={() => evalSummary.mutate(candidate.id, { onSuccess: (d) => setSummaryText(d.summary) })}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.6875rem] font-medium text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-3 w-3', evalSummary.isPending && 'animate-spin')} />
                    {summaryText ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
                {evalSummary.isPending && (
                  <p className="border-t border-violet-100 px-4 py-3 text-xs text-violet-500">
                    <Sparkles className="mr-1.5 inline h-3.5 w-3.5 animate-pulse" />
                    AI is reading panel evaluations…
                  </p>
                )}
                {summaryText && !evalSummary.isPending && (
                  <p className="border-t border-violet-100 px-4 py-3 text-xs leading-relaxed text-slate-700">
                    {summaryText}
                  </p>
                )}
                {!summaryText && !evalSummary.isPending && (
                  <p className="border-t border-violet-100 px-4 pb-3 pt-2 text-[0.6875rem] text-violet-500">
                    Click Generate to get an AI synthesis of all panel scores and comments.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : held ? (
          /* Schedule form — or why there isn't one */
          <HeldByDelegate candidate={candidate} hold={held} />
        ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">

            {/* ① Type & mode */}
            <FormStep n={1} title="Which interview?">
              {lastCompleted && (
                <p className="mb-2 flex items-center gap-1.5 text-[0.6875rem] text-brand-600">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                  {lastCompleted === 'final'
                    ? 'Final completed — reschedule any round freely'
                    : `${KIND_LABEL[lastCompleted]} done — ${KIND_LABEL[KIND_ORDER[KIND_IDX[lastCompleted] + 1]]} pre-selected`}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Segmented
                  options={kindOptions.map((k) => ({ value: k.value, label: `${k.label} interview` }))}
                  value={kind}
                  onChange={(v) => setKind(v as InterviewKindKey)}
                />
                <Segmented
                  options={[
                    { value: 'physical', label: 'In-person', icon: <Building2 className="h-3.5 w-3.5" /> },
                    { value: 'online',   label: 'Online',    icon: <Video className="h-3.5 w-3.5" /> },
                  ]}
                  value={mode === 'online' ? 'online' : 'physical'}
                  onChange={(v) => { setMode(v as InterviewModeKey); setCustomLink(false); setLocation(''); setLocationError(false); }}
                />
              </div>
            </FormStep>

            {/* ② When & where */}
            <FormStep n={2} title="When & where?">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[14rem_minmax(0,1fr)]">
                <div>
                  <label className="mb-1 block text-[0.6875rem] font-medium text-slate-400">
                    Date &amp; time
                  </label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                {mode === 'online' && !customLink ? (
                  <div className="flex h-10 items-center justify-between gap-2 self-end rounded-lg border border-emerald-200 bg-emerald-50/60 px-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <Video className="h-3.5 w-3.5" /> Google Meet — auto
                    </span>
                    <button type="button" onClick={() => setCustomLink(true)}
                      className="text-[0.6875rem] text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline">
                      custom link
                    </button>
                  </div>
                ) : (
                  <div className="min-w-0">
                    {mode !== 'online' ? (
                      <VenueField
                        value={location}
                        invalid={locationError}
                        onChange={(v) => { setLocation(v); if (v.trim()) setLocationError(false); }}
                      />
                    ) : (
                    <>
                      <label className="mb-1 block text-[0.6875rem] font-medium text-slate-400">
                        Meeting link
                      </label>
                      <Input
                        placeholder="https://… (Teams, Zoom…)"
                        value={location}
                        onChange={(e) => { setLocation(e.target.value); if (e.target.value.trim()) setLocationError(false); }}
                      />
                    </>
                    )}
                    {locationError && mode !== 'online' && (
                      <p className="mt-1 flex items-center gap-1 text-[0.6875rem] font-medium text-rose-600">
                        <MapPin className="h-3 w-3" /> Venue is required for in-person interviews
                      </p>
                    )}
                    {mode === 'online' && (
                      <button type="button" onClick={() => { setCustomLink(false); setLocation(''); }}
                        className="mt-1 text-[0.6875rem] text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline">
                        ← auto Google Meet
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[0.6875rem] text-slate-400">
                <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                Times are Dhaka time (GMT+6).{' '}
                {notifyCalendar
                  ? 'Panel gets a Google Calendar invite with reminders.'
                  : 'No calendar invite — Notify on calendar is off.'}
              </p>
            </FormStep>

            {/* ③ Panel */}
            <FormStep n={3} title="Who interviews?">
              <PanelGroups
                panel={panel}
                committee={committee}
                onAdd={panelOps.add}
                onRemove={panelOps.remove}
                onMove={panelOps.move}
                renderPicker={(_hr, onAdded) => (
                  <PanelMemberPicker
                    reqId={reqId}
                    existingUserIds={[...committee.map((m) => m.userId), ...panel.map((p) => p.userId)]}
                    onAdded={onAdded}
                  />
                )}
              />
            </FormStep>
          </div>

          {/* ── Footer ────────────────────────────────────────── */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
            <div className="flex flex-wrap gap-2">
              <ToggleChip checked={notifyCandidate} onChange={setNotifyCandidate}
                icon={<Mail className="h-3.5 w-3.5" />} label="Email candidate" />
              <ToggleChip checked={notifyPanel} onChange={setNotifyPanel}
                icon={<Bell className="h-3.5 w-3.5" />} label="Notify panel" />
              <ToggleChip checked={notifyCalendar} onChange={setNotifyCalendar}
                icon={<CalendarDays className="h-3.5 w-3.5" />} label="Notify on calendar"
                hint={CALENDAR_HINT} />
            </div>
            <div className="flex items-center gap-3">
              {panel.length === 0 && (
                <span className="text-xs text-slate-400">Add at least one interviewer</span>
              )}
              <Button
                onClick={submit}
                isLoading={schedule.isPending}
                disabled={panel.length === 0}
                leftIcon={<CalendarClock className="h-4 w-4" />}
              >
                Schedule interview
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>

      <BusyOverlay
        show={schedule.isPending}
        label="Scheduling interview…"
        sublabel={
          notifyCalendar
            ? mode === 'online' ? 'Creating calendar invite and Google Meet link.' : 'Creating calendar invite for the panel.'
            : mode === 'online' ? 'Creating the Google Meet link — no calendar invites.' : 'Saving the interview — no calendar invites.'
        }
      />
    </div>
  );
}

// ─── The first interview is somebody else's ───────────────────────────────────

/**
 * What the workspace shows instead of a round nobody here arranged.
 *
 * Not an error and not an empty state: the work is happening, just not on this
 * screen. So it says who has it and when it comes back: once they give their
 * verdict, the recruiter books the second or final round here as usual.
 */
function HeldByDelegate({
  candidate,
  hold,
}: {
  candidate: Candidate;
  hold: NonNullable<Candidate['firstInterviewHold']>;
}) {
  const names = heldByLabel(hold);
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
          <Lock className="h-5 w-5 text-slate-400" />
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-800">
          First interview is with {names}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          This candidate was handed over for their first interview, so
          arranging and running it is theirs. The second round opens up here
          once they put the candidate through — after the Factory HR Head
          approves, where the unit has one — or they turn them down.
        </p>
        {hold.awaitingApproval && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[0.6875rem] leading-relaxed text-amber-800">
            {names} put {candidate.name} through. It is with the Factory HR
            Head for approval, and opens up here for the second interview once
            they approve.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Interview round card ──────────────────────────────────────────────────────

const STATUS_TONE = {
  scheduled: 'warning',
  completed: 'success',
  cancelled: 'neutral',
  // Red, not grey: a no-show is a fact about the candidate that somebody has
  // to act on, where a cancellation is just the session not happening.
  absent: 'danger',
} as const;

/**
 * `readOnly` is a first interview that was handed to somebody else: the whole
 * record, none of the controls. See `firstInterviewHold`.
 */
function RoundCard({
  round,
  candidateId,
  onRemove,
  readOnly = false,
}: {
  round: InterviewRoundView;
  candidateId: string;
  onRemove: () => void;
  readOnly?: boolean;
}) {
  const update = useUpdateInterview(candidateId);
  const resend = useResendEvalToken(candidateId);
  // A mark means somebody was in the room, so "did not attend" stops being
  // offered — the server refuses it too.
  const canMarkAbsent = round.evaluations.length === 0;
  const score = roundScore(round);
  const evalBy = new Map(round.evaluations.map((e) => [e.evaluatorId, e]));
  // Anyone who marked without being on the listed panel still counts.
  const offPanel = round.evaluations.filter(
    (e) => !round.panelists.some((p) => p.userId === e.evaluatorId),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">

      {/* Header — what, how, and how it went */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold capitalize text-slate-900">{round.kind} interview</span>
            <Badge tone="neutral">{round.mode === 'online' ? 'Online' : 'In-person'}</Badge>
            <Badge tone={STATUS_TONE[round.status]}>{round.status}</Badge>
          </div>
          <div className="mt-1.5 space-y-1 text-xs text-slate-500">
            <p className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {round.scheduledAt ? `${slotLabel(round.scheduledAt)} (GMT+6)` : 'Time TBD'}
              {round.calendarSynced && (
                <span className="ml-1 inline-flex items-center gap-1 text-brand-600">
                  <CalendarCheck className="h-3 w-3" /> Invites sent
                </span>
              )}
            </p>
            {round.meetLink ? (
              <a href={round.meetLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-emerald-600 hover:underline">
                <Video className="h-3.5 w-3.5" /> Join Google Meet
              </a>
            ) : round.location ? (
              <p className="flex items-start gap-1.5" title={round.location}>
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="line-clamp-2">{round.location}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {score.pct != null && (
            <div
              className={cn('rounded-xl px-3 py-1.5 text-right ring-1', pctTone(score.pct))}
              title={`Average of ${score.marked} interviewer${score.marked === 1 ? '' : 's'}`}
            >
              <p className="text-lg font-bold leading-none tabular-nums">{score.pct}%</p>
              <p className="mt-0.5 text-[0.625rem] font-medium tabular-nums opacity-80">
                avg {score.avg.toFixed(1)} / {score.max}
              </p>
            </div>
          )}
          {!readOnly && (
            <button type="button" title="Remove this round" aria-label="Remove this round" onClick={onRemove}
              className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Panel — one row per interviewer: where their sheet is, their marks */}
      {(round.panelists.length > 0 || offPanel.length > 0) && (
        <div className="border-t border-slate-100 px-4 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[0.625rem] font-semibold uppercase tracking-widest text-slate-400">
              Panel
            </p>
            <p className="text-[0.625rem] font-medium tabular-nums text-slate-400">
              {score.marked}/{Math.max(round.panelists.length, score.marked)} marked
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {round.panelists.map((p) => {
              const ev = evalBy.get(p.userId);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
                  <div className="flex min-w-0 flex-1 basis-40 items-center gap-2">
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                        p.hasMarked || ev
                          ? 'bg-emerald-100 text-emerald-600'
                          : p.tokenStatus === 'opened'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-100 text-slate-400',
                      )}
                    >
                      {p.hasMarked || ev ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Circle className="h-2 w-2 fill-current" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <span className="truncate" title={p.name}>{p.name}</span>
                        {p.fromHr && (
                          <span
                            title="Sits on this panel for HR — records the facilities"
                            className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-wide text-white"
                          >
                            HR
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[0.625rem] text-slate-400">
                        {p.hasMarked || ev
                          ? 'Marked'
                          : p.tokenStatus === 'opened'
                            ? 'Opened the sheet'
                            : p.tokenStatus
                              ? 'Link sent'
                              : 'Not sent'}
                        {p.designation ? ` · ${p.designation}` : ''}
                      </p>
                    </div>
                  </div>
                  {ev ? (
                    <EvaluationFigures ev={ev} max={score.max} />
                  ) : (
                    !readOnly &&
                    !p.hasMarked && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        {p.evalLink && (
                          <button type="button"
                            title="Copy this interviewer's marking link"
                            onClick={() => {
                              void navigator.clipboard.writeText(p.evalLink!);
                              toast.success('Link copied');
                            }}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-[0.6875rem] font-semibold text-brand-700 transition hover:bg-brand-100 active:scale-95">
                            <ClipboardCopy className="h-3 w-3" /> Copy link
                          </button>
                        )}
                        <button type="button"
                          title="Issue a fresh link (the old one stops working) and copy it"
                          disabled={resend.isPending}
                          onClick={() => resend.mutate({ roundId: round.id, panelistUserId: p.userId },
                            { onSuccess: (d) => { void navigator.clipboard.writeText(d.evalLink); toast.success('New link copied'); } })}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[0.6875rem] font-semibold text-amber-700 transition hover:bg-amber-100 active:scale-95 disabled:opacity-40">
                          <RotateCcw className="h-3 w-3" /> New link
                        </button>
                      </div>
                    )
                  )}
                </li>
              );
            })}
            {offPanel.map((ev) => (
              <li key={ev.evaluatorId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
                <div className="flex min-w-0 flex-1 basis-40 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <p className="truncate text-xs font-semibold text-slate-800" title={ev.evaluatorName}>
                    {ev.evaluatorName}
                  </p>
                </div>
                <EvaluationFigures ev={ev} max={score.max} />
              </li>
            ))}
          </ul>

          {/* Somebody joining a session that is still to run is normal — a
              third interviewer walks in, or the panel is short. Appends only:
              the people already listed keep their link and their marks, and
              only the newcomer is told.

              Gone once the round is marked done (or the candidate did not
              turn up, or it was cancelled). The panel is the record of who
              was in that room, and adding to it afterwards mints an
              evaluation link for an interview the person never sat in — the
              server refuses it too. */}
          {!readOnly && round.status === 'scheduled' && (
            <AddPanelistInline
              roundId={round.id}
              candidateId={candidateId}
              existingUserIds={round.panelists.map((p) => p.userId)}
            />
          )}
        </div>
      )}

      <RescheduledNote round={round} />

      {/* ── Outcome ───────────────────────────────────────────────────────
          The two things that actually happen to a booked session, asked as a
          question with two answers — labelled buttons, well away from the
          delete bin. */}
      {!readOnly && round.status === 'scheduled' && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <p className="mb-2 text-[0.625rem] font-semibold uppercase tracking-widest text-slate-400">
            Did this interview happen?
          </p>
          <div className={cn('grid gap-2', canMarkAbsent ? 'grid-cols-2' : 'grid-cols-1')}>
            <button
              type="button"
              onClick={() => update.mutate({ roundId: round.id, status: 'completed' })}
              disabled={update.isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Interviewed
            </button>
            {canMarkAbsent && (
              <button
                type="button"
                onClick={() => update.mutate({ roundId: round.id, status: 'absent' })}
                disabled={update.isPending}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 active:scale-[0.98] disabled:opacity-50"
              >
                <UserX className="h-4 w-4" />
                Did not attend
              </button>
            )}
          </div>
          {/* Still to happen and nobody has marked: it can move. */}
          {canMarkAbsent && (
            <RescheduleButton round={round} candidateId={candidateId} />
          )}
          {!canMarkAbsent && (
            <p className="mt-1.5 text-[0.625rem] text-slate-400">
              A panelist has already marked this candidate, so they were in the
              room — no-show is no longer offered.
            </p>
          )}
        </div>
      )}

      {/* A no-show says so plainly, and says how to take it back. */}
      {round.status === 'absent' && (
        <div className="flex items-center justify-between gap-2 border-t border-rose-100 bg-rose-50/70 px-4 py-2">
          <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold text-rose-700">
            <UserX className="h-3.5 w-3.5" />
            Candidate did not attend
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => update.mutate({ roundId: round.id, status: 'scheduled' })}
              disabled={update.isPending}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[0.625rem] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One interviewer's result: their total, the same as a percentage, and the
 * verdict they gave — a total says how the candidate did, the verdict says
 * what the person in the room wants done.
 */
function EvaluationFigures({
  ev,
  max,
}: {
  ev: InterviewRoundView['evaluations'][number];
  max: number;
}) {
  const pct = pctOf(ev.total, max);
  return (
    <div className="flex shrink-0 items-center gap-1.5" title={ev.comments || undefined}>
      {ev.recommendation && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide ring-1',
            recommendationTone(ev.recommendation),
          )}
        >
          {recommendationLabel(ev.recommendation)}
        </span>
      )}
      <span className="text-xs font-semibold tabular-nums text-slate-700">
        {ev.total.toFixed(1)}
        {max > 0 && <span className="font-normal text-slate-400"> / {max}</span>}
      </span>
      {pct != null && (
        <span
          className={cn(
            'min-w-[2.75rem] rounded-md px-1.5 py-0.5 text-center text-[0.6875rem] font-bold tabular-nums ring-1',
            pctTone(pct),
          )}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}

/**
 * Add an interviewer to a round that already exists.
 *
 * Deliberately not the panel editor: that one replaces the whole list, which
 * re-mints everybody's link and re-notifies people who may already have
 * marked. This appends one person, and the server tells only them.
 */
function AddPanelistInline({
  roundId,
  candidateId,
  existingUserIds,
}: {
  roundId: string;
  candidateId: string;
  existingUserIds: string[];
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  // Most people added later are the panel's own department; HR is the choice.
  const [asHr, setAsHr] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, panelStyle, ready } =
    useAnchoredPanel<HTMLDivElement>(open, close);
  const debounced = useDebounce(q, 300);
  const { data } = useEmployees({ search: debounced, page: 1, pageSize: 6 });
  const addPanelists = useAddPanelists(candidateId);

  const results = (data?.items ?? []).filter(
    (e) => e.userId && !existingUserIds.includes(e.userId),
  );

  return (
    <div className="relative mt-2" ref={triggerRef}>
      {open && <PanelSideToggle hr={asHr} onChange={setAsHr} />}
      {open ? (
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => {
            if (!q) setOpen(false);
          }}
          placeholder="Search a name to add…"
          className="w-full rounded-lg border border-brand-200 px-2.5 py-1.5 text-[0.6875rem] text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[0.625rem] font-semibold text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
        >
          <UserPlus className="h-3 w-3" /> Add interviewer
        </button>
      )}
      {open &&
        ready &&
        debounced.length > 0 &&
        results.length > 0 &&
        createPortal(
          <div
            ref={panelRef}
            data-portal-panel="true"
            style={panelStyle}
            className="z-50 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            {results.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  if (e.userId) {
                    addPanelists.mutate({
                      roundId,
                      panelistUserIds: [e.userId],
                      fromHr: asHr,
                    });
                  }
                  setQ('');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <Avatar name={e.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">
                    {e.name}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {[e.jobTitle, e.department].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function FormStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-sm font-medium text-slate-700">{title}</p>
        {children}
      </div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
            value === o.value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

const CALENDAR_HINT =
  "Sends a Google Calendar invitation (with Google's reminders) to the panel, and to the candidate when they are emailed. Off: the interview is kept on the recruitment calendar only and nobody is invited.";

function ToggleChip({ checked, onChange, icon, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; icon: React.ReactNode; label: string;
  /** Shown on hover — what the switch actually does. */
  hint?: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} title={hint} aria-pressed={checked}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150',
        checked ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600',
      )}>
      {checked ? <Check className="h-3.5 w-3.5" /> : icon}
      {label}
    </button>
  );
}

function PanelMemberPicker({
  reqId,
  existingUserIds,
  onAdded,
}: {
  reqId: string;
  existingUserIds: string[];
  onAdded: (userId: string, name: string) => void;
}) {
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  // Portalled: this picker sits inside several overflow-hidden panels, which
  // clipped the results list down to a sliver.
  const { triggerRef, panelRef, panelStyle, ready } =
    useAnchoredPanel<HTMLDivElement>(open, close);
  const debounced = useDebounce(q, 300);
  const { data }  = useEmployees({ search: debounced, page: 1, pageSize: 6 });
  const add       = useAddCommitteeMember(reqId);

  const results = (data?.items ?? []).filter((e) => e.userId && !existingUserIds.includes(e.userId));

  return (
    <div className="relative" ref={triggerRef}>
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Add an interviewer to the panel…"
        leftIcon={<Search className="h-4 w-4" />}
      />
      {open && ready && debounced.length > 0 && results.length > 0 &&
        createPortal(
          <div
            ref={panelRef}
            data-portal-panel="true"
            style={panelStyle}
            className="z-50 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {results.map((e) => (
              <button key={e.id} type="button"
                onClick={() => {
                  if (e.userId) { add.mutate({ memberUserId: e.userId }); onAdded(e.userId, e.name); }
                  setQ(''); setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                <Avatar name={e.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{e.name}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {[e.jobTitle, e.department].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
