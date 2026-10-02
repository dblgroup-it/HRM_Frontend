import { useState } from 'react';
import {
  AlertOctagon,
  ChevronDown,
  Clock,
  Copy,
  Monitor,
  Search,
  ServerCrash,
  ShieldAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  EmptyState,
  ErrorCard,
  Input,
  PageHeader,
  Pagination,
  Select,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useDebounce } from '@shared/hooks';

import type { ApiLogRow } from '../api/system.api';
import { useApiLogs, useApiLogSummary } from '../hooks/useSystem';

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

function statusTone(row: ApiLogRow) {
  if (row.source === 'browser') return 'bg-violet-50 text-violet-700 ring-violet-200';
  if (row.kind === 'slow') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if ((row.status ?? 0) >= 500) return 'bg-rose-50 text-rose-700 ring-rose-200';
  return 'bg-orange-50 text-orange-700 ring-orange-200';
}

function statusLabel(row: ApiLogRow) {
  if (row.source === 'browser') return 'Browser';
  if (row.kind === 'slow') return 'Slow';
  return String(row.status ?? '—');
}

/**
 * API errors and slow calls — from the server and from users' browsers.
 *
 * The question this page answers is "did something break, for whom, and
 * where": the last day's counts first, the paths failing most, then every
 * row, each opening onto its message, stack and request id. Kept 30 days.
 */
