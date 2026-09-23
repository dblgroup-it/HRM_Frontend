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
  Check,
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Lightbulb,
  Lock,
  Mail,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Video,
  X,
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
import { formatDate } from '@shared/utils';
import { useAnchoredPanel, useDebounce } from '@shared/hooks';
import { useEmployees } from '@modules/employees';
import type { Requisition } from '@modules/requisition/types/requisition.types';
import { useCandidates, useUpdateCandidate } from '@modules/candidates';
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
import { heldByLabel } from './heldByLabel';
import {
  recommendationLabel,
  recommendationTone,
} from './recommendation';

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

  const candidates = useMemo(() => page?.items ?? [], [page]);
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
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Auto-select first candidate when list loads
  useEffect(() => {
    if (!selected && candidates.length > 0) setSelected(candidates[0]);
  }, [candidates, selected]);

  // Keep selection in sync if candidate data refreshes
  useEffect(() => {
    if (selected) {
      const fresh = candidates.find((c) => c.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  if (isLoading) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
            <Users className="h-4 w-4 text-amber-600" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} at interview stage
            </p>
            <p className="text-[0.6875rem] text-slate-400">
              Select a candidate to manage their interviews
              {heldCount > 0 &&
                ` · ${heldCount} out for a first interview`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setAddOpen(true)}
          >
            Add candidates
          </Button>
          {schedulable.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<CalendarClock className="h-4 w-4" />}
              onClick={() => setBulkOpen(true)}
            >
              Schedule all at once
            </Button>
          )}
        </div>
      </div>

      {/* ── Workspace: list ↔ detail ─────────────────────────────────── */}
      {candidates.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No candidates at interview stage"
          description="Search and add a candidate above, or move one to Interview from the Recruitment tab."
        />
      ) : (
        <div className="flex min-h-0 gap-4 rounded-2xl border border-slate-200 bg-white overflow-hidden"
             style={{ minHeight: '70vh' }}>

          {/* LEFT — candidate list */}
          <div className="flex w-72 shrink-0 flex-col border-r border-slate-100">
            <div className="border-b border-slate-100 px-3 py-2.5">
              <p className="text-[0.625rem] font-semibold uppercase tracking-widest text-slate-400">
                Candidates
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {candidates.map((c) => (
                <CandidateListCard
                  key={c.id}
                  candidate={c}
                  active={selected?.id === c.id}
                  onSelect={() => setSelected(c)}
                />
              ))}
            </div>
          </div>

          {/* RIGHT — interview workspace */}
          {selected ? (
            <InterviewWorkspace
              key={selected.id}
              reqId={reqId}
              candidate={selected}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Select a candidate to begin
            </div>
          )}
        </div>
      )}

      {/* Bulk modal */}
      <BulkInterviewModal
        reqId={reqId}
        candidates={schedulable}
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
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

  const eligible = (data?.items ?? []).filter(
    (c) => (STAGE_RANK[c.stage] ?? -1) >= STAGE_RANK.shortlisted && c.stage !== 'interview',
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

function CandidateListCard({
  candidate,
  active,
  onSelect,
}: {
  candidate: Candidate;
  active: boolean;
  onSelect: () => void;
}) {
  const held = candidate.firstInterviewHold;
  // Fetch rounds to show progress dots
  const { data: rounds = [] } = useCandidateInterviews(candidate.id);
  const completedCount = rounds.filter((r) => r.status === 'completed').length;
  const scheduledCount = rounds.filter((r) => r.status === 'scheduled').length;
  const totalRounds = rounds.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group w-full border-b border-slate-50 px-3 py-3 text-left transition-all duration-150',
        active
          ? 'bg-brand-50 border-l-[3px] border-l-brand-500 pl-[9px]'
          : 'hover:bg-slate-50 border-l-[3px] border-l-transparent',
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={candidate.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={cn(
              'truncate text-sm font-medium',
              active ? 'text-brand-800' : 'text-slate-800',
            )}>
              {candidate.name}
            </p>
            {candidate.matchScore !== null && (
              <span className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold',
                matchTone(candidate.matchScore),
              )}>
                <Sparkles className="h-2.5 w-2.5" />
                {candidate.matchScore}%
              </span>
            )}
          </div>

          {candidate.salaryExpectation != null && (
            <span className="mt-0.5 inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[0.625rem] font-semibold text-emerald-700">
              ৳ {candidate.salaryExpectation.toLocaleString()} expected
            </span>
          )}

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
            <p className="mt-0.5 text-[0.625rem] text-slate-400">No interviews yet</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Interview workspace (right panel) ────────────────────────────────────────

function InterviewWorkspace({
  reqId,
  candidate,
}: {
  reqId: string;
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
  const [panel, setPanel]             = useState<{ userId: string; name: string }[]>([]);
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const [notifyPanel, setNotifyPanel]         = useState(true);
  const [locationError, setLocationError]     = useState(false);

  const kindAutoSetRef = useRef(false);

  useEffect(() => {
    // Auto-suggest kind when rounds load
    if (!kindAutoSetRef.current && rounds.length > 0) {
      setKind(suggestNextKind(rounds));
      kindAutoSetRef.current = true;
    }
  }, [rounds]);

  const committee = setup?.committee ?? [];
  const inPanel = (uid: string) => panel.some((p) => p.userId === uid);
  const addPanelist = (uid: string, name: string) =>
    setPanel((prev) => prev.some((p) => p.userId === uid) ? prev : [...prev, { userId: uid, name }]);
  const removePanelist = (uid: string) =>
    setPanel((prev) => prev.filter((p) => p.userId !== uid));

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
        scheduledAt: scheduledAt || undefined,
        location: location.trim() || undefined,
        panelistUserIds: panel.map((p) => p.userId),
        notifyCandidate, notifyPanel,
      },
      {
        onSuccess: () => {
          setScheduledAt('');
          setLocation('');
          setPanel([]);
          setLocationError(false);
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                <UserX className="h-3.5 w-3.5" /> Rejected
              </span>
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
                    setRejectOpen(false);
                    setRejectReason('');
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
      </Modal>

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

      {/* ── Body: history (left) + form (right) ─────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* History column */}
        <div className="flex w-[42%] shrink-0 flex-col overflow-hidden border-r border-slate-100 bg-slate-50/50">
          <div className="shrink-0 border-b border-slate-100 px-4 py-2.5">
            <p className="text-[0.625rem] font-semibold uppercase tracking-widest text-slate-400">
              Scheduled Rounds
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : rounds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
                <CalendarClock className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-400">No interviews yet</p>
                <p className="mt-0.5 text-xs text-slate-300">
                  {held
                    ? `${heldByLabel(held)} has not arranged it yet.`
                    : 'Use the form on the right to schedule the first one.'}
                </p>
              </div>
            ) : (
              rounds.map((r) => (
                <RoundCard
                  key={r.id}
                  round={r}
                  candidateId={candidate.id}
                  onRemove={() => remove.mutate(r.id)}
                  readOnly={Boolean(held)}
                />
              ))
            )}

            {/* AI Evaluation Summary */}
            {hasEvaluations && (
              <div className="overflow-hidden rounded-xl border border-violet-200 bg-violet-50/60">
                <div className="flex items-center justify-between px-3 py-2.5">
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
                  <p className="border-t border-violet-100 px-3 py-3 text-xs text-violet-500">
                    <Sparkles className="mr-1.5 inline h-3.5 w-3.5 animate-pulse" />
                    AI is reading panel evaluations…
                  </p>
                )}
                {summaryText && !evalSummary.isPending && (
                  <p className="border-t border-violet-100 px-3 py-3 text-xs leading-relaxed text-slate-700">
                    {summaryText}
                  </p>
                )}
                {!summaryText && !evalSummary.isPending && (
                  <p className="border-t border-violet-100 px-3 pb-3 pt-2 text-[0.6875rem] text-violet-400">
                    Click Generate to get an AI synthesis of all panel scores and comments.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Schedule form column — or why there isn't one */}
        {held ? (
          <HeldByDelegate names={heldByLabel(held)} />
        ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-slate-100 bg-white/80 px-5 py-2.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CalendarClock className="h-4 w-4 text-brand-600" />
              Schedule a new interview
            </p>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">

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
                  options={KIND_OPTIONS.map((k) => ({ value: k.value, label: `${k.label} interview` }))}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                {mode === 'online' && !customLink ? (
                  <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <Video className="h-3.5 w-3.5" /> Google Meet — auto
                    </span>
                    <button type="button" onClick={() => setCustomLink(true)}
                      className="text-[0.6875rem] text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline">
                      custom link
                    </button>
                  </div>
                ) : (
                  <div>
                    <Input
                      placeholder={mode === 'online' ? 'https://… (Teams, Zoom…)' : 'Venue — e.g. HQ Board Room 3 *'}
                      value={location}
                      onChange={(e) => { setLocation(e.target.value); if (e.target.value.trim()) setLocationError(false); }}
                      className={locationError && mode !== 'online' ? 'border-rose-400 focus:ring-rose-400' : ''}
                    />
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
                Panel gets a Google Calendar invite with reminders.
              </p>
            </FormStep>

            {/* ③ Panel */}
            <FormStep n={3} title="Who interviews?">
              {panel.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {panel.map((p) => (
                    <span key={p.userId}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 py-1 pl-1 pr-2 text-xs font-medium text-white">
                      <Avatar name={p.name} size="sm" />
                      {p.name}
                      <button type="button" onClick={() => removePanelist(p.userId)}
                        className="rounded-full p-0.5 hover:bg-white/20">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {committee.some((m) => !inPanel(m.userId)) && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-400">Committee:</span>
                  {committee.filter((m) => !inPanel(m.userId)).map((m) => (
                    <button key={m.userId} type="button" onClick={() => addPanelist(m.userId, m.name)}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700">
                      + {m.name}
                    </button>
                  ))}
                </div>
              )}
              <PanelMemberPicker
                reqId={reqId}
                existingUserIds={[...committee.map((m) => m.userId), ...panel.map((p) => p.userId)]}
                onAdded={addPanelist}
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
        sublabel={mode === 'online' ? 'Creating calendar invite and Google Meet link.' : 'Creating calendar invite for the panel.'}
      />
    </div>
  );
}

// ─── The first interview is somebody else's ───────────────────────────────────

/**
 * What the workspace shows instead of a round nobody here arranged.
 *
 * Not an error and not an empty state: the work is happening, just not on this
 * screen. So it says who has it, when it comes back, and the one deliberate
 * way to take it back — withdrawing the hand-off, which leaves a record, as
 * opposed to quietly rescheduling somebody else's interview.
 */
function HeldByDelegate({ names }: { names: string }) {
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
          arranging and running it is theirs. It appears here once they record
          the outcome — put through or turned down.
        </p>
        <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-slate-400">
          Follow it on the <span className="font-medium text-slate-500">Recruitment</span> tab
          under <span className="font-medium text-slate-500">Assignments</span>. To take it
          back, withdraw the hand-off there.
        </p>
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
  const maxTotal = round.criteria.reduce((s, c) => s + c.max, 0);
  const avg = round.evaluations.length > 0
    ? Math.round((round.evaluations.reduce((s, e) => s + e.total, 0) / round.evaluations.length) * 10) / 10
    : 0;

  const borderColor =
    round.status === 'completed' ? 'border-l-emerald-400' :
    round.status === 'scheduled' ? 'border-l-amber-400'  : 'border-l-slate-200';

  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-200 border-l-4 bg-white shadow-sm transition-shadow hover:shadow-md', borderColor)}>
      {/* Header */}
      <div className={cn(
        'flex flex-wrap items-center justify-between gap-2 px-3 py-2',
        round.status === 'completed' ? 'bg-emerald-50/50' : 'bg-slate-50/60',
      )}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold capitalize text-slate-800">{round.kind} Interview</span>
          <Badge tone="neutral">{round.mode}</Badge>
          <Badge tone={STATUS_TONE[round.status]}>{round.status}</Badge>
        </div>
        {!readOnly && (
          <button type="button" title="Remove" onClick={onRemove}
            className="shrink-0 rounded p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Meta */}
      <div className="border-t border-slate-100 px-3 py-2 text-[0.6875rem] text-slate-500">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {round.scheduledAt ? formatDate(round.scheduledAt) : 'Time TBD'}
          </span>
          {round.meetLink ? (
            <a href={round.meetLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:underline">
              <Video className="h-3 w-3" /> Meet
            </a>
          ) : round.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {round.location}
            </span>
          ) : null}
          {round.calendarSynced && (
            <span className="inline-flex items-center gap-1 text-brand-600">
              <CalendarCheck className="h-3 w-3" /> Invites sent
            </span>
          )}
        </div>

        {/* Panelists */}
        {round.panelists.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {round.panelists.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium',
                  p.hasMarked
                    ? 'bg-emerald-50 text-emerald-700'
                    : p.tokenStatus === 'opened'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-600',
                )}>
                  {p.hasMarked ? (
                    <Check className="h-3 w-3" />
                  ) : p.tokenStatus === 'opened' ? (
                    <Circle className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  ) : (
                    <Circle className="h-2.5 w-2.5 fill-slate-300 text-slate-300" />
                  )}
                  {p.name}
                  {!p.hasMarked && p.tokenStatus && (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[0.5625rem] font-semibold',
                      p.tokenStatus === 'opened' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500',
                    )}>
                      {p.tokenStatus === 'opened' ? 'Opened' : 'Sent'}
                    </span>
                  )}
                </span>
                {!readOnly && !p.hasMarked && (
                  <div className="ml-auto flex items-center gap-1.5">
                    {p.evalLink && (
                      <button type="button"
                        onClick={() => void navigator.clipboard.writeText(p.evalLink!)}
                        className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[0.625rem] font-semibold text-brand-700 transition hover:bg-brand-100 active:scale-95">
                        <ClipboardCopy className="h-3 w-3" /> Copy link
                      </button>
                    )}
                    <button type="button"
                      disabled={resend.isPending}
                      onClick={() => resend.mutate({ roundId: round.id, panelistUserId: p.userId },
                        { onSuccess: (d) => void navigator.clipboard.writeText(d.evalLink) })}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.625rem] font-semibold text-amber-700 transition hover:bg-amber-100 active:scale-95 disabled:opacity-40">
                      <RotateCcw className="h-3 w-3" /> New link
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Somebody joining a session that is still to run is normal — a
            third interviewer walks in, or the panel is short. Appends only:
            the people already listed keep their link and their marks, and
            only the newcomer is told.

            Gone once the round is marked done (or the candidate did not turn
            up, or it was cancelled). The panel is the record of who was in
            that room, and adding to it afterwards mints an evaluation link
            for an interview the person never sat in — the server refuses it
            too, so the control would only ever produce an error. */}
        {!readOnly && round.status === 'scheduled' && (
          <AddPanelistInline
            roundId={round.id}
            candidateId={candidateId}
            existingUserIds={round.panelists.map((p) => p.userId)}
          />
        )}
      </div>

      {/* ── Outcome ───────────────────────────────────────────────────────
          The two things that actually happen to a booked session, asked as a
          question with two answers. They were a pair of 11px text links
          wedged between the status badges and the delete bin — the most
          consequential controls on the card, styled as the least, and one
          mis-aim away from deleting the round instead. */}
      {!readOnly && round.status === 'scheduled' && (
        <div className="border-t border-slate-100 bg-white px-3 py-2.5">
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
        <div className="flex items-center justify-between gap-2 border-t border-rose-100 bg-rose-50/70 px-3 py-2">
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

      {/* Evaluations */}
      {round.evaluations.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
          <p className="mb-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">Evaluations</p>
          <div className="space-y-1">
            {round.evaluations.map((ev) => (
              <div key={ev.evaluatorId} className="flex items-center justify-between">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-medium text-slate-600">{ev.evaluatorName}</span>
                  {/* The verdict beside the number. A total says how they did;
                      this says what the person in the room wants done. */}
                  {ev.recommendation && (
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide ring-1',
                        recommendationTone(ev.recommendation),
                      )}
                    >
                      {recommendationLabel(ev.recommendation)}
                    </span>
                  )}
                </span>
                <span className="ml-2 shrink-0 font-semibold text-slate-700">
                  {ev.total.toFixed(1)}{maxTotal > 0 && <span className="text-slate-400"> / {maxTotal}</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1.5">
            <span className="text-slate-500">Avg ({round.evaluations.length}/{round.panelists.length} marked)</span>
            <span className="font-semibold text-brand-700">
              {avg.toFixed(1)}{maxTotal > 0 && <span className="text-slate-400"> / {maxTotal}</span>}
            </span>
          </div>
        </div>
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

function ToggleChip({ checked, onChange, icon, label }: {
  checked: boolean; onChange: (v: boolean) => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
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
