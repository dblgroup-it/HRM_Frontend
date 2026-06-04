import { Search } from 'lucide-react';

import { Input, Select } from '@shared/components/ui';
import type { SelectOption } from '@shared/types';

import { DEPARTMENTS } from '../data/employees.mock';
import type { EmployeeFilters as Filters } from '../types/employee.types';

const STATUS_OPTIONS: SelectOption[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'On Leave', value: 'on_leave' },
  { label: 'Probation', value: 'probation' },
  { label: 'Inactive', value: 'inactive' },
];

const DEPARTMENT_OPTIONS: SelectOption[] = [
  { label: 'All departments', value: 'all' },
  ...DEPARTMENTS.map((d) => ({ label: d, value: d })),
];

interface Props {
  search: string;
  department: string;
  status: string;
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function EmployeeFilters({
  search,
  department,
  status,
  onSearchChange,
  onDepartmentChange,
  onStatusChange,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px]">
      <Input
        placeholder="Search by name, code, email…"
        leftIcon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Select
        options={DEPARTMENT_OPTIONS}
        value={department}
        onChange={(e) => onDepartmentChange(e.target.value)}
      />
      <Select
        options={STATUS_OPTIONS}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
      />
    </div>
  );
}

export type { Filters as EmployeeFilterValues };