export default function ApiLogsPage() {
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const q = useDebounce(search, 300);

  const summary = useApiLogSummary();
  const logs = useApiLogs({
    source: source || undefined,
    status: status || undefined,
    kind: kind || undefined,
    search: q || undefined,
    page,
    pageSize: 50,
  });

  const s = summary.data?.last24h;
  const tiles: { label: string; value: number | undefined; icon: LucideIcon; tone: string; apply: () => void }[] = [
    { label: 'Server errors (5xx)', value: s?.serverErrors, icon: ServerCrash, tone: 'text-rose-600 bg-rose-50', apply: () => { setStatus('5xx'); setSource('api'); setKind(''); setPage(1); } },
    { label: 'Refused / not found (4xx)', value: s?.clientErrors, icon: ShieldAlert, tone: 'text-orange-600 bg-orange-50', apply: () => { setStatus('4xx'); setSource('api'); setKind(''); setPage(1); } },
    { label: 'Browser errors', value: s?.browserErrors, icon: Monitor, tone: 'text-violet-600 bg-violet-50', apply: () => { setSource('browser'); setStatus(''); setKind(''); setPage(1); } },
    { label: 'Slow calls (≥ 3 s)', value: s?.slow, icon: Clock, tone: 'text-amber-600 bg-amber-50', apply: () => { setKind('slow'); setStatus(''); setSource('api'); setPage(1); } },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="API Logs"
        description="Every failed or slow request, and every error in a user's browser. Kept 30 days; refreshes every 30 seconds."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={t.apply}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-200 hover:shadow-sm"
          >
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', t.tone)}>
              <t.icon className="h-4 w-4" />
            </span>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
              {t.value ?? '—'}
            </p>
            <p className="text-xs text-slate-500">{t.label} · last 24 h</p>
          </button>
        ))}
      </div>

      {(summary.data?.topFailing.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Failing most · last 24 h
          </p>
          <ul className="divide-y divide-slate-100">
            {summary.data!.topFailing.map((t, i) => (
              <li key={i} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-slate-900">
                  {t.count}×
                </span>
                <span className="w-12 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-center text-[0.6875rem] font-semibold text-slate-600">
                  {t.status}
                </span>
                <button
                  type="button"
                  onClick={() => { setSearch(t.path ?? ''); setSource('api'); setStatus(''); setKind(''); setPage(1); }}
                  className="min-w-0 truncate text-left font-mono text-xs text-slate-700 hover:text-brand-700"
                  title={t.path ?? ''}
                >
                  {t.method} {t.path}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-1 gap-2 border-b border-slate-100 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem]">
          <Input
            placeholder="Search path, message, user or request id…"
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <Select
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All sources' }, { value: 'api', label: 'Server' }, { value: 'browser', label: 'Browser' }]}
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'Any status' }, { value: '5xx', label: '5xx' }, { value: '4xx', label: '4xx' }]}
          />
          <Select
            value={kind}
            onChange={(e) => { setKind(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'Errors + slow' }, { value: 'error', label: 'Errors' }, { value: 'slow', label: 'Slow' }]}
          />
        </div>

        {logs.isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : logs.isError ? (
          <ErrorCard className="m-4" message={(logs.error as Error).message} onRetry={() => void logs.refetch()} />
        ) : (logs.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<AlertOctagon className="h-6 w-6" />}
            title="Nothing logged"
            description="No errors or slow calls match these filters."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.data!.items.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setOpen(open === row.id ? null : row.id)}
                  className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 sm:grid-cols-[8.5rem_4.5rem_minmax(0,1fr)_10rem_4.5rem_1rem]"
                >
                  <span className="hidden text-xs tabular-nums text-slate-500 sm:block">{fmtTime(row.createdAt)}</span>
                  <span className={cn('rounded-md px-1.5 py-0.5 text-center text-[0.6875rem] font-bold ring-1', statusTone(row))}>
                    {statusLabel(row)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs text-slate-800" title={row.path ?? ''}>
                      {row.method ? `${row.method} ` : ''}{row.path ?? '—'}
                    </span>
                    {row.message && (
                      <span className="block truncate text-xs text-slate-500" title={row.message}>
                        {row.message}
                      </span>
                    )}
                    <span className="block text-[0.6875rem] text-slate-400 sm:hidden">
                      {fmtTime(row.createdAt)}{row.userName ? ` · ${row.userName}` : ''}
                    </span>
                  </span>
                  <span className="hidden truncate text-xs text-slate-600 sm:block" title={row.userName ?? ''}>
                    {row.userName ?? <span className="text-slate-400">not signed in</span>}
                  </span>
                  <span className="hidden text-right text-xs tabular-nums text-slate-500 sm:block">
                    {row.durationMs != null ? `${row.durationMs} ms` : ''}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', open === row.id && 'rotate-180')} />
                </button>
                {open === row.id && <LogDetail row={row} />}
              </li>
            ))}
          </ul>
        )}

        {logs.data && logs.data.total > logs.data.pageSize && (
          <Pagination
            page={logs.data.page}
            totalPages={Math.ceil(logs.data.total / logs.data.pageSize)}
            total={logs.data.total}
            pageSize={logs.data.pageSize}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}

function LogDetail({ row }: { row: ApiLogRow }) {
  const facts: [string, string | null][] = [
    ['When', new Date(row.createdAt).toLocaleString('en-GB')],
    ['User', row.userName],
    ['Request id', row.requestId],
    ['IP', row.ip],
    ['Duration', row.durationMs != null ? `${row.durationMs} ms` : null],
    ['Browser', row.userAgent],
  ];
  const copy = () => {
    void navigator.clipboard.writeText(
      [`${row.method ?? ''} ${row.path ?? ''} → ${row.status ?? row.source}`, row.message, row.stack]
        .filter(Boolean)
        .join('\n\n'),
    );
    toast.success('Copied');
  };
  return (
    <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        {facts.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex min-w-0 gap-2">
            <dt className="w-20 shrink-0 text-slate-400">{k}</dt>
            <dd className="min-w-0 break-words text-slate-700">{v}</dd>
          </div>
        ))}
      </dl>
      {row.message && (
        <p className="whitespace-pre-wrap break-words rounded-lg bg-white px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200">
          {row.message}
        </p>
      )}
      {row.stack && (
        <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 px-3 py-2 text-[0.6875rem] leading-relaxed text-slate-100">
          {row.stack}
        </pre>
      )}
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        <Copy className="h-3.5 w-3.5" /> Copy for a bug report
      </button>
    </div>
  );
}
