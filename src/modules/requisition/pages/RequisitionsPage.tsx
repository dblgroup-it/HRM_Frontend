import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Search, Clock, CheckCircle2, Send } from 'lucide-react';

import {
  Card,
  Button,
  Input,
  Pagination,
  PageHeader,
  Select,
  StatCard,
} from '@shared/components/ui';
import { useDebounce } from '@shared/hooks';
import type { SelectOption } from '@shared/types';
import { ROUTES } from '@app/router/paths';

import { useRequisitions } from '../hooks/useRequisitions';
import { RequisitionTable } from '../components/RequisitionTable';
import { UNIT_OPTIONS, STATUS_CONFIG } from '../constants';
import type { RequisitionStatus } from '../types/requisition.types';

const PAGE_SIZE = 8;

const STATUS_OPTIONS: SelectOption[] = [
  { label: 'All statuses', value: 'all' },
  ...Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  })),
];

const UNIT_FILTER_OPTIONS: SelectOption[] = [
  { label: 'All units', value: 'all' },
  ...UNIT_OPTIONS,
];

export default function RequisitionsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [unitFactory, setUnitFactory] = useState('all');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 350);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: status as RequisitionStatus | 'all',
      unitFactory,
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, status, unitFactory, page]
  );

  const { data, isLoading, isFetching } = useRequisitions(filters);
  const resetPage = () => setPage(1);

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Requisitions"
          value={data?.meta.total ?? '—'}
          icon={ClipboardList}
          accent="brand"
        />
        <StatCard label="Pending Approval" value="1" icon={Clock} accent="amber" />
        <StatCard label="Approved" value="3" icon={CheckCircle2} accent="sky" />
        <StatCard label="Posted" value="1" icon={Send} accent="emerald" />
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_220px_220px]">
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
            options={UNIT_FILTER_OPTIONS}
            value={unitFactory}
            onChange={(e) => {
              setUnitFactory(e.target.value);
              resetPage();
            }}
          />
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              resetPage();
            }}
          />
        </div>

        <RequisitionTable
          requisitions={data?.items ?? []}
          isLoading={isLoading || isFetching}
        />

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
