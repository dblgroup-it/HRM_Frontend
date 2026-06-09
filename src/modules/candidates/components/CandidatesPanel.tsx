import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Copy,
  FolderOpen,
  FolderPlus,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
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
  CandidateExamsModal,
  CandidateInterviewsModal,
} from '@modules/assessment';

import {
  useCandidates,
  useRecruitmentWorkspace,
  useScreenAll,
  useSetupWorkspace,
  useSyncDrive,
} from '../hooks/useCandidates';
import type { Candidate, CandidateStage } from '../types/candidate.types';
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
}: {
  requisition: Requisition;
  canManage: boolean;
}) {
  const reqId = requisition.id;
  const { data: workspace } = useRecruitmentWorkspace(reqId);
  const { data: candidates = [], isLoading } = useCandidates(reqId);
  const setup = useSetupWorkspace(reqId);
  const sync = useSyncDrive(reqId);
  const screenAll = useScreenAll(reqId);
  const aiOn = workspace?.aiScreening ?? false;

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Candidate | null>(null);
  const [interviewTarget, setInterviewTarget] = useState<Candidate | null>(null);
  const [examTarget, setExamTarget] = useState<Candidate | null>(null);

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
    return candidates.filter((c) => {
      if (tab !== 'all' && c.stage !== tab) return false;
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term)
      );
    });
  }, [candidates, tab, search]);

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
          <div className="space-y-2">
            <ShareLink
              icon={<Link2 className="h-4 w-4 shrink-0 text-brand-600" />}
              label="Application link — share this for CV collection"
              hint="Branded form, no Google account needed"
              url={applyLink}
              onCopy={() => copy(applyLink, 'Application link')}
              accent
            />
            <p className="flex items-start gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              Candidates upload through this secure form — they can&rsquo;t see or
              delete anyone else&rsquo;s CV. The Drive folder stays private to
              recruitment.
            </p>
            <a
              href={drive.rootFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600"
            >
              <FolderOpen className="h-3.5 w-3.5" /> Open Drive workspace (HR only)
            </a>
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
              <div className="ml-auto w-full sm:w-56">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search candidates…"
                  leftIcon={<Search className="h-4 w-4" />}
                />
              </div>
            </div>

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
                <div className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
                  {visible.map((c) => (
                    <CandidateRow
                      key={c.id}
                      candidate={c}
                      reqId={reqId}
                      canManage={canManage}
                      onEmail={setEmailTarget}
                      onInterviews={setInterviewTarget}
                      onExams={setExamTarget}
                    />
                  ))}
                </div>
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
        />
      )}
      {examTarget && (
        <CandidateExamsModal
          candidate={{ id: examTarget.id, name: examTarget.name }}
          open={Boolean(examTarget)}
          onClose={() => setExamTarget(null)}
        />
      )}

      <BusyOverlay
        show={screenAll.isPending}
        variant="ai"
        label="AI is screening CVs…"
        sublabel="Reading each CV and matching it to the role — this can take a moment."
      />
    </Card>
  );
}

function ShareLink({
  icon,
  label,
  hint,
  url,
  onCopy,
  accent,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  url: string;
  onCopy: () => void;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border p-2.5',
        accent ? 'border-brand-100 bg-brand-50/50' : 'border-slate-200 bg-slate-50',
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'block truncate text-xs hover:underline',
            accent ? 'text-brand-700' : 'text-slate-500',
          )}
          title={hint}
        >
          {url}
        </a>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-brand-600"
        title="Copy link"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}
