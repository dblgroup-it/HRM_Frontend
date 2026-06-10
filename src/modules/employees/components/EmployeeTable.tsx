import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight } from 'lucide-react';

import { Avatar, DataTable, Skeleton, type Column } from '@shared/components/ui';
import { formatDate } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import type { Employee } from '../types/employee.types';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';

interface Props {
  employees: Employee[];
  isLoading: boolean;
}

export function EmployeeTable({ employees, isLoading }: Props) {
  const navigate = useNavigate();
  const open = (e: Employee) => navigate(ROUTES.employeeDetail(e.id));

  const columns: Column<Employee>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (e) => (
        <div className="flex items-center gap-3">
          <Avatar name={e.name} src={e.avatarUrl} size="sm" />
          <div>
            <p className="font-medium text-slate-800">{e.name}</p>
            <p className="text-xs text-slate-400">{e.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'jobTitle',
      header: 'Designation',
      render: (e) => (
        <div>
          <p className="text-slate-700">{e.jobTitle}</p>
          {e.category && <p className="text-xs text-slate-400">{e.category}</p>}
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (e) => (
        <div>
          <p className="text-slate-700">{e.department}</p>
          {e.section && e.section !== e.department && (
            <p className="text-xs text-slate-400">{e.section}</p>
          )}
        </div>
      ),
    },
    { key: 'location', header: 'Unit', render: (e) => e.location },
    { key: 'grade', header: 'Grade', align: 'center', render: (e) => e.grade ?? '—' },
    { key: 'joinedAt', header: 'Joined', render: (e) => formatDate(e.joinedAt) },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <EmployeeStatusBadge status={e.status} />,
    },
  ];

  return (
    <>
      {/* Desktop / tablet — table */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={employees}
          rowKey={(e) => e.id}
          isLoading={isLoading}
          emptyMessage="No employees match your filters."
          onRowClick={open}
        />
      </div>

      {/* Mobile — cards */}
      <div className="space-y-2.5 p-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-2xl" />
          ))
        ) : employees.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No employees match your filters.
          </p>
        ) : (
          employees.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => open(e)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition active:scale-[0.99] hover:border-slate-300 hover:shadow-sm"
            >
              <Avatar name={e.name} src={e.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {e.name}
                  </p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    {e.employeeCode}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">{e.jobTitle}</p>
                <p className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-slate-400">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {e.department}
                    {e.location && e.location !== '—' ? ` · ${e.location}` : ''}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <EmployeeStatusBadge status={e.status} />
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}
