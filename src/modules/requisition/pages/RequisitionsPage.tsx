import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Plus,
  Search,
  Send,
  type LucideIcon,
} from 'lucide-react';

import {
  Button,
  Card,
  Input,
  Pagination,
  PageHeader,
  Select,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useDebounce } from '@shared/hooks';
import { formatCompact } from '@shared/utils';
import type { SelectOption } from '@shared/types';
import { ROUTES } from '@app/router/paths';
import { useOrganogramUnits } from '@modules/organogram';

import { useRequisitions } from '../hooks/useRequisitions';
import { RequisitionTable } from '../components/RequisitionTable';
import { STATUS_CONFIG } from '../constants';
import type { RequisitionStatus } from '../types/requisition.types';

const PAGE_SIZE = 8;

type Tone = 'brand' | 'amber' | 'sky' | 'emerald';
const STAT_TONE: Record<Tone, { card: string; chip: string; value: string }> = {
  brand: { card: 'from-brand-50 to-white border-brand-100', chip: 'bg-brand-100 text-brand-700', value: 'text-brand-900' },
  amber: { card: 'from-amber-50 to-white border-amber-100', chip: 'bg-amber-100 text-amber-700', value: 'text-amber-900' },
  sky: { card: 'from-sky-50 to-white border-sky-100', chip: 'bg-sky-100 text-sky-700', value: 'text-sky-900' },
  emerald: { card: 'from-emerald-50 to-white border-emerald-100', chip: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-900' },
};

const STATUS_CHIPS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  ...Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({ key, label: cfg.label })),
];

export default function RequisitionsPage() {
  const navigate = useNavigate();
  const { data: orgUnits } = useOrganogramUnits();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [unitFactory, setUnitFactory] = useState('all');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 350);
  const resetPage = () => setPage(1);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: status as RequisitionStatus | 'all',
      unitFactory,
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, status, unitFactory, page],
  );
  const { data, isLoading, isFetching } = useRequisitions(filters);

  // Separate fetch (ignores the status filter) so the tiles + chips show live
  // counts per status regardless of what's currently filtered.
  const countFilters = useMemo(
    () => ({
      search: debouncedSearch,
      status: 'all' as const,
      unitFactory,
      page: 1,
      pageSize: 1000,
    }),
    [debouncedSearch, unitFactory],
  );
  const { data: allData } = useRequisitions(countFilters);

  const counts = useMemo(() => {
    const items = allData?.items ?? [];
    const byStatus: Record<string, number> = {};
    for (const r of items) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    return {
      total: allData?.meta.total ?? 0,
      byStatus,
      pending: byStatus['pending_approval'] ?? 0,
      approved: (byStatus['approved'] ?? 0) + (byStatus['profile_generated'] ?? 0),
      posted: byStatus['posted'] ?? 0,
    };
  }, [allData]);

  const unitFilterOptions: SelectOption[] = [
    { label: 'All accessible units', value: 'all' },
    ...(orgUnits ?? []).map((unit) => ({ label: unit.unit, value: unit.unit })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manpower Requisitions"
        description="Phase 1 · Raise, approve, profile and post hiring requisitions."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.requisitionNew)}
          >
            New requisition
          </Button>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Total Requisitions" value={counts.total} icon={ClipboardList} tone="brand" />
        <StatTile label="Pending Approval" value={counts.pending} icon={Clock} tone="amber" />
        <StatTile label="Approved" value={counts.approved} icon={CheckCircle2} tone="sky" />
        <StatTile label="Posted" value={counts.posted} icon={Send} tone="emerald" />
      </div>

      <Card>
        {/* Search + unit */}
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_240px]">
          <Input
            placeholder="Search designation, code, unit…"
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
          <Select
            options={unitFilterOptions}
            value={unitFactory}
            onChange={(e) => {
              setUnitFactory(e.target.value);
              resetPage();
            }}
          />
        </div>

        {/* Status filter chips */}
        <div className="scrollbar-thin flex gap-1.5 overflow-x-auto px-4 pb-3">
          {STATUS_CHIPS.map((c) => {
            const count = c.key === 'all' ? counts.total : counts.byStatus[c.key] ?? 0;
            const active = status === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setStatus(c.key);
                  resetPage();
                }}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                  active
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {c.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] font-semibold',
                    active ? 'bg-white/20' : 'bg-white text-slate-500',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-slate-100">
          <RequisitionTable
            requisitions={data?.items ?? []}
            isLoading={isLoading || isFetching}
          />
        </div>

        {data && data.meta.total > 0 && (
          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            pageSize={data.meta.pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: Tone;
}) {
  const t = STAT_TONE[tone];
  return (
    <div
      className={cn(
        'rounded-2xl border bg-gradient-to-br p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5',
        t.card,
      )}
    >
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10', t.chip)}>
        <Icon className="h-5 w-5" />
      </span>
      <p className={cn('mt-3 text-2xl font-bold tracking-tight sm:text-3xl', t.value)}>
        {formatCompact(value)}
      </p>
      <p className="mt-0.5 text-xs font-medium text-slate-600 sm:text-sm">{label}</p>
    </div>
  );
}
