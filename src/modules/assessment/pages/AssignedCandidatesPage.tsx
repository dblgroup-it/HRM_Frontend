import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Ban,
  Briefcase,
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
  Quote,
  Search,
  Trophy,
  Users,
  UserX,
  Video,
  BadgeDollarSign,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  Avatar,
  Button,
  EmptyState,
  ErrorCard,
  LifecycleTabs,
  PageHeader,
  Skeleton,
  Textarea,
} from '@shared/components/ui';
import type { LifecycleTab } from '@shared/components/ui';
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
import { CandidatePackageModal } from '../components/CandidatePackageModal';
import type {
  DelegatedCandidate,
  DelegatedTest,
} from '../types/assessment.types';
import { isFirstInterviewDone } from '../components/firstInterviewStage';
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
 * Each stage carries its own colour, used on the rail down the left of every
 * vacancy inside it.
 *
 * Not decoration: it is what says at a glance where the work has piled up.
 * Amber waits on you, sky is in hand, violet wants a decision, emerald is
 * finished. The tab bar itself is the app's shared one and stays brand-blue
 * — one tab language across the product beats four colours in this corner
 * of it.
 */
const COLUMNS: {
  key: Col;
  title: string;
  empty: string;
  /** Shown on the tab bar — see LifecycleTabs. */
  icon: LucideIcon;
  /** The rail down the left of each vacancy in this stage. */
  bar: string;
}[] = [
  {
    key: 'to_schedule',
    icon: CalendarDays,
    title: 'To schedule',
    empty: 'Nothing waiting on a date',
    bar: 'bg-amber-500',
  },
  {
    key: 'scheduled',
    icon: Clock,
    title: 'Scheduled',
    empty: 'No sessions arranged',
    bar: 'bg-sky-500',
  },
  {
    key: 'decision_due',
    icon: ListChecks,
    title: 'Decision due',
    empty: 'No verdicts pending',
    bar: 'bg-violet-500',
  },
  {
    key: 'done',
    icon: Check,
    title: 'Done',
    empty: 'Nothing decided yet',
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


type Round = DelegatedCandidate['rounds'][number];

/**
 * The first round that stands, and — when there is none — the no-show that
 * sent the candidate back for a new date.
 *
 * Rounds arrive oldest first, so a session rebooked after an absence is the
 * last live one. A cancelled or absent round never counts as arranged: the
 * candidate needs a date again, which is what "To schedule" means.
 */
function firstRoundOf(row: DelegatedCandidate): {
  current: Round | null;
  noShow: Round | null;
} {
  const firsts = row.rounds.filter((r) => r.kind === 'first');
  const live = firsts.filter(
    (r) => r.status !== 'cancelled' && r.status !== 'absent',
  );
  const current = live[live.length - 1] ?? null;
  const noShow = current
    ? null
    : ([...firsts].reverse().find((r) => r.status === 'absent') ?? null);
  return { current, noShow };
}

function columnOf(row: DelegatedCandidate): Col {
  // Anything past the interview stage is finished as far as the first
  // interview goes — including candidates who have since been hired. See
  // `isFirstInterviewDone`.
  if (isFirstInterviewDone(row.candidate.stage)) return 'done';
  const { current } = firstRoundOf(row);
  if (!current) return 'to_schedule';
  return current.status === 'completed' ? 'decision_due' : 'scheduled';
}

/** One vacancy's candidates inside a stage. */
interface Group {
  id: string;
  code: string;
  designation: string;
  department: string;
  unit: string;
  rows: DelegatedCandidate[];
  /**
   * The handover note, when every candidate here was sent with the same one.
   *
   * A recruiter delegating four people writes the note once and it is copied
   * onto each delegation — so the board printed "Check everyone" four times,
   * on four cards, in one column. It is one instruction about one batch, so
   * it belongs once, above them. Null when the notes differ, and then each
   * card keeps its own.
   */
  sharedNote: string | null;
  sharedNoteFrom: string | null;
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
      sharedNote: null,
      sharedNoteFrom: null,
    };
    g.rows.push(row);
    groups.set(row.requisition.id, g);
  });

  for (const g of groups.values()) {
    const notes = g.rows.map((r) => (r.note ?? '').trim());
    const [first] = notes;
    // Only when they genuinely all say the same thing, and there is more than
    // one of them — a single candidate's note is not "shared", it is theirs.
    if (first && g.rows.length > 1 && notes.every((n) => n === first)) {
      g.sharedNote = first;
      g.sharedNoteFrom = g.rows[0].delegatedBy?.name ?? null;
    }
  }
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
function venueOf(round: Round) {
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
      const at = firstRoundOf(a).current?.scheduledAt ?? '';
      const zt = firstRoundOf(z).current?.scheduledAt ?? '';
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

  /**
   * The stage bar.
   *
   * A count of zero is left off rather than shown as "0": `LifecycleTabs`
   * hides a zero badge, and a stage with nothing in it should recede instead
   * of competing with the ones that have work waiting.
   */
  const stageTabs: LifecycleTab<Col>[] = COLUMNS.map((col) => ({
    key: col.key,
    label: col.title,
    icon: col.icon,
    count: board.counts[col.key],
  }));

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
          {/* One stage at a time, behind the app's own tab bar.
              Four columns side by side gave each card about sixteen rems —
              enough for a name and a date, so the schedule, the panel and the
              marks all had to be hidden behind a click, and on anything
              narrower than a desktop the board scrolled sideways. A stage is
              what somebody actually works through in one sitting, so it gets
              the whole width and the cards can say what they need to.

              The bar is `LifecycleTabs`, the same glass bar the requisition
              lifecycle and Access Control use: a stage here should read as a
              stage there, not as a fourth kind of control with its own
              colours. The colour each stage carries lives on its cards and
              its vacancy rail, where it means "this is the work", rather
              than on the tab. */}
          <LifecycleTabs
            tabs={stageTabs}
            active={activeCol}
            onChange={(key) => setActiveCol(key)}
          />

          {/* Under the tabs and on the same centre line as them.
              It sat above, left-aligned, where it read as a page control —
              but it narrows the stage you are looking at, so it belongs
              below the thing that chooses the stage. Its own rounded card,
              so it reads as part of the bar above rather than as the first
              row of the results below. */}
          <div className="mx-auto w-full max-w-xs">
            <label className="group/find flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3.5 py-2 shadow-sm transition-all duration-200 focus-within:border-brand-300 focus-within:shadow-md focus-within:ring-2 focus-within:ring-brand-500/10">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-focus-within/find:text-brand-500" />
              <input
                type="search"
                placeholder="Find a candidate…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          {/* Keyed on the stage so switching tabs replays the entrance
              rather than swapping content in place — the movement is what
              tells you the panel changed.

              No frame around the panel: the tab bar already says where you
              are, and a card inside a card inside a card is what made this
              page read as scaffolding rather than as work. The vacancies are
              sections on the page, separated by their own headings. */}
          <div key={activeCol} className="space-y-7">
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
                  className="space-y-7"
                >
                  {groups.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-16 text-center">
                      <col.icon className="mx-auto h-6 w-6 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-400">{col.empty}</p>
                    </div>
                  ) : (
                    groups.map((group, gi) => (
                      /* One vacancy: a heading and its people, not a box.
                         The designation is the title — it is what the
                         interviewer is hiring for — with the code and the
                         department as quiet meta beside it, and a hairline
                         to close the heading off. */
                      <div
                        key={group.id}
                        className="animate-card-in space-y-2"
                        style={{ animationDelay: `${gi * 60}ms` }}
                      >
                        <header className="mb-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            {/* The code as a mark, not as a line of text.
                                It is how everyone refers to a vacancy out
                                loud, so it is set like a label you could
                                read across a desk. */}
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 font-mono text-xs font-bold tracking-tight text-brand-700 ring-1 ring-brand-200">
                              <Briefcase className="h-3.5 w-3.5 text-brand-500" />
                              {group.code}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3
                                className="truncate text-base font-semibold leading-tight tracking-tight text-slate-900"
                                title={`${group.designation} — ${group.department}, ${group.unit}`}
                              >
                                {group.designation}
                              </h3>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-400">
                                <span className="truncate">
                                  {group.department || group.unit}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="tabular-nums">
                                  {group.rows.length}{' '}
                                  {group.rows.length === 1
                                    ? 'candidate'
                                    : 'candidates'}
                                </span>
                              </p>
                            </div>
                            {col.key === 'to_schedule' &&
                              group.rows.length > 1 && (
                                /* One session for the whole shortlist — the
                                   afternoon's work in a single click, so it
                                   is given the weight of an offer rather
                                   than of another outline button. */
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
                                  className="group/all relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-brand-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:animate-gradient-pan hover:bg-[length:200%_100%] hover:shadow-lg hover:shadow-brand-600/30 active:translate-y-0 active:scale-[0.98]"
                                  title={`One session for all ${group.rows.length} candidates on ${group.code}`}
                                >
                                  <span
                                    aria-hidden
                                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/all:translate-x-full"
                                  />
                                  <CalendarDays className="relative h-4 w-4" />
                                  <span className="relative">
                                    Schedule all {group.rows.length}
                                  </span>
                                </button>
                              )}
                          </div>

                          {/* One instruction about one batch, said once. */}
                          {group.sharedNote && col.key !== 'done' && (
                            <figure className="mt-2.5 flex items-start gap-2 rounded-xl bg-brand-50/60 px-3 py-2 ring-1 ring-brand-100/80">
                              <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
                              <div className="min-w-0">
                                <blockquote className="text-xs italic leading-5 text-slate-700">
                                  {group.sharedNote}
                                </blockquote>
                                {group.sharedNoteFrom && (
                                  <figcaption className="mt-0.5 text-[0.625rem] text-slate-400">
                                    — {group.sharedNoteFrom}, to all{' '}
                                    {group.rows.length}
                                  </figcaption>
                                )}
                              </div>
                            </figure>
                          )}

                          <span
                            aria-hidden
                            className="mt-2.5 block h-px w-full bg-gradient-to-r from-slate-200 via-slate-200 to-transparent"
                          />
                        </header>

                        {/* A grid, not a list. Each candidate is a card you
                            look at and act on, and three of them side by
                            side show a vacancy's shortlist at a glance where
                            a stack of full-width rows showed one and a half.
                            Cards are equal height (`items-stretch` + the
                            action row's `mt-auto`), so the grid reads as a
                            grid. */}
                        <div className="grid items-stretch gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                          {group.rows.map((row, ri) => (
                            <BoardCard
                              key={row.id}
                              row={row}
                              index={ri}
                              col={col.key}
                              // Said once in the header above; repeating it
                              // on each card is what it looked like before.
                              hideNote={Boolean(group.sharedNote)}
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
                  {/* Only a stage's first cards are rendered; the rest are
                      one click away rather than a page nobody scrolls. */}
                  {(hidden > 0 || isOpen) && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((e) => ({ ...e, [col.key]: !e[col.key] }))
                      }
                      className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-[0.6875rem] font-semibold text-slate-500 transition-colors hover:border-brand-300 hover:bg-white hover:text-brand-600"
                    >
                      {isOpen
                        ? `Show fewer — first ${COLUMN_LIMIT} only`
                        : `Show all ${total} · ${hidden} more`}
                    </button>
                  )}
                </section>
              );
            })}
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
            salaryBenefits: packageFor.candidate.salaryBenefits,
            transportPickup: packageFor.candidate.transportPickup,
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
 * A contact detail, on its own line, copied on click.
 *
 * Not a mailto:/tel: link — those assume a phone, and this board is worked at
 * a desk. The value itself is the point: it is shown in full to be read or
 * dialled by hand, and one click puts it on the clipboard for whatever the
 * interviewer actually has open.
 *
 * A row rather than a chip. Chips wrapped at whatever width their contents
 * happened to need, so two cards side by side broke onto different numbers of
 * lines and nothing below them lined up — a grid of them read as untidy for a
 * reason that had nothing to do with the cards themselves.
 */
