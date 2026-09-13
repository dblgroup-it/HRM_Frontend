import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Database,
  Globe,
  History,
  Search,
  Server,
  User as UserIcon,
  Wrench,
  X,
} from 'lucide-react';

import {
  Badge,
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

import { useAuditFilters, useAuditLog } from '../hooks/useAudit';
import type { AuditChange, AuditEntry } from '../types/audit.types';

/** Where an entry came from — it changes how much detail it carries. */
const SOURCE_META = {
  db: { label: 'Data change', icon: Database, tone: 'text-brand-600 bg-brand-50' },
  http: { label: 'Request', icon: Globe, tone: 'text-slate-600 bg-slate-100' },
  system: { label: 'System', icon: Server, tone: 'text-violet-600 bg-violet-50' },
} as const;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/**
 * Record types in the words the business uses.
 *
 * The log stores the model name because that is stable to filter on, but
 * "MedicalExam" is developer vocabulary — an HR manager reading who changed a
 * salary should see "Medical examination".
 */
const ENTITY_LABELS: Record<string, string> = {
  User: 'User account',
  Role: 'Role',
  RoleAssignment: 'Role assignment',
  Unit: 'Unit',
  Department: 'Department',
  Position: 'Sanctioned post',
  Requisition: 'Requisition',
  ApprovalStep: 'Approval step',
  ApprovalPath: 'Approval path',
  ApprovalPathLevel: 'Approval level',
  Candidate: 'Candidate',
  InterviewRound: 'Interview',
  InterviewDelegation: 'Interview assignment',
  Evaluation: 'Interview evaluation',
  SalaryFixation: 'Salary fixation',
  Onboarding: 'Onboarding',
  MedicalExam: 'Medical examination',
  BoardApproval: 'Board approval',
  BoardApprovalBatch: 'Approval sheet',
  BoardGroup: 'Board group',
  Setting: 'System setting',
  MasterOption: 'Dropdown option',
  Employee: 'Employee records',
};

const entityLabel = (e: string) => ENTITY_LABELS[e] ?? e;

/** Verbs as a person would say them. */
const ACTION_LABELS: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  saved: 'Saved',
  deleted: 'Deleted',
  synced: 'Synced',
  attempted: 'Attempted',
  submitted: 'Submitted',
  changed: 'Changed',
  removed: 'Removed',
  'sync failed': 'Sync failed',
};

const actionLabel = (a: string) =>
  ACTION_LABELS[a] ?? a.replace(/^./, (c) => c.toUpperCase());

/** camelCase → "Camel case", for field names shown to a person. */
const humanField = (f: string) =>
  f
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const showValue = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
};

/**
 * The system activity log.
 *
 * Super users only — enforced by the API, not by hiding the nav item. Reads
 * are not logged, so everything here is something that changed.
 */
