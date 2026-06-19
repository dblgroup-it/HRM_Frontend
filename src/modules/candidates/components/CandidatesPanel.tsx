import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Copy,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  Link2,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  BusyOverlay,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import type { Requisition } from '@modules/requisition/types/requisition.types';
import {
  BulkInterviewModal,
  CandidateExamsModal,
  CandidateInterviewsModal,
} from '@modules/assessment';

import {
  useCandidates,
  useCompareFinalists,
  useRecruitmentWorkspace,
  useScreenAll,
  useSetupWorkspace,
  useSyncDrive,
} from '../hooks/useCandidates';
import type {
  Candidate,
  CandidateStage,
  FinalistComparison,
} from '../types/candidate.types';
import { CandidateRow } from './CandidateRow';
import { AddCandidateModal } from './AddCandidateModal';
import { EmailCandidateModal } from './EmailCandidateModal';

type Tab = 'all' | CandidateStage;

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'applied', label: 'Applied' },
  { key: 'ai_shortlisted', label: 'AI Shortlisted' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'final', label: 'Final' },
  { key: 'selected', label: 'Selected' },
  { key: 'rejected', label: 'Rejected' },
];

/** Compact pipeline funnel shown above the list. */
const FUNNEL: { key: CandidateStage; label: string; tone: string }[] = [
  { key: 'applied', label: 'Applied', tone: 'bg-slate-400' },
  { key: 'ai_shortlisted', label: 'AI Shortlisted', tone: 'bg-violet-500' },
  { key: 'shortlisted', label: 'Shortlisted', tone: 'bg-sky-500' },
  { key: 'interview', label: 'Interview', tone: 'bg-amber-500' },
  { key: 'final', label: 'Final', tone: 'bg-indigo-500' },
  { key: 'selected', label: 'Selected', tone: 'bg-emerald-500' },
];

