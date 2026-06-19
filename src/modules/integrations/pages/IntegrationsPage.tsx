import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  RefreshCw,
  CloudDownload,
  AlertTriangle,
  Loader2,
  Mail,
  MailX,
  CheckCircle2,
  WifiOff,
  Database,
  HardDrive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataTable,
  PageHeader,
  SegmentedToggle,
  Spinner,
  type BadgeTone,
  type Column,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { http } from '@shared/api';
import { formatDate, formatRelative } from '@shared/utils';
import type { ApiResponse } from '@shared/types';

import {
  useRefreshAfterSync,
  useStartSync,
  useSyncStatus,
  useZingHrLogs,
} from '../hooks/useZingHr';
import { SyncTerminal } from '../components/SyncTerminal';
import { AutomationPanel } from '../components/AutomationPanel';
import type { ZingHrSyncLog } from '../types/zinghr.types';

interface NotificationSettings {
  emailEnabled: boolean;
  mailConfigured: boolean;
}
interface DriveStatus {
  hasClient: boolean;
  connected: boolean;
  calendar: boolean;
}

export default function IntegrationsPage() {
  const start = useStartSync();
  const { data: status } = useSyncStatus();
  const { data: logs, isLoading: logsLoading } = useZingHrLogs();
  const refreshAfterSync = useRefreshAfterSync();
  const [showHistory, setShowHistory] = useState(false);

  const isRunning = status?.status === 'running' || start.isPending;
  const prevStatus = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevStatus.current === 'running' && status?.status !== 'running') {
      refreshAfterSync();
    }
    prevStatus.current = status?.status;
  }, [status?.status, refreshAfterSync]);

  const pct =
    status && status.total > 0
      ? Math.min(100, Math.round((status.processed / status.total) * 100))
      : 0;

  const { data: driveStatus, isLoading: driveLoading } = useQuery({
    queryKey: ['integrations', 'google', 'status'],
    queryFn: () =>
      http
        .get<ApiResponse<DriveStatus>>('/integrations/google/drive/status')
        .then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const qc = useQueryClient();
  const { data: emailSettings, isLoading: emailLoading } = useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: () =>
      http
        .get<ApiResponse<NotificationSettings>>('/settings/notifications')
        .then((r) => r.data),
    refetchOnWindowFocus: false,
  });
  const emailToggle = useMutation({
    mutationFn: (emailEnabled: boolean) =>
      http
        .patch<ApiResponse<NotificationSettings>>('/settings/notifications', { emailEnabled })
        .then((r) => r.data),
    onSuccess: (d) => {
      qc.setQueryData<NotificationSettings>(['settings', 'notifications'], (old) =>
        old ? { ...old, ...d } : old,
      );
      toast.success(d.emailEnabled ? 'Email notifications enabled' : 'Email notifications disabled');
    },
    onError: (e) => toast.error((e as Error).message || 'Could not save'),
  });

  const lastRun = logs?.[0];

  const historyColumns: Column<ZingHrSyncLog>[] = [
    { key: 'startedAt', header: 'Run', render: (l) => formatDate(l.startedAt, 'dd MMM yyyy, p') },
    {
      key: 'status',
      header: 'Status',
      render: (l) => (
        <Badge tone={statusTone(l.status)} dot>
          {l.status}
        </Badge>
      ),
    },
    { key: 'total',    header: 'Total',    align: 'right', render: (l) => l.total },
    { key: 'inserted', header: 'Inserted', align: 'right', render: (l) => l.inserted },
    { key: 'updated',  header: 'Updated',  align: 'right', render: (l) => l.updated },
    { key: 'skipped',  header: 'Skipped',  align: 'right', render: (l) => l.skipped },
    { key: 'failed',   header: 'Failed',   align: 'right', render: (l) => l.failed },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="External systems connected to DBL HRM."
      />

      {/* ── Connected Services Overview ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* ZingHR */}
        <ServiceCard
          icon={<Database className="h-5 w-5" />}
          iconColor="text-brand-600 bg-brand-50"
          name="ZingHR"
          sub="Employee master"
          connected={true}
          meta={
            isRunning
              ? 'Sync in progress…'
              : lastRun
                ? `Last synced ${formatRelative(lastRun.startedAt)}`
                : 'Never synced'
          }
        />

        {/* Google Workspace */}
        <ServiceCard
          icon={<HardDrive className="h-5 w-5" />}
          iconColor={
            driveLoading
              ? 'text-slate-400 bg-slate-50'
              : driveStatus?.connected
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-amber-600 bg-amber-50'
          }
          name="Google Workspace"
          sub="Drive · Gmail · Calendar"
          connected={driveStatus?.connected ?? false}
          loading={driveLoading}
          meta={
            driveLoading
              ? 'Checking…'
              : driveStatus?.connected
                ? 'OAuth active — Drive & Gmail connected'
                : 'Run OAuth consent at /api/integrations/google/oauth/start'
          }
        />

        {/* Email (SMTP) */}
        <ServiceCard
          icon={
            emailSettings?.mailConfigured ? (
              <Mail className="h-5 w-5" />
            ) : (
              <MailX className="h-5 w-5" />
            )
          }
          iconColor={
            emailLoading
              ? 'text-slate-400 bg-slate-50'
              : emailSettings?.mailConfigured
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-amber-600 bg-amber-50'
          }
          name="Email (SMTP)"
          sub="Outgoing notifications"
          connected={emailSettings?.mailConfigured ?? false}
          loading={emailLoading}
          meta={
            emailLoading
              ? 'Checking…'
              : emailSettings?.mailConfigured
                ? 'MAIL_USER & MAIL_APP_PASSWORD set'
                : 'Set MAIL_USER and MAIL_APP_PASSWORD in .env'
          }
          action={
            !emailLoading && (
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">Master email switch</span>
                <SegmentedToggle
                  value={emailSettings?.emailEnabled ?? true}
                  disabled={emailToggle.isPending}
                  onChange={(v) => emailToggle.mutate(v)}
                />
              </div>
            )
          }
        />
      </div>

      {/* ── Automation ──────────────────────────────────────────────── */}
      <AutomationPanel />

      {/* ── ZingHR Sync ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <CloudDownload className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>ZingHR · Employee Sync</CardTitle>
              {lastRun && !isRunning && (
                <p className="text-xs text-slate-400">
                  Last run {formatRelative(lastRun.startedAt)} ·{' '}
                  <span className={lastRun.status === 'success' ? 'text-emerald-600' : 'text-red-500'}>
                    {lastRun.status}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Badge tone="info" dot>
                Syncing
              </Badge>
            ) : (
              <Badge tone="success" dot>
                Connected
              </Badge>
            )}
            <Button
              size="sm"
              isLoading={isRunning}
              disabled={isRunning}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => start.mutate()}
            >
              {isRunning ? 'Syncing…' : 'Sync now'}
            </Button>
          </div>
        </CardHeader>

        <CardBody className="space-y-5">
          {start.isError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {(start.error as Error).message}
            </div>
          )}

          {/* Live progress */}
          {isRunning && status && (
            <div className="space-y-2 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
              {status.total === 0 ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching employee master from ZingHR…
                </span>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-brand-700">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {status.processed.toLocaleString()} / {status.total.toLocaleString()} processed
                    </span>
                    <span className="font-semibold text-brand-700">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-100">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                    <span className="text-emerald-600">+{status.inserted} inserted</span>
                    <span className="text-sky-600">↻ {status.updated} updated</span>
                    <span>{status.skipped} skipped</span>
                    {status.failed > 0 && <span className="text-red-500">✗ {status.failed} failed</span>}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Last completed stats */}
          {status && !isRunning && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Metric label="Total"    value={status.total} />
              <Metric label="Inserted" value={status.inserted} tone="emerald" />
              <Metric label="Updated"  value={status.updated}  tone="sky" />
              <Metric label="Skipped"  value={status.skipped}  tone="slate" />
              <Metric label="Failed"   value={status.failed}   tone="red" />
            </div>
          )}

          {/* Live terminal */}
          {status && (status.logs?.length > 0 || isRunning) && (
            <SyncTerminal lines={status.logs ?? []} running={isRunning} />
          )}

          {/* Recent runs — collapsible */}
          {(logs?.length ?? 0) > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <span>Recent sync runs ({logs?.length ?? 0})</span>
                {showHistory ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {showHistory && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                  <DataTable
                    columns={historyColumns}
                    data={logs ?? []}
                    rowKey={(l) => l.id}
                    isLoading={logsLoading}
                    emptyMessage="No sync runs yet."
                  />
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ServiceCard({
  icon,
  iconColor,
  name,
  sub,
  connected,
  loading = false,
  meta,
  action,
}: {
  icon: ReactNode;
  iconColor: string;
  name: string;
  sub: string;
  connected: boolean;
  loading?: boolean;
  meta: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconColor)}>
          {icon}
        </span>
        {loading ? (
          <Spinner size={18} />
        ) : connected ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-amber-500" />
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-800">{name}</p>
        <p className="text-xs text-slate-400">{sub}</p>
        <p className={cn('mt-1.5 text-xs', connected ? 'text-slate-500' : 'text-amber-600')}>
          {meta}
        </p>
      </div>
      {action}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'emerald' | 'sky' | 'slate' | 'red';
}) {
  const colors = {
    emerald: 'text-emerald-600',
    sky:     'text-sky-600',
    slate:   'text-slate-800',
    red:     'text-red-500',
  };
  return (
    <div className="rounded-xl border border-slate-200 p-3 text-center">
      <p className={cn('text-xl font-semibold', colors[tone])}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function statusTone(status: string): BadgeTone {
  if (status === 'success') return 'success';
  if (status === 'failed')  return 'danger';
  return 'warning';
}