export default function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actorId, setActorId] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const debounced = useDebounce(search, 300);

  const query = useMemo(
    () => ({
      page,
      pageSize: 50,
      search: debounced.trim() || undefined,
      actorId: actorId || undefined,
      entity: entity || undefined,
      action: action || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, debounced, actorId, entity, action, from, to],
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAuditLog(query);
  const { data: filters } = useAuditFilters();

  const active = Boolean(
    debounced.trim() || actorId || entity || action || from || to,
  );
  const clear = () => {
    setSearch('');
    setActorId('');
    setEntity('');
    setAction('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  // Any filter change restarts paging — page 7 of the old result set is
  // meaningless against a new one.
  const onFilter = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(1);
  };

  const rows = data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="System Activity"
        description="Every change made in the system — who did it, when, and what changed. Viewing records is not logged; only changes are."
      />

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-card">
        {/* Search gets the width it needs; the four filters share the rest and
            wrap rather than squeezing each other. */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <Input
              placeholder="Search person, record or summary…"
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={actorId}
            onChange={(e) => onFilter(setActorId)(e.target.value)}
            options={[
              { value: '', label: 'Anyone' },
              ...(filters?.actors ?? []).map((a) => ({
                value: a.value,
                label: `${a.label} (${a.count})`,
              })),
            ]}
          />
          <Select
            value={entity}
            onChange={(e) => onFilter(setEntity)(e.target.value)}
            options={[
              { value: '', label: 'Any record type' },
              ...(filters?.entities ?? []).map((x) => ({
                value: x.value,
                label: `${entityLabel(x.value)} (${x.count})`,
              })),
            ]}
          />
          <Select
            value={action}
            onChange={(e) => onFilter(setAction)(e.target.value)}
            options={[
              { value: '', label: 'Any action' },
              ...(filters?.actions ?? []).map((x) => ({
                value: x.value,
                label: `${actionLabel(x.value)} (${x.count})`,
              })),
            ]}
          />
          {/* min-w-0 matters: a date input carries an intrinsic minimum width
              and a flex item will not shrink below it, so without this the
              pair overflows the card on narrower screens. */}
          <div className="flex min-w-0 items-center gap-1.5 sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <input
              type="date"
              aria-label="From date"
              value={from}
              onChange={(e) => onFilter(setFrom)(e.target.value)}
              className="w-full min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-brand-400 focus:outline-none"
            />
            <span className="shrink-0 text-xs text-slate-400">to</span>
            <input
              type="date"
              aria-label="To date"
              value={to}
              onChange={(e) => onFilter(setTo)(e.target.value)}
              className="w-full min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-brand-400 focus:outline-none"
            />
          </div>
        </div>

        {active && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {data?.meta.total ?? 0} matching{' '}
              {(data?.meta.total ?? 0) === 1 ? 'entry' : 'entries'}
            </span>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError ? (
        <ErrorCard
          title="Couldn't load the activity log"
          message={(error as Error)?.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60">
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title={active ? 'Nothing matches those filters' : 'Nothing logged yet'}
            description={
              active
                ? 'Try widening the date range or clearing a filter.'
                : 'Changes made from now on will appear here.'
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card">
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <LogRow key={row.id} row={row} />
            ))}
          </div>
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          pageSize={data.meta.pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function LogRow({ row }: { row: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const meta = SOURCE_META[row.source] ?? SOURCE_META.http;
  const Icon = meta.icon;
  const failed = (row.statusCode ?? 200) >= 400;
  const hasDetail = row.changes.length > 0 || Boolean(row.path);

  return (
    <div className={cn(failed && 'bg-rose-50/40')}>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={cn(
          // Wraps instead of overflowing: on a narrow screen the time and
          // actor drop onto their own line rather than crushing the summary.
          'flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left transition-colors',
          hasDetail && 'hover:bg-slate-50',
        )}
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
            meta.tone,
          )}
          title={meta.label}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>

        <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400 sm:w-32">
          {fmtTime(row.createdAt)}
        </span>

        <span className="flex min-w-0 shrink-0 items-center gap-1.5 text-sm sm:w-44">
          {row.actorType === 'system' ? (
            <Server className="h-3 w-3 shrink-0 text-violet-400" />
          ) : row.actorType === 'public' ? (
            <Globe className="h-3 w-3 shrink-0 text-amber-400" />
          ) : (
            <UserIcon className="h-3 w-3 shrink-0 text-slate-300" />
          )}
          <span className="truncate font-medium text-slate-800">
            {row.actorName}
          </span>
        </span>

        {/* basis-full, not w-full: flex-1 sets flex-basis:0 and would win over
            a width, leaving this crushed to a few pixels on a phone. */}
        <span className="min-w-0 basis-full text-sm text-slate-600 sm:flex-1 sm:basis-auto sm:truncate">
          <span className="font-semibold text-slate-800">
            {actionLabel(row.action)}
          </span>{' '}
          <span className="text-slate-600">{entityLabel(row.entity)}</span>
          {row.entityLabel && (
            <span className="text-slate-800"> — {row.entityLabel}</span>
          )}
        </span>

        {row.changes.length > 0 && (
          <Badge tone="neutral" className="shrink-0">
            {row.changes.length} field
            {row.changes.length === 1 ? '' : 's'}
          </Badge>
        )}
        {failed && (
          <Badge tone="danger" className="shrink-0">
            {row.statusCode}
          </Badge>
        )}

        {hasDetail && (
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-slate-300 transition-transform',
              open && 'rotate-180 text-brand-500',
            )}
          />
        )}
      </button>

      {open && (
        <div className="animate-branch-open space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:pl-14">
          {row.changes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-xs">
                <thead>
                  <tr className="text-left uppercase tracking-wider text-slate-400">
                    <th className="pb-1.5 pr-4 font-medium">Field</th>
                    <th className="pb-1.5 pr-4 font-medium">From</th>
                    <th className="pb-1.5 font-medium">To</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {row.changes.map((c: AuditChange, i: number) => (
                    <tr key={`${c.field}-${i}`} className="border-t border-slate-200/70">
                      <td className="py-1.5 pr-4 font-medium text-slate-700">
                        {humanField(c.field)}
                      </td>
                      <td className="py-1.5 pr-4 text-slate-500 line-through decoration-slate-300">
                        {showValue(c.from)}
                      </td>
                      <td className="py-1.5 font-medium text-slate-900">
                        {showValue(c.to)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* The route, record id and request id are diagnostics, not the
              record of what happened. Kept for tracing a failure, tucked
              behind a toggle so the log reads as a business document. */}
          <TechnicalDetails row={row} />
        </div>
      )}
    </div>
  );
}

/** The plumbing behind an entry — useful when tracing, noise otherwise. */
function TechnicalDetails({ row }: { row: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const bits = [
    row.ip ? `IP ${row.ip}` : null,
    row.entityId ? `Record ${row.entityId}` : null,
    row.path ? `${row.method} ${row.path}` : null,
    row.requestId ? `Request ${row.requestId.slice(0, 8)}` : null,
  ].filter(Boolean) as string[];
  if (!bits.length) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[0.6875rem] text-slate-400 transition-colors hover:text-slate-600"
      >
        <Wrench className="h-3 w-3" />
        {open ? 'Hide technical details' : 'Technical details'}
      </button>
      {open && (
        <p className="mt-1 break-all font-mono text-[0.6875rem] leading-5 text-slate-400">
          {bits.join('  ·  ')}
        </p>
      )}
    </div>
  );
}