function CopyRow({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
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
      className="group/copy -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-2 rounded-md px-1 py-1 text-left text-[0.6875rem] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
    >
      <Icon
        className={cn(
          'h-3.5 w-3.5 shrink-0 transition-colors',
          copied ? 'text-emerald-500' : 'text-slate-400',
        )}
      />
      <span className="min-w-0 flex-1 truncate tabular-nums">{value}</span>
      {/* The affordance appears on hover and is replaced by its own
          confirmation — no toast for something this small. */}
      {copied ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-[0.625rem] font-semibold text-emerald-600">
          <Check className="h-3 w-3" />
          Copied
        </span>
      ) : (
        <Copy className="h-3 w-3 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover/copy:opacity-100" />
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
  hideNote,
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
  /**
   * The handover note is already shown above this card, because every
   * candidate in the group was sent with the same one.
   */
  hideNote: boolean;
  deciding: boolean;
  onOpenDecision: () => void;
  onCloseDecision: () => void;
  onSchedule: () => void;
  onEnterMarks: () => void;
  onEnterPackage: () => void;
}) {
  const outcome = useFirstInterviewOutcome();
  // Silent: the card says "marked absent" itself, with an undo.
  const updateRound = useUpdateInterview(row.candidate.id, true);
  const [verdict, setVerdict] = useState<'final' | 'rejected' | null>(null);
  const [note, setNote] = useState('');

  const { current: first, noShow } = firstRoundOf(row);
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
    row.candidate.salaryExpectation != null ||
    row.candidate.salaryBenefits.length > 0;

  const firstName = row.candidate.name.split(' ')[0];

  /**
   * One click, because the interviewer is standing in an empty room — and an
   * undo on the toast, because the card leaves this tab the moment it lands.
   */
  const markAbsent = (round: Round) =>
    updateRound.mutate(
      { roundId: round.id, status: 'absent' },
      {
        onSuccess: () =>
          toast.success(`${firstName} marked absent`, {
            description: 'Back under To schedule — re-arrange or reject from there.',
            action: {
              label: 'Undo',
              onClick: () =>
                updateRound.mutate({ roundId: round.id, status: 'scheduled' }),
            },
          }),
      },
    );

  /** Straight to the rejection, with the reason already written. */
  const rejectNoShow = (round: Round) => {
    setVerdict('rejected');
    setNote(
      `Did not attend the first interview${
        round.scheduledAt ? ` on ${formatDate(round.scheduledAt)}` : ''
      }.`,
    );
    onOpenDecision();
  };

  /**
   * The one thing this card is waiting on, as a chip.
   *
   * It used to be four separate conditionals strung along the footer, below
   * the contact details and beside the buttons — so the fact a candidate had
   * been waiting eleven days for a date, or had not turned up, was the last
   * thing on the card you read. It is the first thing that matters, so it
   * now sits at the top right where the eye lands, and the footer is left to
   * the actions alone.
   */
  const state: { tone: string; icon: LucideIcon; text: string; title?: string } =
    col === 'done'
      ? rejected
        ? { tone: 'bg-rose-50 text-rose-700 ring-rose-200', icon: Ban, text: 'Not taken forward' }
        : { tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: Trophy, text: 'Finalist' }
      : col === 'to_schedule' && noShow
        ? {
            tone: 'bg-rose-50 text-rose-700 ring-rose-200',
            icon: UserX,
            text: `Absent${noShow.scheduledAt ? ` · ${formatDate(noShow.scheduledAt)}` : ''}`,
            title: 'Did not turn up to the first interview',
          }
        : col === 'to_schedule'
          ? {
              tone:
                age.tone === 'late'
                  ? 'bg-rose-50 text-rose-700 ring-rose-200'
                  : age.tone === 'ageing'
                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                    : 'bg-slate-50 text-slate-500 ring-slate-200',
              icon: Clock,
              text: `Assigned ${age.text}`,
              title:
                age.tone === 'fresh' ? undefined : 'Waiting a long time for a date',
            }
          : first
            ? {
                tone:
                  soon === 'overdue'
                    ? 'bg-rose-50 text-rose-700 ring-rose-200'
                    : soon
                      ? 'bg-amber-50 text-amber-700 ring-amber-200'
                      : 'bg-sky-50 text-sky-700 ring-sky-200',
                icon: Clock,
                text: `${first.scheduledAt ? formatDate(first.scheduledAt) : 'Time TBD'}${soon ? ` · ${soon}` : ''}`,
              }
            : { tone: 'bg-slate-50 text-slate-500 ring-slate-200', icon: Clock, text: 'No date yet' };
  const StateIcon = state.icon;

  /** The stage's colour, used for the accent bar and the avatar ring. */
  /**
   * The stage, as a tint on the card's own border.
   *
   * It was a coloured bar across the top, which read as a banner stuck onto
   * the card rather than as part of it. A border says the same thing without
   * adding a band: the whole edge carries it, quietly.
   */
  const edge =
    col === 'to_schedule'
      ? age.tone === 'late'
        ? 'border-rose-200 hover:border-rose-300'
        : 'border-amber-200 hover:border-amber-300'
      : col === 'scheduled'
        ? 'border-sky-200 hover:border-sky-300'
        : col === 'decision_due'
          ? 'border-violet-200 hover:border-violet-300'
          : rejected
            ? 'border-rose-100 hover:border-rose-200'
            : 'border-emerald-200 hover:border-emerald-300';
  /** Urgent enough that the pill's icon should move. */
  const pressing =
    (col === 'to_schedule' && age.tone === 'late') || soon === 'overdue';

  return (
    <article
      data-card={row.id}
      style={{ animationDelay: `${index * 45}ms` }}
      className={cn(
        'group animate-card-in relative flex flex-col overflow-hidden rounded-2xl border bg-white',
        edge,
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.18)]',
        'transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1',
        'hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_20px_44px_-20px_rgba(15,23,42,0.3)]',
      )}
    >
      {/* ── Head: who, and what it is waiting on ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-50/80 to-white px-4 pb-3 pt-3.5">
        {/* A sheen that crosses the header once on hover. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full"
        />
        <div className="relative flex items-start gap-3">
          <span className="relative shrink-0">
            <Avatar name={row.candidate.name} size="lg" />
            <span
              aria-hidden
              className="absolute -inset-0.5 rounded-full ring-2 ring-slate-200/70 transition-colors duration-300 group-hover:ring-brand-300/70"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-slate-900">
              {row.candidate.name}
            </p>
            {row.delegatedBy && col !== 'done' && (
              <p
                className="mt-0.5 flex min-w-0 items-center gap-1 text-[0.6875rem] leading-4 text-slate-400"
                title={`Sent to you by ${row.delegatedBy.name}`}
              >
                <CornerDownRight className="h-3 w-3 shrink-0" />
                <span className="truncate">{row.delegatedBy.name}</span>
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                title={state.title}
                className={cn(
                  'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ring-1',
                  state.tone,
                )}
              >
                <StateIcon
                  className={cn(
                    'h-3 w-3 shrink-0',
                    // Only what is actually late moves. A card that always
                    // pulses is a card nobody looks at twice.
                    pressing && 'animate-pulse',
                  )}
                />
                <span className="truncate">{state.text}</span>
              </span>
              {row.alsoAssignedTo.length > 0 && col !== 'done' && (
                <span
                  title={`Also assigned to ${row.alsoAssignedTo.join(', ')}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[0.625rem] font-semibold text-amber-700 ring-1 ring-amber-200"
                >
                  <Users className="h-3 w-3" />+{row.alsoAssignedTo.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: what is known about them ──
          One fact per line, not a wrapping row of chips. Chips wrapped at
          whatever width their contents happened to need, so two cards side
          by side broke onto different numbers of lines and nothing below
          them lined up — which is most of why a grid of these read as
          untidy. A list cannot do that. */}
      {col !== 'done' &&
        (row.candidate.phone ||
          row.candidate.email ||
          row.tests.length > 0 ||
          venue) && (
          <div className="flex flex-col gap-px border-t border-slate-100 px-4 py-2.5">
            {row.candidate.phone && (
              <CopyRow
                icon={Phone}
                value={row.candidate.phone}
                label="phone number"
              />
            )}
            {row.candidate.email && (
              <CopyRow
                icon={Mail}
                value={row.candidate.email}
                label="email address"
              />
            )}
            {row.tests.length > 0 &&
              (row.tests.some((t) => t.obtained != null) ? (
                <div className="flex flex-wrap items-center gap-1 py-1">
                  {row.tests.map((t) => (
                    <TestChip key={t.key} test={t} />
                  ))}
                </div>
              ) : (
                <p
                  title={`Not marked yet: ${row.tests.map((t) => t.label).join(', ')}`}
                  className="flex items-center gap-2 py-1 text-[0.6875rem] font-medium text-amber-600"
                >
                  <ListChecks className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  {row.tests.length} test
                  {row.tests.length === 1 ? '' : 's'} still to mark
                </p>
              ))}
            {venue && (col === 'scheduled' || col === 'decision_due') && (
              <p
                title={venue.text}
                className="flex min-w-0 items-center gap-2 py-1 text-[0.6875rem] text-slate-500"
              >
                <venue.icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{venue.text}</span>
                {first && first.panelists > 0 && (
                  <span className="shrink-0 text-slate-400">
                    · {first.panelists} on panel
                  </span>
                )}
              </p>
            )}
          </div>
        )}

      {/* The recruiter writing to this interviewer — set as a quotation,
          which is what it is, rather than as a slab of tinted background
          competing with the candidate's own details. */}
      {col !== 'done' && row.note && !hideNote && (
        <figure className="mx-4 mb-1 mt-1 border-l-2 border-brand-300 pl-2.5">
          <blockquote
            className="line-clamp-2 text-[0.6875rem] italic leading-4 text-slate-600"
            title={row.note}
          >
            {row.note}
          </blockquote>
          {row.delegatedBy && (
            <figcaption className="mt-0.5 text-[0.625rem] text-slate-400">
              — {row.delegatedBy.name}
            </figcaption>
          )}
        </figure>
      )}

        {/* The step. Pinned to the foot of the card with `mt-auto`, so the
            buttons sit on the same line across a row of cards however much
            detail is above them — a ragged bottom edge is most of what made
            a grid of cards look thrown together. Secondary actions are
            quiet; the one the stage is waiting for is the only solid one. */}
      {!deciding && (
        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-3">
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
          {/* What the candidate is on now and what comes with it — the
              lunch, the pick-and-drop, the accommodation — asked in the
              room. Called Facilities, not Salary: an interviewer opening
              "Salary" reasonably expects to set one, and this form
              deliberately cannot. The figure is Corporate HR's, on the
              Salary Fixation screen. */}
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
            {packageIn ? 'Facilities noted' : 'Facilities'}
          </button>

          {/* The step itself. Solid where the board is waiting on you,
              outlined where the work is already in hand. */}
          {/* A no-show is either given another date or let go; both are
              offered, since neither is the obvious default. */}
          {col === 'to_schedule' && noShow && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-rose-200 px-2.5 text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50"
              onClick={() => rejectNoShow(noShow)}
            >
              <Ban className="mr-1 h-3.5 w-3.5" /> Reject
            </Button>
          )}
          {col === 'to_schedule' && (
            <Button
              size="sm"
              className="group/act ml-auto h-7 px-3 text-xs"
              onClick={onSchedule}
            >
              <CalendarDays className="mr-1 h-3.5 w-3.5 transition-transform duration-200 group-hover/act:-translate-y-px" />
              {noShow ? 'Re-arrange' : 'Arrange'}
            </Button>
          )}
          {col === 'scheduled' && first?.status === 'scheduled' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-rose-200 px-2.5 text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50"
              isLoading={updateRound.isPending}
              onClick={() => markAbsent(first)}
              title={`${firstName} did not turn up`}
            >
              <UserX className="mr-1 h-3.5 w-3.5" /> Absent
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
              className="group/act ml-auto h-7 px-3 text-xs"
              onClick={onOpenDecision}
            >
              <Check className="mr-1 h-3.5 w-3.5 transition-transform duration-200 group-hover/act:scale-110" />
              Decide
            </Button>
          )}
        </div>
      )}

      {rejected && (row.candidate.rejectionReason || row.candidate.rejectedByName) && (
        <div className="mx-4 mb-4 border-l-2 border-rose-200 pl-2">
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

      {/* The verdict, asked for on the card itself */}
      {deciding && (
        <div className="mx-4 mb-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
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
                  // A no-show came straight here from Reject; "back" to a
                  // yes/no about the final stage would offer to advance
                  // someone nobody interviewed.
                  onClick={() => (noShow ? onCloseDecision() : setVerdict(null))}
                >
                  {noShow ? 'Cancel' : 'Back'}
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
