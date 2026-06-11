import { useEffect, useRef } from 'react';
import { RefreshCw, CloudDownload, AlertTriangle, Loader2 } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataTable,
  PageHeader,
  type BadgeTone,
  type Column,
} from '@shared/components/ui';
import { formatDate } from '@shared/utils';

import {
  useRefreshAfterSync,
  useStartSync,
  useSyncStatus,
  useZingHrLogs,
} from '../hooks/useZingHr';
import { SyncTerminal } from '../components/SyncTerminal';
import { AutomationPanel } from '../components/AutomationPanel';
import type { ZingHrSyncLog } from '../types/zinghr.types';

export default function IntegrationsPage() {
  const start = useStartSync();
  const { data: status } = useSyncStatus();
  const { data: logs, isLoading } = useZingHrLogs();
  const refreshAfterSync = useRefreshAfterSync();

  const isRunning = status?.status === 'running' || start.isPending;
  const prevStatus = useRef<string | undefined>(undefined);

  // When a run finishes (running -> done), refresh dependent data.
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

  const columns: Column<ZingHrSyncLog>[] = [
    {
      key: 'startedAt',
      header: 'Run',
      render: (l) => formatDate(l.startedAt, 'dd MMM yyyy, p'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => (
        <Badge tone={statusTone(l.status)} dot>
          {l.status}
        </Badge>
      ),
    },
    { key: 'total', header: 'Total', align: 'right', render: (l) => l.total },
    { key: 'inserted', header: 'Inserted', align: 'right', render: (l) => l.inserted },
    { key: 'updated', header: 'Updated', align: 'right', render: (l) => l.updated },
    { key: 'skipped', header: 'Skipped', align: 'right', render: (l) => l.skipped },
    { key: 'failed', header: 'Failed', align: 'right', render: (l) => l.failed },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="External systems connected to the HRM platform."
      />

      <AutomationPanel />

      <Card>
        <CardHeader>
          <CardTitle>ZingHR · Employee Sync</CardTitle>
          <Badge tone="success" dot>
            Connected
          </Badge>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <CloudDownload className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Pull the employee master from ZingHR
                </p>
                <p className="text-sm text-slate-500">
                  Imports new joiners and updates existing employee profiles.
                  Runs daily; trigger it manually here.
                </p>
              </div>
            </div>
            <Button
              isLoading={isRunning}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => start.mutate()}
              disabled={isRunning}
            >
              {isRunning ? 'Syncing…' : 'Sync now'}
            </Button>
          </div>

          {start.isError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {(start.error as Error).message}
            </div>
          )}

          {/* Live progress */}
          {status && (status.status === 'running' || start.isPending) && (
            <div className="space-y-2 rounded-lg border border-brand-100 bg-brand-50/40 p-4">
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
                      Processing {status.processed.toLocaleString()} /{' '}
                      {status.total.toLocaleString()}
                    </span>
                    <span className="text-brand-700">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-100">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>inserted {status.inserted}</span>
                    <span>updated {status.updated}</span>
                    <span>skipped {status.skipped}</span>
                    <span>failed {status.failed}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Last completed result */}
          {status && status.status !== 'running' && !start.isPending && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Metric label="Total" value={status.total} />
              <Metric label="Inserted" value={status.inserted} tone="emerald" />
              <Metric label="Updated" value={status.updated} tone="sky" />
              <Metric label="Skipped" value={status.skipped} tone="slate" />
              <Metric label="Failed" value={status.failed} tone="red" />
            </div>
          )}

          {/* Live terminal log */}
          {status && (status.logs?.length > 0 || isRunning) && (
            <SyncTerminal lines={status.logs ?? []} running={isRunning} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Runs</CardTitle>
        </CardHeader>
        <DataTable
          columns={columns}
          data={logs ?? []}
          rowKey={(l) => l.id}
          isLoading={isLoading}
          emptyMessage="No sync runs yet — trigger one above."
        />
      </Card>
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
    sky: 'text-sky-600',
    slate: 'text-slate-800',
    red: 'text-red-600',
  };
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <p className={`text-xl font-semibold ${colors[tone]}`}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function statusTone(status: string): BadgeTone {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'danger';
  return 'warning';
}
