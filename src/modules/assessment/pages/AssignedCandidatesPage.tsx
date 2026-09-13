import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Ban,
  CalendarDays,
  Check,
  Clock,
  Copy,
  CornerDownRight,
  FileText,
  ListChecks,
  Mail,
  MapPin,
  Phone,
  Search,
  Trophy,
  Users,
  Video,
  X,
} from 'lucide-react';

import {
  Avatar,
  Button,
  EmptyState,
  ErrorCard,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import {
  useFirstInterviewOutcome,
  useMyDelegatedCandidates,
  useUpdateInterview,
} from '../hooks/useAssessment';
import { BulkInterviewModal } from '../components/BulkInterviewModal';
import { CandidateInterviewsModal } from '../components/CandidateInterviewsModal';
import { ScreeningMarksModal } from '../components/ScreeningMarksModal';
import type {
  DelegatedCandidate,
  DelegatedTest,
} from '../types/assessment.types';

/* ------------------------------------------------------------------ *
 * A board, because the work is a pipeline.
 *
 * Columns are the stages of a first interview and a candidate is a card that
 * crosses them. Dragging is not decoration: a drop performs the step that
 * moves a candidate there — opening the scheduler, marking the session held,
 * or asking for the verdict. Steps that need information ask for it; steps
 * that do not just happen.
 *
 * The board is one framed surface split by rules rather than four floating
 * panels, so the eye reads columns of a single table instead of loose boxes.
 * ------------------------------------------------------------------ */

type Col = 'to_schedule' | 'scheduled' | 'decision_due' | 'done';

const COLUMNS: { key: Col; title: string; empty: string; dot: string }[] = [
  {
    key: 'to_schedule',
    title: 'To schedule',
    empty: 'Nothing waiting on a date',
    dot: 'bg-amber-400',
  },
  {
    key: 'scheduled',
    title: 'Scheduled',
    empty: 'No sessions arranged',
    dot: 'bg-sky-400',
  },
  {
    key: 'decision_due',
    title: 'Decision due',
    empty: 'No verdicts pending',
    dot: 'bg-brand-500',
  },
  {
    key: 'done',
    title: 'Done',
    empty: 'Nothing decided yet',
    dot: 'bg-emerald-500',
  },
];

const ORDER: Col[] = ['to_schedule', 'scheduled', 'decision_due', 'done'];

/**
 * Cards rendered per stage before the column offers to reveal the rest.
 *
 * Not page numbers: a board is scanned, and a card can only be dragged to a
 * stage whose rows are on screen — paging would hide half the pipeline and
 * make the header counts lie about the rest. The counts always reflect
 * everything; only the rendering is capped, so a busy column stays readable
 * and the DOM stays small.
 */
const COLUMN_LIMIT = 12;

/** Why a card can't jump a column — named by the step that is still missing. */
const SKIP_MESSAGE: Record<Col, string> = {
  to_schedule: 'Arrange the interview first.',
  scheduled: 'Mark the interview as held first.',
  decision_due: 'Record your decision first.',
  done: '',
};

function columnOf(row: DelegatedCandidate): Col {
  const s = row.candidate.stage;
  if (s === 'final' || s === 'rejected') return 'done';
  const first = row.rounds.find((r) => r.kind === 'first');
  if (!first) return 'to_schedule';
  return first.status === 'completed' ? 'decision_due' : 'scheduled';
}

/** One vacancy's candidates inside a stage. */
interface Group {
  id: string;
  code: string;
  designation: string;
  department: string;
  unit: string;
  rows: DelegatedCandidate[];
}

/**
 * Split a column by requisition.
 *
 * You interview for a vacancy, not for a stage — four people for the same post
 * are one afternoon's work, and the people either side of them in the column
 * are somebody else's. Grouping is what makes "schedule all of these" a
 * sentence the board can offer.
 */
function groupByRequisition(rows: DelegatedCandidate[]): Group[] {
  const groups = new Map<string, Group>();
  rows.forEach((row) => {
    const g = groups.get(row.requisition.id) ?? {
      id: row.requisition.id,
      code: row.requisition.code,
      designation: row.requisition.designation,
      department: row.requisition.department,
      unit: row.requisition.unitFactory,
      rows: [],
    };
    g.rows.push(row);
    groups.set(row.requisition.id, g);
  });
  // Newest requisition first — a post raised today should not sit below one
  // raised last month.
  return [...groups.values()].sort((a, z) => z.code.localeCompare(a.code));
}

/**
 * Trim a stage to `limit` cards without losing a vacancy.
 *
 * Taking the first N of the flat list would let the oldest requisition swallow
 * the whole cap and hide a newer one completely — the reason a fresh post used
 * to disappear down this page. Taking one card per vacancy in turn means every
 * vacancy keeps a place on the board, and what gets held back is depth within
 * a vacancy, not the vacancy itself.
 */
function capGroups(groups: Group[], limit: number): { groups: Group[]; hidden: number } {
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  if (total <= limit) return { groups, hidden: 0 };

  const taken = groups.map((g) => ({ ...g, rows: [] as DelegatedCandidate[] }));
  let shown = 0;
  for (let pass = 0; shown < limit; pass += 1) {
    let progressed = false;
    for (let i = 0; i < groups.length && shown < limit; i += 1) {
      const row = groups[i].rows[pass];
      if (!row) continue;
      taken[i].rows.push(row);
      shown += 1;
      progressed = true;
    }
    if (!progressed) break;
  }
  return {
    groups: taken.filter((g) => g.rows.length > 0),
    hidden: total - shown,
  };
}

/**
 * How long a candidate has been sitting unscheduled, and whether that is
 * starting to matter. A week is the point at which a good applicant is
 * taking someone else's offer, so the label stops being grey.
 */
const waiting = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  const text =
    d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? `${d}d ago` : formatDate(iso);
  return { text, tone: d >= 14 ? 'late' : d >= 7 ? 'ageing' : 'fresh' } as const;
};

