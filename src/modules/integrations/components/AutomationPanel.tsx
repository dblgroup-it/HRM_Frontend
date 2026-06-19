import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BellRing,
  DatabaseBackup,
  ExternalLink,
  MailSearch,
  PauseCircle,
  Play,
  PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@shared/components/ui';

import {
  automationApi,
  type AutomationJob,
  type JobPauseState,
} from '../api/automation.api';
import { SyncTerminal } from './SyncTerminal';

const STATUS_KEY = ['automation', 'status'] as const;

const PAUSE_CHOICES = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'Until I resume', days: undefined },
] as const;

function errMsg(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return 'The run failed — check the server log.';
}

/** The three scheduled automations, each with a manual "Run now". */
export function AutomationPanel() {
  const qc = useQueryClient();
  const [results, setResults] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: status } = useQuery({
    queryKey: STATUS_KEY,
    queryFn: automationApi.status,
    refetchOnWindowFocus: false,
  });
  const { data: logData } = useQuery({
    queryKey: ['automation', 'logs'],
    queryFn: automationApi.logs,
    refetchOnWindowFocus: false,
    // Invalidated on mutation success — no continuous polling needed
  });
  const pauseMut = useMutation({
    mutationFn: (vars: { job: AutomationJob; days?: number }) =>
      automationApi.pause(vars.job, vars.days),
    onSuccess: (_s, vars) => {
      qc.invalidateQueries({ queryKey: STATUS_KEY });
      toast.success(
        vars.days
          ? `Paused for ${vars.days} day${vars.days > 1 ? 's' : ''}`
          : 'Paused until resumed',
      );
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const resumeMut = useMutation({
    mutationFn: (job: AutomationJob) => automationApi.resume(job),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STATUS_KEY });
      toast.success('Schedule resumed');
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const remember = (key: string, text: string) => {
    setResults((r) => ({ ...r, [key]: text }));
    setErrors((e) => ({ ...e, [key]: '' }));
    qc.invalidateQueries({ queryKey: ['automation', 'logs'] });
  };
  const fail = (key: string, error: unknown) =>
    setErrors((e) => ({ ...e, [key]: errMsg(error) }));

  const ingest = useMutation({
    mutationFn: automationApi.gmailIngest,
    onSuccess: (r) => {
      remember(
        'ingest',
        `Scanned ${r.scanned} mail${r.scanned === 1 ? '' : 's'} — imported ${r.imported}, duplicates ${r.duplicates}, unmatched ${r.unmatched}.`,
      );
      if (r.imported > 0) {
        qc.invalidateQueries({ queryKey: ['candidates'] });
        toast.success(`${r.imported} emailed CV${r.imported > 1 ? 's' : ''} imported`);
      } else {
        toast.success('Inbox scanned — nothing new to import');
      }
    },
    onError: (e) => fail('ingest', e),
  });

  const nudges = useMutation({
    mutationFn: automationApi.nudges,
    onSuccess: (r) => {
      remember(
        'nudges',
        `Reminded ${r.approversNudged} approver(s) on ${r.staleApprovals} requisition(s) and ${r.panelistsNudged} panelist(s) on ${r.unmarkedInterviews} interview(s).`,
      );
      toast.success('Reminders sent');
    },
    onError: (e) => fail('nudges', e),
  });

  const backup = useMutation({
    mutationFn: automationApi.backup,
    onSuccess: (r) => {
      remember(
        'backup',
        `${r.file} (${(r.sizeBytes / 1024 / 1024).toFixed(1)} MB) uploaded — keeping ${r.kept} backup(s).`,
      );
      setResults((prev) => ({ ...prev, backupUrl: r.url }));
      toast.success('Database backed up to Drive');
    },
    onError: (e) => fail('backup', e),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation</CardTitle>
        <span className="text-xs text-slate-400">
          Runs on schedule — trigger manually any time
        </span>
      </CardHeader>
      <CardBody className="divide-y divide-slate-100">
        <AutomationRow
          icon={<MailSearch className="h-5 w-5" />}
          title="Emailed-CV ingestion"
          schedule="every 15 min"
          description="Scans the recruitment inbox for CVs; the requisition code in the subject routes the candidate straight into that pipeline (Drive + AI screen included)."
          isRunning={ingest.isPending}
          onRun={() => ingest.mutate()}
          result={results.ingest}
          error={errors.ingest}
          pause={status?.ingest}
          onPause={(days) => pauseMut.mutate({ job: 'ingest', days })}
          onResume={() => resumeMut.mutate('ingest')}
        />
        <AutomationRow
          icon={<BellRing className="h-5 w-5" />}
          title="Approval & marks reminders"
          schedule="daily 09:30"
          description="Nudges approvers sitting on a requisition for 3+ days, and panelists who haven't submitted interview marks 2 days after the session."
          isRunning={nudges.isPending}
          onRun={() => nudges.mutate()}
          result={results.nudges}
          error={errors.nudges}
          pause={status?.nudges}
          onPause={(days) => pauseMut.mutate({ job: 'nudges', days })}
          onResume={() => resumeMut.mutate('nudges')}
        />
        <AutomationRow
          icon={<DatabaseBackup className="h-5 w-5" />}
          title="Database backup to Drive"
          schedule="nightly 02:30"
          description="Full pg_dump uploaded to “99 Backups” on the recruitment Drive, keeping the latest 30."
          isRunning={backup.isPending}
          onRun={() => backup.mutate()}
          result={results.backup}
          resultLink={
            results.backupUrl
              ? { href: results.backupUrl, label: 'View in Drive' }
              : undefined
          }
          error={errors.backup}
          pause={status?.backup}
          onPause={(days) => pauseMut.mutate({ job: 'backup', days })}
          onResume={() => resumeMut.mutate('backup')}
        />

        {/* Rolling console of cron + manual runs */}
        {(logData?.lines?.length ?? 0) > 0 && (
          <div className="pt-4">
            <SyncTerminal
              lines={logData?.lines ?? []}
              running={ingest.isPending || nudges.isPending || backup.isPending}
              title="Automation · console"
              height="h-48"
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/** "Pause" button with a duration menu (matches the app's button styling). */
function PauseMenu({ onPause }: { onPause: (days?: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        leftIcon={<PauseCircle className="h-3.5 w-3.5 text-amber-500" />}
        onClick={() => setOpen((o) => !o)}
      >
        Pause
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Pause schedule for
            </p>
            {PAUSE_CHOICES.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  onPause(c.days);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-amber-50 hover:text-amber-700"
              >
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AutomationRow({
  icon,
  title,
  schedule,
  description,
  isRunning,
  onRun,
  result,
  resultLink,
  error,
  pause,
  onPause,
  onResume,
}: {
  icon: React.ReactNode;
  title: string;
  schedule: string;
  description: string;
  isRunning: boolean;
  onRun: () => void;
  result?: string;
  resultLink?: { href: string; label: string };
  error?: string;
  pause?: JobPauseState;
  onPause: (days?: number) => void;
  onResume: () => void;
}) {
  const paused = pause?.paused ?? false;
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
            paused ? 'bg-amber-50 text-amber-500' : 'bg-brand-50 text-brand-600'
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
            {title}
            {paused ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                <PauseCircle className="h-3 w-3" />
                {pause?.pausedUntil
                  ? `Paused until ${new Date(pause.pausedUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                  : 'Paused'}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {schedule}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          {result && (
            <p className="mt-1.5 text-xs font-medium text-emerald-700">
              ✓ {result}{' '}
              {resultLink && (
                <a
                  href={resultLink.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-brand-600 hover:underline"
                >
                  {resultLink.label} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>
          )}
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {paused ? (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<PlayCircle className="h-3.5 w-3.5 text-emerald-600" />}
            onClick={onResume}
          >
            Resume
          </Button>
        ) : (
          <PauseMenu onPause={onPause} />
        )}
        <Button
          size="sm"
          variant="outline"
          isLoading={isRunning}
          leftIcon={<Play className="h-3.5 w-3.5" />}
          onClick={onRun}
        >
          {isRunning ? 'Running…' : 'Run now'}
        </Button>
      </div>
    </div>
  );
}
