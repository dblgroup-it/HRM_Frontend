import { useNavigate } from 'react-router-dom';

import { Avatar, DataTable, type Column } from '@shared/components/ui';
import { formatCurrency, formatDate } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import type { Employee } from '../types/employee.types';
import { EMPLOYMENT_TYPE_LABEL } from '../constants';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';

interface Props {
  employees: Employee[];
  isLoading: boolean;
}

export function EmployeeTable({ employees, isLoading }: Props) {
  const navigate = useNavigate();

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
      header: 'Job Title',
      render: (e) => (
        <div>
          <p className="text-slate-700">{e.jobTitle}</p>
          <p className="text-xs text-slate-400">
            {EMPLOYMENT_TYPE_LABEL[e.employmentType]}
          </p>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (e) => e.department,
    },
    {
      key: 'location',
      header: 'Location',
      render: (e) => e.location,
    },
    {
      key: 'salary',
      header: 'Salary',
      align: 'right',
      render: (e) => (
        <span className="font-medium text-slate-700">
          {formatCurrency(e.salary)}
        </span>
      ),
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      render: (e) => formatDate(e.joinedAt),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <EmployeeStatusBadge status={e.status} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={employees}
      rowKey={(e) => e.id}
      isLoading={isLoading}
      emptyMessage="No employees match your filters."
      onRowClick={(e) => navigate(ROUTES.employeeDetail(e.id))}
    />
  );
}
