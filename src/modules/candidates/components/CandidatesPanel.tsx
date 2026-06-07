import { useEffect, useState } from 'react';
import {
  Copy,
  FolderOpen,
  FolderPlus,
  Link2,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
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
import type { CandidateStage } from '../types/candidate.types';
import { CandidateCard } from './CandidateCard';
import { AddCandidateModal } from './AddCandidateModal';

const STAGES: { key: CandidateStage; label: string; accent: string }[] = [
  { key: 'applied', label: 'Applied', accent: 'border-t-slate-400' },
  { key: 'shortlisted', label: 'Shortlisted', accent: 'border-t-sky-500' },
  { key: 'interview', label: 'Interview', accent: 'border-t-amber-500' },
  { key: 'final', label: 'Final', accent: 'border-t-violet-500' },
  { key: 'selected', label: 'Selected', accent: 'border-t-emerald-500' },
  { key: 'rejected', label: 'Rejected', accent: 'border-t-rose-400' },
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
  const [addOpen, setAddOpen] = useState(false);

  const drive = workspace?.drive ?? requisition.drive ?? null;
  const driveConnected = workspace?.connected ?? true;
  const collectionLink = drive?.allCvFolderUrl ?? '';

  // Auto-import any CVs dropped straight into the Drive folder (runs once the
  // workspace is known). Idempotent server-side, so it never duplicates.
  const hasDrive = Boolean(drive);
  const syncMutate = sync.mutate;
  useEffect(() => {
    if (hasDrive) syncMutate();
  }, [hasDrive, reqId, syncMutate]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(collectionLink);
    toast.success('CV collection link copied');
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-600" />F · Candidates
        </CardTitle>
        {canManage && drive && (
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setAddOpen(true)}
          >
            Add candidate
          </Button>
        )}
      </CardHeader>

      <CardBody className="space-y-5">
        {/* Drive workspace / collection link */}
        {!drive ? (
          !driveConnected ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Google Drive isn&rsquo;t connected yet. An admin needs to finish the
              Drive setup before CVs can be collected.
            </p>
          ) : canManage ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Create this requisition&rsquo;s Google Drive recruitment folders
                (All CVs, Shortlisted, Interview, Final, Joining) to start
                collecting candidates.
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
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/50 p-3">
            <Link2 className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="text-xs font-medium text-slate-600">
              CV collection link
            </span>
            <a
              href={collectionLink}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate text-xs text-brand-700 underline-offset-2 hover:underline"
            >
              {collectionLink}
            </a>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Copy className="h-3.5 w-3.5" />}
              onClick={copyLink}
            >
              Copy
            </Button>
            <a href={drive.rootFolderUrl} target="_blank" rel="noreferrer">
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<FolderOpen className="h-4 w-4" />}
              >
                Open folder
              </Button>
            </a>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={
                <RefreshCw
                  className={cn('h-4 w-4', sync.isPending && 'animate-spin')}
                />
              }
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              title="Import CVs uploaded straight into the Drive folder"
            >
              Sync CVs
            </Button>
          </div>
        )}

        {/* Pipeline */}
        {drive &&
          (isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {STAGES.map((stage) => {
                const list = candidates.filter((c) => c.stage === stage.key);
                return (
                  <div
                    key={stage.key}
                    className={`min-w-[210px] flex-1 rounded-lg border border-t-2 border-slate-200 bg-surface-muted ${stage.accent}`}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm font-medium text-slate-700">
                        {stage.label}
                      </span>
                      <span className="rounded-full bg-white px-2 text-xs font-semibold text-slate-500">
                        {list.length}
                      </span>
                    </div>
                    <div className="space-y-2 p-2">
                      {list.map((c) => (
                        <CandidateCard
                          key={c.id}
                          candidate={c}
                          reqId={reqId}
                          canManage={canManage}
                        />
                      ))}
                      {list.length === 0 && (
                        <p className="px-1 py-3 text-center text-xs text-slate-300">
                          —
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

        {drive && !isLoading && candidates.length === 0 && (
          <p className="text-center text-sm text-slate-400">
            No candidates yet. Share the CV link above, or add candidates
            manually.
          </p>
        )}
      </CardBody>

      <AddCandidateModal
        reqId={reqId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </Card>
  );
}
