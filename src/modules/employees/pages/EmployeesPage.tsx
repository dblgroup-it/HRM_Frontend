import { useMemo, useState } from 'react';
import { Plus, Users, UserCheck, ClipboardList, Building2 } from 'lucide-react';

import {
  Button,
  Card,
  PageHeader,
  Pagination,
  StatCard,
} from '@shared/components/ui';
import { useDebounce } from '@shared/hooks';

import { useEmployees } from '../hooks/useEmployees';
import { EmployeeTable } from '../components/EmployeeTable';
import { EmployeeFilters } from '../components/EmployeeFilters';
import type { EmploymentStatus } from '../types/employee.types';
import { useDashboard } from '@modules/dashboard/hooks/useDashboard';

const PAGE_SIZE = 50;

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Workforce"
          value={dashboard?.summary.totalEmployees ?? '—'}
          icon={Users}
          accent="brand"
        />
        <StatCard
          label="Active Employees"
          value={dashboard?.summary.activeEmployees ?? '—'}
          icon={UserCheck}
          accent="emerald"
        />
        <StatCard
          label="Open Requisitions"
          value={dashboard?.summary.openRequisitions ?? '—'}
          icon={ClipboardList}
          accent="amber"
        />
        <StatCard
          label="Vacant Seats"
          value={dashboard?.summary.vacantSeats ?? '—'}
          icon={Building2}
          accent="violet"
        />
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