/** Only says something when the date is close enough to act on. */
const urgency = (iso: string | null) => {
  if (!iso) return null;
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return null;
};

/** Where the session happens, in as few words as the card can afford. */
function venueOf(round: DelegatedCandidate['rounds'][number]) {
  if (round.online || round.mode === 'online')
    return { icon: Video, text: round.location || 'Online' };
  return round.location ? { icon: MapPin, text: round.location } : null;
}

export default function AssignedCandidatesPage() {
  const { data = [], isLoading, isError, error, refetch, isFetching } =
    useMyDelegatedCandidates();

  const [interviewTarget, setInterviewTarget] = useState<{
    reqId: string;
    candidate: { id: string; name: string };
  } | null>(null);
  const [marksTarget, setMarksTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [bulkFor, setBulkFor] = useState<{
    reqId: string;
    label: string;
    candidates: { id: string; name: string }[];
  } | null>(null);
  const [search, setSearch] = useState('');
  const [reqFilter, setReqFilter] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DelegatedCandidate | null>(null);
  const [hoverCol, setHoverCol] = useState<Col | null>(null);
  /** Card whose verdict form is open, keyed by delegation id. */
  const [deciding, setDeciding] = useState<string | null>(null);
  /** Stages the user has asked to see in full. */
  const [expanded, setExpanded] = useState<Partial<Record<Col, boolean>>>({});

  const requisitions = useMemo(() => {
    const m = new Map<
      string,
      { id: string; code: string; designation: string; n: number }
    >();
    data.forEach((r) => {
      const e = m.get(r.requisition.id) ?? {
        id: r.requisition.id,
        code: r.requisition.code,
        designation: r.requisition.designation,
        n: 0,
      };
      e.n += 1;
      m.set(r.requisition.id, e);
    });
    return [...m.values()].sort((a, b) => b.code.localeCompare(a.code));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (reqFilter && r.requisition.id !== reqFilter) return false;
      if (!q) return true;
      return (
        r.candidate.name.toLowerCase().includes(q) ||
        r.requisition.code.toLowerCase().includes(q) ||
        r.requisition.designation.toLowerCase().includes(q)
      );
    });
  }, [data, search, reqFilter]);

  const board = useMemo(() => {
    const b: Record<Col, DelegatedCandidate[]> = {
      to_schedule: [],
      scheduled: [],
      decision_due: [],
      done: [],
    };
    filtered.forEach((r) => b[columnOf(r)].push(r));
    const byDate = (a: DelegatedCandidate, z: DelegatedCandidate) => {
      const at = a.rounds.find((r) => r.kind === 'first')?.scheduledAt ?? '';
      const zt = z.rounds.find((r) => r.kind === 'first')?.scheduledAt ?? '';
      return at.localeCompare(zt);
    };
    // Oldest assignment first where nothing is booked — that is the backlog.
    b.to_schedule.sort((a, z) => a.createdAt.localeCompare(z.createdAt));
    b.scheduled.sort(byDate);
    b.decision_due.sort(byDate);
    b.done.sort((a, z) => z.createdAt.localeCompare(a.createdAt));

    const groups = {} as Record<Col, Group[]>;
    const counts = {} as Record<Col, number>;
    const hidden = {} as Record<Col, number>;
    ORDER.forEach((col) => {
      const all = groupByRequisition(b[col]);
      const capped = expanded[col]
        ? { groups: all, hidden: 0 }
        : capGroups(all, COLUMN_LIMIT);
      groups[col] = capped.groups;
      counts[col] = b[col].length;
      hidden[col] = capped.hidden;
    });
    return { groups, counts, hidden };
  }, [filtered, expanded]);

  // Silent: the board raises its own toast, because a one-gesture change
  // should come with a way back.
  const markHeld = useUpdateInterview(dragging?.candidate.id ?? '', true);

  /** What dropping a card into a column should actually do. */
  const handleDrop = (col: Col) => {
    const row = dragging;
    setDragging(null);
    setHoverCol(null);
    if (!row) return;

    const from = columnOf(row);
    if (from === col) return;
    if (ORDER.indexOf(col) < ORDER.indexOf(from)) {
      toast.error(
        'A candidate only moves forward here. Open the session to change a date, or ask Head of Talent Acquisition to reopen a decision.',
      );
      return;
    }
    if (ORDER.indexOf(col) - ORDER.indexOf(from) > 1) {
      toast.error(SKIP_MESSAGE[from]);
      return;
    }

    if (col === 'scheduled') {
      // Needs a date, a place and a panel, so it opens the scheduler.
      setInterviewTarget({
        reqId: row.requisition.id,
        candidate: { id: row.candidate.id, name: row.candidate.name },
      });
      return;
    }
    if (col === 'decision_due') {
      const first = row.rounds.find((r) => r.kind === 'first');
      if (!first) return;
      // Nothing to ask: the session simply happened.
      markHeld.mutate(
        { roundId: first.id, status: 'completed' },
        {
          onSuccess: () =>
            toast.success(`${row.candidate.name} — interview marked as held`, {
              action: {
                label: 'Undo',
                onClick: () =>
                  markHeld.mutate({ roundId: first.id, status: 'scheduled' }),
              },
            }),
        },
      );
      return;
    }
    if (col === 'done') {
      // Finalist or not is a judgement, so the card asks.
      setDeciding(row.id);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assigned to me"
        description="Your first-interview pipeline, stage by stage. Drag a candidate into the next stage, or use the action on the card."
      />

      {isLoading ? (
        <BoardSkeleton />
      ) : isError ? (
        <ErrorCard
          title="Couldn't load your assigned candidates"
          message={(error as Error)?.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Nothing assigned to you yet"
            description="When Head of Talent Acquisition or a recruiter sends you shortlisted candidates to interview, they appear here."
          />
        </div>
      ) : (
        <>
          {/* Narrow the board down */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Find a candidate…"
                leftIcon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {requisitions.length > 1 && (
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {requisitions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setReqFilter(reqFilter === r.id ? null : r.id)}
                    title={`${r.code} — ${r.designation}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[0.6875rem] ring-1 transition-colors',
                      reqFilter === r.id
                        ? 'bg-slate-900 text-white ring-slate-900'
                        : 'bg-white text-slate-600 ring-slate-200 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    {r.code}
                    <span
                      className={cn(
                        'tabular-nums',
                        reqFilter === r.id ? 'text-white/60' : 'text-slate-400',
                      )}
                    >
                      {r.n}
                    </span>
                  </button>
                ))}
                {reqFilter && (
                  <button
                    type="button"
                    onClick={() => setReqFilter(null)}
                    className="inline-flex items-center gap-1 px-1 text-[0.6875rem] font-medium text-slate-500 hover:text-slate-900"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* The board. One framed surface split by rules — it scrolls sideways
              rather than reflowing, because a pipeline read out of order is not
              a pipeline, and snaps so a swipe lands on one column. */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <div className="snap-x snap-mandatory overflow-x-auto">
              <div className="grid grid-cols-[repeat(4,minmax(16.5rem,1fr))] divide-x divide-slate-200">
                {COLUMNS.map((col) => {
                  const groups = board.groups[col.key];
                  const total = board.counts[col.key];
                  const hidden = board.hidden[col.key];
                  const isOpen = Boolean(expanded[col.key]);
                  const isTarget = hoverCol === col.key;
                  return (
                    <section
                      key={col.key}
                      data-column={col.key}
                      onDragOver={(e) => {
                        if (!dragging) return;
                        e.preventDefault();
                        setHoverCol(col.key);
                      }}
                      onDragLeave={() =>
                        setHoverCol((c) => (c === col.key ? null : c))
                      }
                      onDrop={() => handleDrop(col.key)}
                      className={cn(
                        'flex snap-start flex-col transition-colors',
                        isTarget ? 'bg-brand-50/70' : 'bg-slate-50/60',
                      )}
                    >
                      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
                        <span
                          className={cn('h-1.5 w-1.5 rounded-full', col.dot)}
                          aria-hidden
                        />
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          {col.title}
                        </h2>
                        <span className="rounded bg-slate-100 px-1.5 text-[0.6875rem] font-semibold tabular-nums text-slate-500">
                          {total}
                        </span>
                        {hidden > 0 || isOpen ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((e) => ({ ...e, [col.key]: !e[col.key] }))
                            }
                            className="ml-auto shrink-0 text-[0.6875rem] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                            title={
                              isOpen
                                ? `Show only the first ${COLUMN_LIMIT}`
                                : `${hidden} more not shown`
                            }
                          >
                            {isOpen ? 'Show fewer' : `Show all ${total}`}
                          </button>
                        ) : (
                          groups.length > 1 && (
                            <span className="ml-auto text-[0.6875rem] tabular-nums text-slate-400">
                              {groups.length} vacancies
                            </span>
                          )
                        )}
                      </header>

                      <div className="flex min-h-[20rem] flex-1 flex-col gap-4 p-2.5">
                        {groups.length === 0 ? (
                          <p className="px-2 pt-6 text-center text-xs text-slate-400">
                            {isTarget ? 'Drop to move here' : col.empty}
                          </p>
                        ) : (
                          groups.map((group) => (
                            <div key={group.id}>
                              <div className="mb-2 border-b border-slate-200 pb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="min-w-0 flex-1 truncate font-mono text-[0.6875rem] font-semibold text-slate-700">
                                    {group.code}
                                  </span>
                                  {col.key === 'to_schedule' &&
                                  group.rows.length > 1 ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setBulkFor({
                                          reqId: group.id,
                                          label: `${group.code} · ${group.designation}`,
                                          candidates: group.rows.map((r) => ({
                                            id: r.candidate.id,
                                            name: r.candidate.name,
                                          })),
                                        })
                                      }
                                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100"
                                      title={`One session for all ${group.rows.length} candidates on ${group.code}`}
                                    >
                                      <CalendarDays className="h-3 w-3" />
                                      Schedule all {group.rows.length}
                                    </button>
                                  ) : (
                                    <span className="shrink-0 rounded bg-slate-100 px-1.5 text-[0.6875rem] font-semibold tabular-nums text-slate-500">
                                      {group.rows.length}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className="mt-0.5 truncate text-[0.6875rem] leading-4 text-slate-500"
                                  title={`${group.designation} — ${group.department}, ${group.unit}`}
                                >
                                  {group.designation}
                                  {group.department && (
                                    <>
                                      <span className="text-slate-300"> · </span>
                                      <span className="text-slate-400">
                                        {group.department}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                              <div className="space-y-2">
                                {group.rows.map((row) => (
                                  <BoardCard
                                    key={row.id}
                                    row={row}
                                    col={col.key}
                                    dragging={dragging?.id === row.id}
                                    deciding={deciding === row.id}
                                    onDragStart={() => setDragging(row)}
                                    onDragEnd={() => {
                                      setDragging(null);
                                      setHoverCol(null);
                                    }}
                                    onOpenDecision={() => setDeciding(row.id)}
                                    onCloseDecision={() => setDeciding(null)}
                                    onSchedule={() =>
                                      setInterviewTarget({
                                        reqId: row.requisition.id,
                                        candidate: {
                                          id: row.candidate.id,
                                          name: row.candidate.name,
                                        },
                                      })
                                    }
                                    onEnterMarks={() =>
                                      setMarksTarget({
                                        id: row.candidate.id,
                                        name: row.candidate.name,
                                      })
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                        {hidden > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((e) => ({ ...e, [col.key]: true }))
                            }
                            className="mt-1 rounded-md border border-dashed border-slate-300 py-1.5 text-[0.6875rem] font-medium text-slate-500 transition-colors hover:border-slate-400 hover:bg-white hover:text-slate-700"
                          >
                            {hidden} more in this stage
                          </button>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {bulkFor && (
        <BulkInterviewModal
          open
          firstRoundOnly
          reqId={bulkFor.reqId}
          reqLabel={bulkFor.label}
          candidates={bulkFor.candidates}
          onClose={() => setBulkFor(null)}
        />
      )}
      {marksTarget && (
        <ScreeningMarksModal
          candidate={marksTarget}
          onClose={() => setMarksTarget(null)}
        />
      )}
      {interviewTarget && (
        <CandidateInterviewsModal
          open
          firstRoundOnly
          reqId={interviewTarget.reqId}
          candidate={interviewTarget.candidate}
          onClose={() => setInterviewTarget(null)}
        />
      )}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-2 divide-x divide-slate-200 xl:grid-cols-4">
        {[0, 1, 2, 3].map((c) => (
          <div key={c} className="bg-slate-50/60">
            <div className="border-b border-slate-200 bg-white px-3 py-3">
              <Skeleton className="h-2.5 w-24" />
            </div>
            <div className="space-y-2 p-2.5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A contact detail, shown in full and copied on click.
 *
 * Not a mailto:/tel: link — those assume a phone. Here the value itself is
 * the point, and one click puts it on the clipboard for the dialler or mail
 * client the user actually has open.
 */
function CopyLine({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Phone;
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      draggable={false}
      title={`${value} — click to copy`}
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          })
          .catch(() => toast.error(`Could not copy the ${label}`));
      }}
      className="group/copy flex w-full items-start gap-1 text-left text-[0.6875rem] leading-4 text-slate-500 transition-colors hover:text-slate-900"
    >
      <Icon className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
      <span className="min-w-0 break-all tabular-nums">{value}</span>
      {copied ? (
        <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="mt-0.5 h-3 w-3 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover/copy:opacity-100" />
      )}
    </button>
  );
}

/** One screening test: its mark if taken, its state if not. */
function TestChip({ test }: { test: DelegatedTest }) {
  const scored = test.obtained != null && test.total != null;
  return (
    <span
      title={
        scored
          ? `${test.label}: ${test.obtained}/${test.total} — ${test.passed ? 'passed' : 'below the pass mark'}`
          : `${test.label}: not marked yet`
      }
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.625rem] font-medium tabular-nums ring-1',
        !scored
          ? 'bg-slate-50 text-slate-400 ring-slate-200'
          : test.passed
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : 'bg-rose-50 text-rose-700 ring-rose-200',
      )}
    >
      <span className="font-semibold uppercase tracking-wide">
        {test.key === 'computer' ? 'CL' : test.key === 'ai' ? 'AI' : 'WR'}
      </span>
      {scored ? `${test.obtained}/${test.total}` : '—'}
    </span>
  );
}

function BoardCard({
  row,
  col,
  dragging,
  deciding,
  onDragStart,
  onDragEnd,
  onOpenDecision,
  onCloseDecision,
  onSchedule,
  onEnterMarks,
}: {
  row: DelegatedCandidate;
  col: Col;
  dragging: boolean;
  deciding: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpenDecision: () => void;
  onCloseDecision: () => void;
  onSchedule: () => void;
  onEnterMarks: () => void;
}) {
  const outcome = useFirstInterviewOutcome();
  const [verdict, setVerdict] = useState<'final' | 'rejected' | null>(null);
  const [note, setNote] = useState('');

  const first = row.rounds.find((r) => r.kind === 'first');
  const soon = urgency(first?.scheduledAt ?? null);
  const age = waiting(row.createdAt);
  const venue = first ? venueOf(first) : null;
  const rejected = row.candidate.stage === 'rejected';
  const draggable = col !== 'done' && !deciding;

  return (
    <article
      data-card={row.id}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow',
        draggable && 'cursor-grab active:cursor-grabbing hover:shadow-card-hover',
        dragging && 'opacity-40',
      )}
    >
      {/* Who — the vacancy is named once, on the group header above. */}
      <div className="flex items-center gap-2.5">
        <Avatar name={row.candidate.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-semibold leading-tight tracking-tight text-slate-900">
            {row.candidate.name}
          </p>
        </div>
      </div>

      {/* The number and address themselves. This board is worked at a desk,
          where a tel: link opens nothing — so the details are shown to be
          read, dialled by hand, or copied in one click. */}
      {col !== 'done' && (row.candidate.phone || row.candidate.email) && (
        <div className="mt-2 space-y-0.5">
          {row.candidate.phone && (
            <CopyLine
              icon={Phone}
              value={row.candidate.phone}
              label="phone number"
            />
          )}
          {row.candidate.email && (
            <CopyLine
              icon={Mail}
              value={row.candidate.email}
              label="email address"
            />
          )}
        </div>
      )}

      {/* Who handed this over, and anything they asked for. The note is the
          recruiter writing to this interviewer; dropping it loses the only
          message in the whole handover. */}
      {col !== 'done' && (row.delegatedBy || row.note) && (
        <div className="mt-2 space-y-1">
          {row.delegatedBy && (
            <p
              className="flex items-center gap-1 truncate text-[0.6875rem] text-slate-400"
              title={`Sent to you by ${row.delegatedBy.name}`}
            >
              <CornerDownRight className="h-3 w-3 shrink-0" />
              from {row.delegatedBy.name}
            </p>
          )}
          {row.note && (
            <p
              className="line-clamp-2 border-l-2 border-brand-300 pl-2 text-[0.6875rem] leading-4 text-slate-600"
              title={row.note}
            >
              {row.note}
            </p>
          )}
        </div>
      )}

      {/* Screening marks, so the picture is complete before the interview
          rather than one dialog at a time. */}
      {col !== 'done' && row.tests.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {row.tests.some((t) => t.obtained != null) ? (
            row.tests.map((t) => <TestChip key={t.key} test={t} />)
          ) : (
            <span
              title={`Not marked yet: ${row.tests.map((t) => t.label).join(', ')}`}
              className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-slate-400 ring-1 ring-slate-200"
            >
              <ListChecks className="h-2.5 w-2.5" />
              {row.tests.length} test{row.tests.length === 1 ? '' : 's'} not marked
            </span>
          )}
        </div>
      )}

      {/* When, and what to do about it */}
      {!deciding && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[0.6875rem]">
            {row.alsoAssignedTo.length > 0 && col !== 'done' && (
              <span
                title={`Also assigned to ${row.alsoAssignedTo.join(', ')}`}
                className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-50 px-1 py-0.5 text-[0.625rem] font-medium tabular-nums text-amber-700"
              >
                <Users className="h-2.5 w-2.5" />+{row.alsoAssignedTo.length}
              </span>
            )}
            {col === 'to_schedule' && (
              <span
                className={cn(
                  'truncate',
                  age.tone === 'late'
                    ? 'font-semibold text-rose-600'
                    : age.tone === 'ageing'
                      ? 'font-medium text-amber-600'
                      : 'text-slate-400',
                )}
                title={
                  age.tone === 'fresh'
                    ? undefined
                    : 'Waiting a long time for a date'
                }
              >
                {age.tone !== 'fresh' && <Clock className="mr-1 inline h-3 w-3" />}
                assigned {age.text}
              </span>
            )}
            {(col === 'scheduled' || col === 'decision_due') && first && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-medium',
                  soon === 'overdue'
                    ? 'text-rose-600'
                    : soon
                      ? 'text-amber-600'
                      : 'text-slate-500',
                )}
              >
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {first.scheduledAt ? formatDate(first.scheduledAt) : 'time TBD'}
                  {soon && ` · ${soon}`}
                </span>
              </span>
            )}
            {col === 'done' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-semibold',
                  rejected ? 'text-rose-600' : 'text-emerald-600',
                )}
              >
                {rejected ? (
                  <>
                    <Ban className="h-3 w-3" /> Not taken forward
                  </>
                ) : (
                  <>
                    <Trophy className="h-3 w-3" /> Finalist
                  </>
                )}
              </span>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {/* Reference tools, as one segmented control so they read as
                buttons rather than as decoration. */}
            <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white">
              {row.candidate.cvUrl && (
                <>
                  <a
                    href={row.candidate.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    draggable={false}
                    title="Open CV"
                    className="flex h-7 w-7 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-600"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </a>
                  <span className="h-4 w-px bg-slate-200" aria-hidden />
                </>
              )}
              <button
                type="button"
                onClick={onEnterMarks}
                title="Test marks"
                className="flex h-7 w-7 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-600"
              >
                <ListChecks className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* The step itself. Solid where the board is waiting on you,
                outlined where the work is already in hand. */}
            {col === 'to_schedule' && (
              <Button size="sm" className="h-7 px-2.5 text-xs" onClick={onSchedule}>
                <CalendarDays className="mr-1 h-3.5 w-3.5" /> Arrange
              </Button>
            )}
            {col === 'scheduled' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                onClick={onSchedule}
              >
                <Clock className="mr-1 h-3.5 w-3.5" /> Manage
              </Button>
            )}
            {col === 'decision_due' && (
              <Button
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={onOpenDecision}
              >
                <Check className="mr-1 h-3.5 w-3.5" /> Decide
              </Button>
            )}
          </div>
        </div>
      )}

      {rejected && (row.candidate.rejectionReason || row.candidate.rejectedByName) && (
        <div className="mt-2 border-l-2 border-rose-200 pl-2">
          {row.candidate.rejectionReason && (
            <p
              className="line-clamp-2 text-[0.6875rem] leading-4 text-slate-500"
              title={row.candidate.rejectionReason}
            >
              {row.candidate.rejectionReason}
            </p>
          )}
          {row.candidate.rejectedByName && (
            <p className="mt-0.5 text-[0.6875rem] text-slate-400">
              by {row.candidate.rejectedByName}
              {row.candidate.rejectedAt &&
                ` · ${formatDate(row.candidate.rejectedAt)}`}
            </p>
          )}
        </div>
      )}

      {/* Where and with whom — a date on its own does not say whether the
          session is actually ready to run. */}
      {!deciding && venue && (col === 'scheduled' || col === 'decision_due') && (
        <p
          className="mt-1.5 flex items-center gap-1 truncate text-[0.6875rem] text-slate-400"
          title={venue.text}
        >
          <venue.icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{venue.text}</span>
          {first && first.panelists > 0 && (
            <span className="shrink-0 text-slate-300">
              · {first.panelists} on panel
            </span>
          )}
        </p>
      )}

      {/* The verdict, asked for on the card itself */}
      {deciding && (
        <div className="mt-3 rounded-md bg-slate-50 p-2.5 ring-1 ring-slate-200">
          {!verdict ? (
            <>
              <p className="text-[0.6875rem] font-medium text-slate-700">
                Does {row.candidate.name.split(' ')[0]} go through to the final
                stage?
              </p>
              <div className="mt-2 flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 border-rose-200 px-2 text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                  onClick={() => setVerdict('rejected')}
                >
                  <Ban className="mr-1 h-3.5 w-3.5" /> No
                </Button>
                <Button
                  size="sm"
                  className="h-8 flex-1 px-2 text-xs"
                  onClick={() => setVerdict('final')}
                >
                  <Trophy className="mr-1 h-3.5 w-3.5" /> Yes
                </Button>
              </div>
              <button
                type="button"
                onClick={onCloseDecision}
                className="mt-2 w-full text-center text-[0.6875rem] text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <Textarea
                rows={2}
                maxLength={500}
                placeholder={
                  verdict === 'final'
                    ? 'Remarks (optional)'
                    : 'Why — this is what everyone downstream will see'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {outcome.isError && (
                <p className="mt-1.5 text-[0.6875rem] text-red-600">
                  {(outcome.error as Error).message}
                </p>
              )}
              <div className="mt-2 flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setVerdict(null)}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  variant={verdict === 'final' ? 'primary' : 'danger'}
                  className="h-8 flex-1 px-2.5 text-xs"
                  isLoading={outcome.isPending}
                  // A rejection without a reason leaves the next person guessing.
                  disabled={verdict === 'rejected' && !note.trim()}
                  onClick={() =>
                    outcome.mutate(
                      {
                        candidateId: row.candidate.id,
                        outcome: verdict,
                        note: note.trim() || undefined,
                      },
                      { onSuccess: onCloseDecision },
                    )
                  }
                >
                  {verdict === 'final' ? 'Mark finalist' : 'Reject'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
