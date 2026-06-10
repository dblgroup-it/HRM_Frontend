import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Users,
  UserCheck,
  ClipboardList,
  Building2,
  type LucideIcon,
} from 'lucide-react';

import { Button, Card, PageHeader, Pagination } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatCompact } from '@shared/utils';
import { useDebounce } from '@shared/hooks';

import { useEmployees } from '../hooks/useEmployees';
import { EmployeeTable } from '../components/EmployeeTable';
import { EmployeeFilters } from '../components/EmployeeFilters';
import type { EmploymentStatus } from '../types/employee.types';
import { useDashboard } from '@modules/dashboard/hooks/useDashboard';

const PAGE_SIZE = 50;

export default function EmployeesPage() {
  const [params] = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const [search, setSearch] = useState(urlQuery);
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  // Drive the search from the top-bar global search (?q=…).
  useEffect(() => {
    setSearch(urlQuery);
    setPage(1);
  }, [urlQuery]);

  const debouncedSearch = useDebounce(search, 350);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      department,
      status: status as EmploymentStatus | 'all',
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, department, status, page]
  );

  const { data, isLoading, isFetching } = useEmployees(filters);
  const { data: dashboard } = useDashboard();

  const resetToFirstPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage your organisation’s workforce and records."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />}>Add employee</Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Total Workforce" value={dashboard?.summary.totalEmployees} icon={Users} tone="brand" />
        <StatTile label="Active Employees" value={dashboard?.summary.activeEmployees} icon={UserCheck} tone="emerald" />
        <StatTile label="Open Requisitions" value={dashboard?.summary.openRequisitions} icon={ClipboardList} tone="amber" />
        <StatTile label="Vacant Seats" value={dashboard?.summary.vacantSeats} icon={Building2} tone="violet" />
      </div>

      <Card>
        <div className="border-b border-slate-100 p-4">
          <EmployeeFilters
            search={search}
            department={department}
            status={status}
            onSearchChange={(v) => {
              setSearch(v);
              resetToFirstPage();
            }}
            onDepartmentChange={(v) => {
              setDepartment(v);
              resetToFirstPage();
            }}
            onStatusChange={(v) => {
              setStatus(v);
              resetToFirstPage();
            }}
          />
        </div>

        <EmployeeTable
          employees={data?.items ?? []}
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

type Tone = 'brand' | 'emerald' | 'amber' | 'violet';
const STAT_TONE: Record<Tone, { card: string; chip: string; value: string }> = {
  brand: { card: 'from-brand-50 to-white border-brand-100', chip: 'bg-brand-100 text-brand-700', value: 'text-brand-900' },
  emerald: { card: 'from-emerald-50 to-white border-emerald-100', chip: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-900' },
  amber: { card: 'from-amber-50 to-white border-amber-100', chip: 'bg-amber-100 text-amber-700', value: 'text-amber-900' },
  violet: { card: 'from-violet-50 to-white border-violet-100', chip: 'bg-violet-100 text-violet-700', value: 'text-violet-900' },
};

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value?: number;
  icon: LucideIcon;
  tone: Tone;
}) {
  const t = STAT_TONE[tone];
  return (
    <div className={cn('rounded-2xl border bg-gradient-to-br p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5', t.card)}>
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10', t.chip)}>
        <Icon className="h-5 w-5" />
      </span>
      <p className={cn('mt-3 text-2xl font-bold tracking-tight sm:text-3xl', t.value)}>
        {value === undefined ? '—' : formatCompact(value)}
      </p>
      <p className="mt-0.5 text-xs font-medium text-slate-600 sm:text-sm">{label}</p>
    </div>
  );
}
