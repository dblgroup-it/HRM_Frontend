import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
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
  useBulkReject,
  useCandidates,
  useCompareFinalists,
  useExportCandidates,
  useRecruitmentWorkspace,
  useScreenAll,
  useScreeningStatus,
  useSetupWorkspace,
  useSyncDrive,
} from '../hooks/useCandidates';
import type {
  Candidate,
  CandidateFilters,
  CandidateStage,
  FinalistComparison,
} from '../types/candidate.types';
import { CandidateRow } from './CandidateRow';
import { AddCandidateModal } from './AddCandidateModal';
import { EmailCandidateModal } from './EmailCandidateModal';
import { PostToBdJobsModal } from '@modules/integrations/bdjobs';

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

const FUNNEL: { key: CandidateStage; label: string; tone: string }[] = [
  { key: 'applied', label: 'Applied', tone: 'bg-slate-400' },
  { key: 'ai_shortlisted', label: 'AI Shortlisted', tone: 'bg-violet-500' },
  { key: 'shortlisted', label: 'Shortlisted', tone: 'bg-sky-500' },
  { key: 'interview', label: 'Interview', tone: 'bg-amber-500' },
  { key: 'final', label: 'Final', tone: 'bg-indigo-500' },
  { key: 'selected', label: 'Selected', tone: 'bg-emerald-500' },
];

