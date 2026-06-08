import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Copy,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Link2,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import {
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
  useCandidates,
  useRecruitmentWorkspace,
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
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'final', label: 'Final' },
  { key: 'selected', label: 'Selected' },
  { key: 'rejected', label: 'Rejected' },
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

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Candidate | null>(null);

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
            <div className="grid gap-2 sm:grid-cols-2">
              <ShareLink
                icon={<Link2 className="h-4 w-4 shrink-0 text-brand-600" />}
                label="Application link — for job ads"
                hint="Branded form, no Google account needed"
                url={applyLink}
                onCopy={() => copy(applyLink, 'Application link')}
                accent
              />
              <ShareLink
                icon={<HardDrive className="h-4 w-4 shrink-0 text-slate-500" />}
                label="Drive CV link — anyone can drop CVs"
                hint="Shared “anyone with the link”"
                url={drive.allCvFolderUrl}
                onCopy={() => copy(drive.allCvFolderUrl, 'Drive CV link')}
              />
            </div>
            <a
              href={drive.rootFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600"
            >
              <FolderOpen className="h-3.5 w-3.5" /> Open full Drive workspace (all
              stage folders)
            </a>
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
