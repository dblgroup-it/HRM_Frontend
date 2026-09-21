import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  BadgeDollarSign,
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
} from '../hooks/useAssessment';
import { BulkInterviewModal } from '../components/BulkInterviewModal';
import { CandidateInterviewsModal } from '../components/CandidateInterviewsModal';
import { ScreeningMarksModal } from '../components/ScreeningMarksModal';
import { CandidatePackageModal } from '../components/CandidatePackageModal';
import type {
  DelegatedCandidate,
  DelegatedTest,
} from '../types/assessment.types';
import { resolveApiFileUrl } from '@shared/api';

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

/**
 * Each stage carries its own colour, used on the tab, the count and the
 * requisition rail beneath it.
 *
 * Not decoration: four tabs in one shade of blue are four identical shapes,
 * and the whole point of the bar is to say at a glance where the work has
 * piled up. Amber waits on you, sky is in hand, violet wants a decision,
 * emerald is finished.
 */
const COLUMNS: {
  key: Col;
  title: string;
  empty: string;
  dot: string;
  /** Applied to the tab when it is the active one. */
  active: string;
  /** The count pill on the active tab. */
  pill: string;
  /** The underline and the requisition rail. */
  bar: string;
}[] = [
  {
    key: 'to_schedule',
    title: 'To schedule',
    empty: 'Nothing waiting on a date',
    dot: 'bg-amber-400',
    active: 'bg-amber-50 text-amber-900',
    pill: 'bg-amber-500 text-white',
    bar: 'bg-amber-500',
  },
  {
    key: 'scheduled',
    title: 'Scheduled',
    empty: 'No sessions arranged',
    dot: 'bg-sky-400',
    active: 'bg-sky-50 text-sky-900',
    pill: 'bg-sky-500 text-white',
    bar: 'bg-sky-500',
  },
  {
    key: 'decision_due',
    title: 'Decision due',
    empty: 'No verdicts pending',
    dot: 'bg-brand-500',
    active: 'bg-violet-50 text-violet-900',
    pill: 'bg-violet-500 text-white',
    bar: 'bg-violet-500',
  },
  {
    key: 'done',
    title: 'Done',
    empty: 'Nothing decided yet',
    dot: 'bg-emerald-500',
    active: 'bg-emerald-50 text-emerald-900',
    pill: 'bg-emerald-500 text-white',
    bar: 'bg-emerald-500',
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

  /** The card whose salary/benefits form is open, if any. */
  const [packageFor, setPackageFor] = useState<DelegatedCandidate | null>(null);
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
  const [deciding, setDeciding] = useState<string | null>(null);
  /** Stages the user has asked to see in full. */
  const [expanded, setExpanded] = useState<Partial<Record<Col, boolean>>>({});
  /** Which stage the tabs are showing. Opens on the work that needs doing. */
  const [activeCol, setActiveCol] = useState<Col>('to_schedule');

  /**
   * Arriving from somewhere that already knows which stage you want.
   *
   * Only the stage. The link used to filter to one requisition as well,
   * which scoped the tab counts to it — every other tab read 0 and the page
   * looked like the rest of the work had vanished. The counts are the point
   * of the bar, so nothing narrows them on arrival.
   */
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const stage = params.get('stage');
    if (!stage) return;
    if (ORDER.includes(stage as Col)) setActiveCol(stage as Col);
    // Consumed once, so a later tab click is not undone by a stale URL and
    // a refresh does not drag them back here.
    setParams({}, { replace: true });
  }, [params, setParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (!q) return true;
      return (
        r.candidate.name.toLowerCase().includes(q) ||
        r.requisition.code.toLowerCase().includes(q) ||
        r.requisition.designation.toLowerCase().includes(q)
      );
    });
  }, [data, search]);

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



  return (
    <div className="space-y-5">
      <PageHeader
        title="Assigned Candidates"
        description="Your first-interview pipeline, one stage at a time. Pick a stage above; each card carries the step it is waiting on."
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
          </div>

          {/* One stage at a time, behind tabs.
              Four columns side by side gave each card about sixteen rems —
              enough for a name and a date, so the schedule, the panel and the
              marks all had to be hidden behind a click, and on anything
              narrower than a desktop the board scrolled sideways. A stage is
              what somebody actually works through in one sitting, so it gets
              the whole width and the cards can say what they need to.
              Dragging goes with it; every step a drop performed is a button
              on the card and always was. */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <div
              role="tablist"
              aria-label="Interview stages"
              className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/70"
            >
              {COLUMNS.map((col, ti) => {
                const count = board.counts[col.key];
                const active = activeCol === col.key;
                const empty = count === 0;
                return (
                  <button
                    key={col.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveCol(col.key)}
                    style={{ animationDelay: `${ti * 50}ms` }}
                    className={cn(
                      'relative flex shrink-0 animate-card-in items-center gap-2 px-5 py-3.5 text-xs font-semibold',
                      'transition-all duration-200',
                      active
                        ? col.active
                        : empty
                          ? // A stage with nothing in it recedes rather than
                            // competing for attention with the ones that
                            // have work waiting.
                            'text-slate-400 hover:bg-white/60 hover:text-slate-600'
                          : 'text-slate-600 hover:bg-white/70 hover:text-slate-800',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full transition-transform duration-200',
                        col.dot,
                        empty && !active && 'opacity-40',
                        active && 'scale-125',
                      )}
                      aria-hidden
                    />
                    {col.title}
                    <span
                      className={cn(
                        'min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[0.625rem] font-bold tabular-nums transition-colors',
                        active
                          ? col.pill
                          : empty
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-slate-200/80 text-slate-600',
                      )}
                    >
                      {count}
                    </span>
                    {active && (
                      <span
                        className={cn(
                          'absolute inset-x-0 -bottom-px h-[3px] origin-left animate-underline-in rounded-t',
                          col.bar,
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <div>
              {/* Keyed on the stage so switching tabs replays the entrance
                  rather than swapping content in place — the movement is
                  what tells you the panel changed. */}
              <div key={activeCol}>
                {COLUMNS.filter((c) => c.key === activeCol).map((col) => {
                  const groups = board.groups[col.key];
                  const total = board.counts[col.key];
                  const hidden = board.hidden[col.key];
                  const isOpen = Boolean(expanded[col.key]);
                  return (
                    <section
                      key={col.key}
                      data-column={col.key}
                      role="tabpanel"
                      className="flex flex-col bg-slate-50/60"
                    >
                      {/* No stage title here — the tab above already says
                          which stage this is, and repeating it directly
                          underneath just costs a row. This header exists for
                          the show-all control and the vacancy count. */}
                      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
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

                      <div className="flex min-h-[20rem] flex-1 flex-col gap-5 p-4">
                        {groups.length === 0 ? (
                          <p className="px-2 py-12 text-center text-xs text-slate-400">
                            {col.empty}
                          </p>
                        ) : (
                          groups.map((group, gi) => (
                            /* One vacancy. The header is the separator between
                               them, so it is built to read as one — a tinted
                               band with a rail down the left, the code set as
                               a chip, and the post underneath. A hairline rule
                               and two shades of grey did not survive the cards
                               growing to full width. */
                            <div
                              key={group.id}
                              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card animate-card-in"
                              style={{ animationDelay: `${gi * 60}ms` }}
                            >
                              <div className="relative flex flex-wrap items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-brand-50/80 via-brand-50/40 to-white px-4 py-3">
                                <span
                                  className={cn(
                                    'absolute inset-y-0 left-0 w-1 origin-top animate-rail-draw',
                                    col.bar,
                                  )}
                                  aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-md bg-brand-600 px-2 py-0.5 font-mono text-[0.6875rem] font-bold tracking-tight text-white shadow-sm">
                                      {group.code}
                                    </span>
                                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[0.625rem] font-semibold text-slate-500 ring-1 ring-slate-200">
                                      {group.rows.length}{' '}
                                      {group.rows.length === 1
                                        ? 'candidate'
                                        : 'candidates'}
                                    </span>
                                  </div>
                                  <p
                                    className="mt-1 truncate text-[0.8125rem] font-semibold text-slate-800"
                                    title={`${group.designation} — ${group.department}, ${group.unit}`}
                                  >
                                    {group.designation}
                                    {group.department && (
                                      <>
                                        <span className="mx-1 font-normal text-slate-300">
                                          ·
                                        </span>
                                        <span className="font-normal text-slate-500">
                                          {group.department}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </div>
                                {col.key === 'to_schedule' &&
                                  group.rows.length > 1 && (
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
                                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-card-hover active:scale-95"
                                      title={`One session for all ${group.rows.length} candidates on ${group.code}`}
                                    >
                                      <CalendarDays className="h-3.5 w-3.5" />
                                      Schedule all {group.rows.length}
                                    </button>
                                  )}
                              </div>
                              <div className="space-y-2 p-3">
                                {group.rows.map((row, ri) => (
                                  <BoardCard
                                    key={row.id}
                                    row={row}
                                    index={ri}
                                    col={col.key}
                                    deciding={deciding === row.id}
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
                                    onEnterPackage={() => setPackageFor(row)}
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
      {/* Salary and benefits, as told to the interviewer. Its own form on
          purpose — factory HR recording what they heard, not Corporate HR
          setting pay. */}
      {packageFor && (
        <CandidatePackageModal
          open
          candidate={{
            id: packageFor.candidate.id,
            name: packageFor.candidate.name,
            presentSalary: packageFor.candidate.presentSalary,
            salaryExpectation: packageFor.candidate.salaryExpectation,
            salaryBenefitsNote: packageFor.candidate.salaryBenefitsNote,
          }}
          onClose={() => setPackageFor(null)}
        />
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
  index,
  col,
  deciding,
  onOpenDecision,
  onCloseDecision,
  onSchedule,
  onEnterMarks,
  onEnterPackage,
}: {
  row: DelegatedCandidate;
  /** Position in its group — drives the entrance stagger only. */
  index: number;
  col: Col;
  deciding: boolean;
  onOpenDecision: () => void;
  onCloseDecision: () => void;
  onSchedule: () => void;
  onEnterMarks: () => void;
  onEnterPackage: () => void;
}) {
  const outcome = useFirstInterviewOutcome();
  const [verdict, setVerdict] = useState<'final' | 'rejected' | null>(null);
  const [note, setNote] = useState('');

  const first = row.rounds.find((r) => r.kind === 'first');
  const soon = urgency(first?.scheduledAt ?? null);
  const age = waiting(row.createdAt);
  const venue = first ? venueOf(first) : null;
  const rejected = row.candidate.stage === 'rejected';
  // Both buttons say whether the thing behind them has been done yet, so the
  // row can be read without opening anything.
  // Every assigned test, not just one of them — the verdict waits on all.
  // A skipped test is not in `tests` at all, so it never holds this up.
  const unmarked = row.tests.filter((t) => t.obtained == null);
  const marksIn = row.tests.length > 0 && unmarked.length === 0;
  const packageIn =
    row.candidate.presentSalary != null ||
    row.candidate.salaryExpectation != null;

  return (
    <article
      data-card={row.id}
      style={{ animationDelay: `${index * 45}ms` }}
      className={cn(
        'animate-card-in rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm',
        // Lifts a hair on hover. Enough to say the row is live without the
        // list appearing to breathe as the pointer crosses it.
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover',
      )}
    >
      {/* Three zones across the row: who, what we know, and the step.
          The card was built for a 16rem column and stacked everything
          vertically; at full width that left two thirds of the row empty
          with a thin ribbon of text down the left. */}
      <div className="grid gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      <div>
      {/* Who — the vacancy is named once, on the group header above. */}
      <div className="flex items-center gap-2.5">
        <Avatar name={row.candidate.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight tracking-tight text-slate-900">
            {row.candidate.name}
          </p>
          {row.delegatedBy && col !== 'done' && (
            <p
              className="mt-0.5 flex items-center gap-1 truncate text-[0.6875rem] text-slate-400"
              title={`Sent to you by ${row.delegatedBy.name}`}
            >
              <CornerDownRight className="h-3 w-3 shrink-0" />
              from {row.delegatedBy.name}
            </p>
          )}
        </div>
      </div>

      {/* The number and address themselves. This board is worked at a desk,
          where a tel: link opens nothing — so the details are shown to be
          read, dialled by hand, or copied in one click. */}
      {col !== 'done' && (row.candidate.phone || row.candidate.email) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-0.5">
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
      </div>

      {/* What we know about them, in the room the width gives us. */}
      <div className="min-w-0 space-y-2">
      {col !== 'done' && row.note && (
        <p
          className="line-clamp-2 rounded-r-md border-l-2 border-brand-300 bg-brand-50/40 py-1 pl-2 pr-2 text-[0.6875rem] leading-4 text-slate-600"
          title={row.note}
        >
          {row.note}
        </p>
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

      </div>
      </div>

      {/* When, and what to do about it */}
      {!deciding && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3">
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

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5">
            {/* Labelled, not three bare glyphs in a box. A document, a
                checklist and a dollar sign all render at 14px as "some kind
                of form", and the only way to tell them apart was to hover
                each one and wait for a tooltip. */}
            {row.candidate.cvUrl && (
              <a
                href={resolveApiFileUrl(row.candidate.cvUrl)}
                target="_blank"
                rel="noreferrer"
                draggable={false}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.6875rem] font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-600 hover:shadow-sm"
              >
                <FileText className="h-3.5 w-3.5" />
                CV
              </a>
            )}
            <button
              type="button"
              onClick={onEnterMarks}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.6875rem] font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm',
                marksIn
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600',
              )}
            >
              <ListChecks className="h-3.5 w-3.5" />
              {marksIn ? 'Marks in' : 'Test marks'}
            </button>
            {/* Present salary, expectation and current benefits — asked in
                the room, and its own small form rather than a corner of
                Salary Fixation, which is Corporate HR's screen and sets
                the actual figure. */}
            <button
              type="button"
              onClick={onEnterPackage}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.6875rem] font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm',
                packageIn
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600',
              )}
            >
              <BadgeDollarSign className="h-3.5 w-3.5" />
              {packageIn ? 'Salary noted' : 'Salary'}
            </button>

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
          {unmarked.length > 0 ? (
            // Marks first. Whatever was assigned is either marked or skipped
            // before anyone decides — the server refuses otherwise.
            <>
              <p className="flex items-start gap-1.5 text-[0.6875rem] font-medium text-amber-800">
                <ListChecks className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  Enter the {unmarked.map((t) => t.label).join(', ')} mark
                  {unmarked.length === 1 ? '' : 's'} first — or skip{' '}
                  {unmarked.length === 1 ? 'that test' : 'those tests'} if{' '}
                  {row.candidate.name.split(' ')[0]} didn&apos;t sit{' '}
                  {unmarked.length === 1 ? 'it' : 'them'}.
                </span>
              </p>
              <div className="mt-2 flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-xs"
                  onClick={onCloseDecision}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 flex-1 px-2.5 text-xs"
                  onClick={onEnterMarks}
                >
                  <ListChecks className="mr-1 h-3.5 w-3.5" /> Enter test marks
                </Button>
              </div>
            </>
          ) : !verdict ? (
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