const PAGE_SIZE = 50;

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
  const setup = useSetupWorkspace(reqId);
  const sync = useSyncDrive(reqId);
  const screenAll = useScreenAll(reqId);
  const bulkReject = useBulkReject(reqId);
  const exportCsv = useExportCandidates(reqId);
  const compare = useCompareFinalists(reqId);
  const aiOn = workspace?.aiScreening ?? false;

  // Filters (all go to server)
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'match' | 'name'>('match');
  const [minScore, setMinScore] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [tab, minScore, sort]);

  const filters: CandidateFilters = {
    page,
    pageSize: PAGE_SIZE,
    stage: tab === 'all' ? undefined : tab,
    minScore: minScore ?? undefined,
    search: debouncedSearch || undefined,
    sortBy: sort,
  };

  const { data: candidatePage, isLoading, isFetching } = useCandidates(reqId, filters);
  const items = candidatePage?.items ?? [];
  const meta = candidatePage?.meta;
  const stats = candidatePage?.stats;

  // Screening progress (poll every 2s when active)
  const [screeningActive, setScreeningActive] = useState(false);
  const { data: screeningStatus } = useScreeningStatus(reqId, screeningActive);

  // When poll reports done, stop polling and refresh candidates
  const prevActive = useRef(false);
  useEffect(() => {
    if (!screeningStatus) return;
    if (prevActive.current && !screeningStatus.active) {
      setScreeningActive(false);
      toast.success(
        screeningStatus.total === 0
          ? 'No new CVs to screen'
          : `Screened ${screeningStatus.total} CV${screeningStatus.total > 1 ? 's' : ''} — ${screeningStatus.shortlisted} AI-shortlisted`,
      );
    }
    prevActive.current = screeningStatus.active;
  }, [screeningStatus]);

  // Bulk reject UI
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectScore, setBulkRejectScore] = useState(50);

  const [comparison, setComparison] = useState<FinalistComparison | null>(null);
  const finalistCount = stats?.finalists ?? 0;

  const [addOpen, setAddOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Candidate | null>(null);
  const [interviewTarget, setInterviewTarget] = useState<Candidate | null>(null);
  const [examTarget, setExamTarget] = useState<Candidate | null>(null);

  // Selected candidates tracked as Map<id, {id,name}> so names survive page changes
  const [selectedCandidates, setSelectedCandidates] = useState<Map<string, { id: string; name: string }>>(new Map());
  const selectedIds = useMemo(() => new Set(selectedCandidates.keys()), [selectedCandidates]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bdJobsOpen, setBdJobsOpen] = useState(false);

  const drive = workspace?.drive ?? requisition.drive ?? null;
  const driveConnected = workspace?.connected ?? true;
  const applyLink = `${window.location.origin}/apply/${reqId}`;

  // Auto-import CVs from Drive on first load
  const hasDrive = Boolean(drive);
  const syncMutate = sync.mutate;
  useEffect(() => {
    if (hasDrive) syncMutate();
  }, [hasDrive, reqId, syncMutate]);

  const counts = stats?.stageCounts ?? {};
  const notViewedCount = stats?.notViewed ?? 0;

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const handleScreenAll = () => {
    screenAll.mutate(undefined, {
      onSuccess: (result) => {
        if (!result.started && result.total === 0) {
          toast.info('No new CVs to screen');
          return;
        }
        if (result.alreadyRunning) {
          toast.info('Screening is already running');
          setScreeningActive(true);
          return;
        }
        setScreeningActive(true);
        prevActive.current = true;
        toast.success(`Screening ${result.total} CVs in the background…`);
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-600" />
          Candidate Pipeline
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {stats?.total ?? 0}
          </span>
        </CardTitle>
        {canManage && drive && (
          <div className="flex items-center gap-2">
            {aiOn && finalistCount >= 2 && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Scale className="h-4 w-4 text-indigo-600" />}
                onClick={() => compare.mutate(undefined, { onSuccess: setComparison })}
                disabled={compare.isPending}
                title="AI side-by-side comparison of interview/final/selected candidates"
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
                      (screenAll.isPending || screeningActive) && 'animate-pulse',
                    )}
                  />
                }
                onClick={handleScreenAll}
                disabled={screenAll.isPending || screeningActive}
                title="AI-screen new applied CVs against this role"
              >
                {screeningActive ? 'Screening…' : 'AI Screen'}
              </Button>
            )}
            {canManage && aiOn && (stats?.unscreened ?? 0) === 0 && (meta?.total ?? 0) > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="border-rose-300 text-rose-600 hover:bg-rose-50"
                leftIcon={<AlertTriangle className="h-4 w-4" />}
                onClick={() => setBulkRejectOpen(true)}
                title="Reject all candidates below an AI match score"
              >
                Bulk Reject
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              leftIcon={
                <RefreshCw className={cn('h-4 w-4', sync.isPending && 'animate-spin')} />
              }
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
            >
              Sync
            </Button>
            {(stats?.total ?? 0) > 0 && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => exportCsv.mutate(filters)}
                disabled={exportCsv.isPending}
                title="Export current view to CSV (opens in Excel)"
              >
                {exportCsv.isPending ? 'Exporting…' : 'Export'}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBdJobsOpen(true)}
              className="border-[#e8753c] text-[#e8753c] hover:bg-orange-50"
              title="Post this job to BDJobs"
            >
              🅱 BDJobs
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

        {/* Screening progress bar */}
        {screeningActive && screeningStatus && (
          <ScreeningProgressBar status={screeningStatus} />
        )}

        {/* AI match score distribution */}
        {stats && (stats.total - stats.unscreened) > 0 && (
          <ScoreDistributionBar stats={stats} />
        )}

        {/* Pipeline funnel */}
        {drive && (stats?.total ?? 0) > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex flex-wrap items-stretch gap-1.5">
              {FUNNEL.map((s) => {
                const n = counts[s.key] ?? 0;
                const total = stats?.total ?? 1;
                const pct = total ? Math.round((n / total) * 100) : 0;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => { setTab(s.key); setPage(1); }}
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
                      <span className="text-lg font-semibold leading-none text-slate-800">{n}</span>
                    </div>
                    <p className="mt-1 truncate text-[11px] font-medium text-slate-500">{s.label}</p>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200">
                      <div className={cn('h-full rounded-full', s.tone)} style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* AI finalist comparison */}
        {comparison && (
          <ComparisonPanel comparison={comparison} onClose={() => setComparison(null)} />
        )}

        {/* Tabs + search + sort */}
        {drive && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => { setTab(t.key); setPage(1); }}
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
                        tab === t.key ? 'bg-white/20' : 'bg-white text-slate-500',
                      )}
                    >
                      {t.key === 'all' ? (stats?.total ?? 0) : (counts[t.key] ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value as 'recent' | 'match' | 'name'); setPage(1); }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="match">Best AI match</option>
                  <option value="recent">Newest</option>
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

            {/* AI match score filter chips + not-viewed badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">AI Match:</span>
              {[null, 25, 50, 75, 90].map((score) => (
                <button
                  key={score ?? 'all'}
                  type="button"
                  onClick={() => { setMinScore(score); setPage(1); }}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition',
                    minScore === score
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {score === null ? 'All' : `${score}%+`}
                </button>
              ))}
              {notViewedCount > 0 && (
                <span className="ml-2 flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {notViewedCount} not yet viewed
                </span>
              )}
            </div>

            {/* Bulk action bar */}
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
                    onClick={() => setSelectedCandidates(new Map())}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Candidate list */}
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-400">
                  {(stats?.total ?? 0) === 0
                    ? 'No candidates yet. Share the application link above, or add one manually.'
                    : 'No candidates match this filter.'}
                </p>
              ) : (
                <>
                  {/* Select-all header */}
                  {canManage && (() => {
                    const allSel = items.length > 0 && items.every((c) => selectedIds.has(c.id));
                    const someSel = items.some((c) => selectedIds.has(c.id));

                    const STAGE_CHIPS: { stage: CandidateStage; label: string; cls: string }[] = [
                      { stage: 'ai_shortlisted', label: 'AI Shortlisted', cls: 'bg-violet-100 text-violet-700 hover:bg-violet-200 ring-violet-200' },
                      { stage: 'shortlisted', label: 'Shortlisted', cls: 'bg-sky-100 text-sky-700 hover:bg-sky-200 ring-sky-200' },
                      { stage: 'interview', label: 'Interview', cls: 'bg-amber-100 text-amber-700 hover:bg-amber-200 ring-amber-200' },
                    ];

                    return (
                      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCandidates((prev) => {
                              const next = new Map(prev);
                              if (allSel) items.forEach((c) => next.delete(c.id));
                              else items.forEach((c) => next.set(c.id, { id: c.id, name: c.name }));
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
                            ? `${selectedIds.size} of ${meta?.total ?? items.length} selected`
                            : 'Select all · or hover any row'}
                        </span>
                        {STAGE_CHIPS.map(({ stage: s, label, cls }) => {
                          const stageRows = items.filter((c) => c.stage === s);
                          if (stageRows.length === 0) return null;
                          const allChipSel = stageRows.every((c) => selectedIds.has(c.id));
                          return (
                            <button
                              key={s}
                              type="button"
                              title={allChipSel ? `Deselect all ${label}` : `Select all ${label}`}
                              onClick={() =>
                                setSelectedCandidates((prev) => {
                                  const next = new Map(prev);
                                  if (allChipSel) stageRows.forEach((c) => next.delete(c.id));
                                  else stageRows.forEach((c) => next.set(c.id, { id: c.id, name: c.name }));
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

                  <div className={cn('divide-y divide-slate-100', isFetching && !isLoading && 'opacity-60 transition-opacity')}>
                    {items.map((c) => (
                      <CandidateRow
                        key={c.id}
                        candidate={c}
                        reqId={reqId}
                        canManage={canManage}
                        selected={selectedIds.has(c.id)}
                        isSelectMode={selectedIds.size > 0}
                        onSelect={(cand, checked) => {
                          setSelectedCandidates((prev) => {
                            const next = new Map(prev);
                            if (checked) next.set(cand.id, { id: cand.id, name: cand.name });
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

                  {/* Pagination */}
                  {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                      <span className="text-xs text-slate-400">
                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, meta.total)} of {meta.total}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="min-w-[4rem] text-center text-xs font-medium text-slate-600">
                          {page} / {meta.totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={page >= meta.totalPages}
                          onClick={() => setPage((p) => p + 1)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </CardBody>

      {/* Modals */}
      <AddCandidateModal reqId={reqId} open={addOpen} onClose={() => setAddOpen(false)} />
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
        candidates={[...selectedCandidates.values()]}
        open={bulkOpen}
        onClose={() => {
          setBulkOpen(false);
          setSelectedCandidates(new Map());
        }}
      />

      <PostToBdJobsModal
        open={bdJobsOpen}
        onClose={() => setBdJobsOpen(false)}
        requisition={requisition}
      />

      {/* Bulk reject confirmation modal */}
      {bulkRejectOpen && (
        <BulkRejectModal
          defaultScore={bulkRejectScore}
          onScoreChange={setBulkRejectScore}
          onConfirm={() => {
            bulkReject.mutate(bulkRejectScore, { onSettled: () => setBulkRejectOpen(false) });
          }}
          onClose={() => setBulkRejectOpen(false)}
          isPending={bulkReject.isPending}
        />
      )}

      <BusyOverlay
        show={compare.isPending}
        variant="ai"
        label="AI is comparing finalists…"
        sublabel="Weighing CV screening, exam scores and interview panel marks side by side."
      />
    </Card>
  );
}

// --- Sub-components -------------------------------------------------------

function ScreeningProgressBar({ status }: { status: { done: number; total: number; shortlisted: number; active: boolean } }) {
  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0;
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-violet-700">
          <Sparkles className="h-4 w-4 animate-pulse" />
          AI Screening in progress
        </span>
        <span className="text-xs text-violet-500">
          {status.done} / {status.total} CVs · {status.shortlisted} shortlisted
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-violet-200">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-violet-400">
        Reading each CV and matching to the role — you can keep working while this runs.
      </p>
    </div>
  );
}

const SCORE_BANDS = [
  { label: 'Excellent', range: '90%+',   key: 'band90'  as const, bar: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  { label: 'Good',      range: '75–89%', key: 'band75'  as const, bar: 'bg-sky-500',     dot: 'bg-sky-500',     text: 'text-sky-700' },
  { label: 'Fair',      range: '50–74%', key: 'band50'  as const, bar: 'bg-amber-400',   dot: 'bg-amber-400',   text: 'text-amber-600' },
  { label: 'Weak',      range: '25–49%', key: 'band25'  as const, bar: 'bg-orange-400',  dot: 'bg-orange-400',  text: 'text-orange-600' },
  { label: 'Poor',      range: '<25%',   key: 'below25' as const, bar: 'bg-rose-400',    dot: 'bg-rose-400',    text: 'text-rose-600' },
];

function ScoreDistributionBar({
  stats,
}: {
  stats: { total: number; band90: number; band75: number; band50: number; band25: number; unscreened: number };
}) {
  const screened = stats.total - stats.unscreened;
  if (screened === 0) return null;

  const below25 = Math.max(0, screened - stats.band90 - stats.band75 - stats.band50 - stats.band25);
  const counts: Record<string, number> = {
    band90: stats.band90, band75: stats.band75, band50: stats.band50, band25: stats.band25, below25,
  };

  const activeBands = SCORE_BANDS.filter((b) => (counts[b.key] ?? 0) > 0);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
      {/* Title + counts summary */}
      <span className="shrink-0 text-xs font-semibold text-slate-500">AI Match</span>

      {/* Stacked bar */}
      <div className="flex h-2.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-100">
        {activeBands.map((b) => {
          const pct = Math.round(((counts[b.key] ?? 0) / screened) * 100);
          return (
            <div
              key={b.key}
              className={cn('h-full transition-all duration-700', b.bar)}
              style={{ width: `${pct}%` }}
              title={`${b.label} (${b.range}): ${(counts[b.key] ?? 0).toLocaleString()}`}
            />
          );
        })}
      </div>

      {/* Legend pills */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {activeBands.map((b) => {
          const count = counts[b.key] ?? 0;
          const pct = Math.round((count / screened) * 100);
          return (
            <span key={b.key} className="flex items-center gap-1 text-[11px]" title={b.range}>
              <span className={cn('h-2 w-2 shrink-0 rounded-full', b.dot)} />
              <span className={cn('font-bold tabular-nums', b.text)}>{count.toLocaleString()}</span>
              <span className="text-slate-400">{b.label}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">{pct}%</span>
            </span>
          );
        })}
        {stats.unscreened > 0 && (
          <span className="flex items-center gap-1 text-[11px]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
            <span className="font-bold tabular-nums text-slate-400">{stats.unscreened.toLocaleString()}</span>
            <span className="text-slate-400">pending</span>
          </span>
        )}
      </div>
    </div>
  );
}

function BulkRejectModal({
  defaultScore,
  onScoreChange,
  onConfirm,
  onClose,
  isPending,
}: {
  defaultScore: number;
  onScoreChange: (v: number) => void;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const options = [
    { score: 25, label: 'Below 25% match' },
    { score: 50, label: 'Below 50% match' },
    { score: 75, label: 'Below 75% match' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Bulk Reject Candidates</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-500">
            Reject all <strong>Applied</strong> and <strong>AI Shortlisted</strong> candidates whose AI match score is at or below the chosen threshold.
          </p>
          <div className="space-y-2">
            {options.map((o) => (
              <label key={o.score} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50 has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50">
                <input
                  type="radio"
                  name="threshold"
                  value={o.score}
                  checked={defaultScore === o.score}
                  onChange={() => onScoreChange(o.score)}
                  className="accent-rose-500"
                />
                <span className="text-sm font-medium text-slate-700">{o.label}</span>
              </label>
            ))}
          </div>
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
            <AlertTriangle className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
            This action cannot be undone. Rejected candidates can still be viewed in the Rejected tab.
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            className="bg-rose-600 hover:bg-rose-700 text-white"
            onClick={onConfirm}
            isLoading={isPending}
          >
            Reject below {defaultScore}%
          </Button>
        </div>
      </div>
    </div>
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
              r.rank === 1 ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200',
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  r.rank === 1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {r.rank === 1 ? <Trophy className="h-3.5 w-3.5" /> : r.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{r.name}</span>
              {r.matchScore != null && (
                <span className="text-xs font-medium text-violet-600">{r.matchScore}%</span>
              )}
            </div>
            {r.verdict && <p className="mb-2 text-xs italic text-slate-500">{r.verdict}</p>}
            {r.strengths.length > 0 && (
              <ul className="space-y-0.5">
                {r.strengths.map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-emerald-700">
                    <span className="shrink-0">+</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
            {r.risks.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {r.risks.map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-rose-600">
                    <span className="shrink-0">−</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Based on CV screening, exam scores and interview panel marks — the final decision is yours.
      </p>
    </div>
  );
}