export function CandidatesPanel({
  requisition,
  canManage,
  onGoToAssessment,
}: {
  requisition: Requisition;
  canManage: boolean;
  onGoToAssessment?: () => void;
}) {
  const reqId = requisition.id;
  const { data: workspace } = useRecruitmentWorkspace(reqId);
  const { data: candidates = [], isLoading } = useCandidates(reqId);
  const setup = useSetupWorkspace(reqId);
  const sync = useSyncDrive(reqId);
  const screenAll = useScreenAll(reqId);
  const compare = useCompareFinalists(reqId);
  const aiOn = workspace?.aiScreening ?? false;
  const [comparison, setComparison] = useState<FinalistComparison | null>(null);
  const finalistCount = candidates.filter(
    (c) => c.stage === 'interview' || c.stage === 'final',
  ).length;

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'match' | 'name'>('recent');
  const [addOpen, setAddOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Candidate | null>(null);
  const [interviewTarget, setInterviewTarget] = useState<Candidate | null>(null);
  const [examTarget, setExamTarget] = useState<Candidate | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const drive = workspace?.drive ?? requisition.drive ?? null;
  const driveConnected = workspace?.connected ?? true;
  const applyLink = `${window.location.origin}/apply/${reqId}`;

  // Auto-import CVs dropped straight into Drive once the workspace is known.
  const hasDrive = Boolean(drive);
  const syncMutate = sync.mutate;
  useEffect(() => {
    if (hasDrive) syncMutate();
  }, [hasDrive, reqId, syncMutate]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: candidates.length };
    for (const cand of candidates) c[cand.stage] = (c[cand.stage] ?? 0) + 1;
    return c;
  }, [candidates]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = candidates.filter((c) => {
      if (tab !== 'all' && c.stage !== tab) return false;
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term)
      );
    });
    if (sort === 'match') {
      // Highest AI match first; unscored candidates sink to the bottom.
      return [...filtered].sort(
        (a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1),
      );
    }
    if (sort === 'name') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered; // 'recent' — API already returns newest first
  }, [candidates, tab, search, sort]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-600" />
          Candidate Pipeline
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {candidates.length}
          </span>
        </CardTitle>
        {canManage && drive && (
          <div className="flex items-center gap-2">
            {aiOn && finalistCount >= 2 && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Scale className="h-4 w-4 text-indigo-600" />}
                onClick={() =>
                  compare.mutate(undefined, {
                    onSuccess: setComparison,
                  })
                }
                disabled={compare.isPending}
                title="AI side-by-side comparison of interview/final candidates"
              >
                {compare.isPending ? 'Comparing…' : 'AI Compare'}
              </Button>
            )}
            {aiOn && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={
                  <Sparkles
                    className={cn(
                      'h-4 w-4 text-violet-600',
                      screenAll.isPending && 'animate-pulse',
                    )}
                  />
                }
                onClick={() => screenAll.mutate()}
                disabled={screenAll.isPending}
                title="AI-screen new applied CVs against this role"
              >
                {screenAll.isPending ? 'Screening…' : 'AI Screen'}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              leftIcon={
                <RefreshCw
                  className={cn('h-4 w-4', sync.isPending && 'animate-spin')}
                />
              }
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
            >
              Sync
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setAddOpen(true)}
            >
              Add candidate
            </Button>
          </div>
        )}
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Workspace / share links */}
        {!drive ? (
          !driveConnected ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Google Drive isn&rsquo;t connected yet. An admin needs to finish the
              Drive setup before CVs can be collected.
            </p>
          ) : canManage ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Create this requisition&rsquo;s Drive recruitment folders to start
                collecting CVs.
              </p>
              <Button
                size="sm"
                leftIcon={<FolderPlus className="h-4 w-4" />}
                isLoading={setup.isPending}
                onClick={() => setup.mutate()}
              >
                Set up recruitment folders
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              The recruitment workspace hasn&rsquo;t been set up yet.
            </p>
          )
        ) : (
          <div className="overflow-hidden rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50/70 to-white p-4">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Link2 className="h-4 w-4 text-brand-600" />
              <p className="text-sm font-semibold text-slate-800">Collect CVs</p>
              {aiOn && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                  <Sparkles className="h-3 w-3" /> AI auto-screens new CVs
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Share this link in job ads. Candidates apply on a branded form — no
              Google account needed, and they can&rsquo;t see or delete anyone
              else&rsquo;s CV.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-xs text-slate-600">
                {applyLink}
              </code>
              <button
                type="button"
                onClick={() => copy(applyLink, 'Application link')}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                title="Copy link"
              >
                <Copy className="h-4 w-4" />
              </button>
              <a
                href={applyLink}
                target="_blank"
                rel="noreferrer"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                title="Open application page"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure &amp; private to
                recruitment
              </span>
              <a
                href={drive.rootFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-brand-600"
              >
                <FolderOpen className="h-3.5 w-3.5" /> Open Drive (HR only)
              </a>
            </div>
          </div>
        )}

        {/* Pipeline funnel */}
        {drive && candidates.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex flex-wrap items-stretch gap-1.5">
              {FUNNEL.map((s) => {
                const n = counts[s.key] ?? 0;
                const pct = candidates.length
                  ? Math.round((n / candidates.length) * 100)
                  : 0;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setTab(s.key)}
                    style={{ flexGrow: Math.max(1, n) }}
                    className={cn(
                      'group min-w-[88px] rounded-lg px-3 py-2 text-left transition',
                      tab === s.key
                        ? 'bg-white shadow-sm ring-1 ring-brand-200'
                        : 'hover:bg-white/70',
                    )}
                    title={`${n} in ${s.label}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', s.tone)} />
                      <span className="text-lg font-semibold leading-none text-slate-800">
                        {n}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
                      {s.label}
                    </p>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn('h-full rounded-full', s.tone)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* AI finalist comparison */}
        {comparison && (
          <ComparisonPanel
            comparison={comparison}
            onClose={() => setComparison(null)}
          />
        )}

        {/* Tabs + search */}
        {drive && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition',
                      tab === t.key
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        'ml-1.5 rounded-full px-1.5 text-[10px]',
                        tab === t.key
                          ? 'bg-white/20'
                          : 'bg-white text-slate-500',
                      )}
                    >
                      {counts[t.key] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) =>
                    setSort(e.target.value as 'recent' | 'match' | 'name')
                  }
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:ring-2 focus:ring-brand-500/30"
                  title="Sort candidates"
                >
                  <option value="recent">Newest</option>
                  <option value="match">Best AI match</option>
                  <option value="name">Name (A–Z)</option>
                </select>
                <div className="w-full sm:w-52">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search candidates…"
                    leftIcon={<Search className="h-4 w-4" />}
                  />
                </div>
              </div>
            </div>

            {/* Bulk action bar — appears when ≥1 candidate selected */}
            {canManage && selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
                <span className="text-sm font-medium text-brand-700">
                  {selectedIds.size} candidate{selectedIds.size === 1 ? '' : 's'} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    leftIcon={<CalendarClock className="h-3.5 w-3.5" />}
                    onClick={() => setBulkOpen(true)}
                  >
                    Schedule Interview Day
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : visible.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-400">
                  {candidates.length === 0
                    ? 'No candidates yet. Share the application link above, or add one manually.'
                    : 'No candidates match this filter.'}
                </p>
              ) : (
                <>
                  {/* Select-all header */}
                  {canManage && (() => {
                    const allSel = visible.length > 0 && visible.every((c) => selectedIds.has(c.id));
                    const someSel = visible.some((c) => selectedIds.has(c.id));

                    const STAGE_CHIPS: { stage: CandidateStage; label: string; cls: string }[] = [
                      { stage: 'ai_shortlisted', label: 'AI Shortlisted', cls: 'bg-violet-100 text-violet-700 hover:bg-violet-200 ring-violet-200' },
                      { stage: 'shortlisted',    label: 'Shortlisted',    cls: 'bg-sky-100 text-sky-700 hover:bg-sky-200 ring-sky-200' },
                      { stage: 'interview',      label: 'Interview',      cls: 'bg-amber-100 text-amber-700 hover:bg-amber-200 ring-amber-200' },
                    ];

                    return (
                      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (allSel) visible.forEach((c) => next.delete(c.id));
                              else visible.forEach((c) => next.add(c.id));
                              return next;
                            })
                          }
                          title={allSel ? 'Deselect all' : 'Select all'}
                          className={cn(
                            'relative h-[18px] w-[18px] shrink-0 rounded-[4px] border-2 transition-all duration-200',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                            allSel || someSel
                              ? 'border-brand-600 scale-100'
                              : 'border-slate-300 bg-white hover:border-brand-400 hover:scale-105',
                          )}
                          style={allSel || someSel ? {
                            background: 'linear-gradient(135deg, #1877c0 0%, #1055a0 100%)',
                            boxShadow: '0 1px 4px rgba(24,119,192,0.30)',
                          } : undefined}
                        >
                          <svg viewBox="0 0 10 8" className="absolute inset-0 m-auto h-[10px] w-[10px]" fill="none">
                            {someSel && !allSel ? (
                              <line x1="1" y1="4" x2="9" y2="4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            ) : (
                              <polyline
                                points="1,4 3.5,6.5 9,1"
                                stroke="white"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray="14"
                                style={{
                                  strokeDashoffset: allSel ? 0 : 14,
                                  transition: 'stroke-dashoffset 0.22s cubic-bezier(0.65,0,0.35,1) 0.04s',
                                }}
                              />
                            )}
                          </svg>
                        </button>
                        <span className="shrink-0 text-xs text-slate-400">
                          {selectedIds.size > 0
                            ? `${selectedIds.size} of ${visible.length} selected`
                            : 'Select all · or hover any row'}
                        </span>
                        {/* One-click stage quick-select chips */}
                        {STAGE_CHIPS.map(({ stage: s, label, cls }) => {
                          const stageRows = visible.filter((c) => c.stage === s);
                          if (stageRows.length === 0) return null;
                          const allChipSel = stageRows.every((c) => selectedIds.has(c.id));
                          return (
                            <button
                              key={s}
                              type="button"
                              title={allChipSel ? `Deselect all ${label}` : `Select all ${label}`}
                              onClick={() =>
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (allChipSel) stageRows.forEach((c) => next.delete(c.id));
                                  else stageRows.forEach((c) => next.add(c.id));
                                  return next;
                                })
                              }
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset transition-all duration-150',
                                cls,
                                allChipSel && 'ring-2',
                              )}
                            >
                              {label} ({stageRows.length})
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <div className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
                    {visible.map((c) => (
                      <CandidateRow
                        key={c.id}
                        candidate={c}
                        reqId={reqId}
                        canManage={canManage}
                        selected={selectedIds.has(c.id)}
                        isSelectMode={selectedIds.size > 0}
                        onSelect={(cand, checked) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(cand.id);
                            else next.delete(cand.id);
                            return next;
                          });
                        }}
                        onEmail={setEmailTarget}
                        onInterviews={setInterviewTarget}
                        onExams={setExamTarget}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </CardBody>

      <AddCandidateModal
        reqId={reqId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <EmailCandidateModal
        reqId={reqId}
        candidate={emailTarget}
        designation={requisition.designation}
        open={Boolean(emailTarget)}
        onClose={() => setEmailTarget(null)}
      />
      {interviewTarget && (
        <CandidateInterviewsModal
          reqId={reqId}
          candidate={{ id: interviewTarget.id, name: interviewTarget.name }}
          open={Boolean(interviewTarget)}
          onClose={() => setInterviewTarget(null)}
          onGoToSetup={onGoToAssessment}
        />
      )}
      {examTarget && (
        <CandidateExamsModal
          candidate={{ id: examTarget.id, name: examTarget.name }}
          open={Boolean(examTarget)}
          onClose={() => setExamTarget(null)}
        />
      )}

      <BulkInterviewModal
        reqId={reqId}
        candidates={candidates
          .filter((c) => selectedIds.has(c.id))
          .map((c) => ({ id: c.id, name: c.name }))}
        open={bulkOpen}
        onClose={() => {
          setBulkOpen(false);
          setSelectedIds(new Set());
        }}
      />

      <BusyOverlay
        show={screenAll.isPending}
        variant="ai"
        label="AI is screening CVs…"
        sublabel="Reading each CV and matching it to the role — this can take a moment."
      />
      <BusyOverlay
        show={compare.isPending}
        variant="ai"
        label="AI is comparing finalists…"
        sublabel="Weighing CV screening, exam scores and interview panel marks side by side."
      />
    </Card>
  );
}

/** Ranked side-by-side result of the AI finalist comparison. */
function ComparisonPanel({
  comparison,
  onClose,
}: {
  comparison: FinalistComparison;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Scale className="h-4 w-4 text-indigo-600" />
          AI finalist comparison
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            Advisory
          </span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {comparison.recommendation && (
        <p className="mb-3 rounded-lg bg-white/80 p-3 text-sm leading-relaxed text-slate-700 ring-1 ring-indigo-100">
          {comparison.recommendation}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {comparison.ranking.map((r) => (
          <div
            key={r.id}
            className={cn(
              'rounded-lg border bg-white p-3',
              r.rank === 1
                ? 'border-emerald-300 ring-1 ring-emerald-200'
                : 'border-slate-200',
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  r.rank === 1
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-600',
                )}
              >
                {r.rank === 1 ? <Trophy className="h-3.5 w-3.5" /> : r.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                {r.name}
              </span>
              {r.matchScore != null && (
                <span className="text-xs font-medium text-violet-600">
                  {r.matchScore}%
                </span>
              )}
            </div>
            {r.verdict && (
              <p className="mb-2 text-xs italic text-slate-500">{r.verdict}</p>
            )}
            {r.strengths.length > 0 && (
              <ul className="space-y-0.5">
                {r.strengths.map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-emerald-700">
                    <span className="shrink-0">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
            {r.risks.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {r.risks.map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-rose-600">
                    <span className="shrink-0">−</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Based on CV screening, exam scores and interview panel marks — the final
        decision is yours.
      </p>
    </div>
  );
}
