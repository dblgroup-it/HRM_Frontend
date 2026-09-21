import { useMemo } from 'react';
import { Search } from 'lucide-react';

import { Combobox, Input } from '@shared/components/ui';
import type { SelectOption } from '@shared/types';

import { useEmployeeDepartments } from '../hooks/useEmployees';
import type { EmployeeFilters as Filters } from '../types/employee.types';

interface Props {
  search: string;
  department: string;
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
}

/**
 * Search the directory, and narrow it to one department.
 *
 * Two controls, both of which work. There used to be three: the departments
 * were seven invented names out of the mock fixtures, matching nothing ZingHR
 * sends, and the status dropdown offered "On Leave" and "Probation" — states
 * this system does not model — against a backend that has no status parameter
 * at all, so picking one changed nothing on screen. A filter that silently
 * does nothing is worse than no filter: it makes people doubt the data.
 */
export function EmployeeFilters({
  search,
  department,
  onSearchChange,
  onDepartmentChange,
}: Props) {
  const { data: departments } = useEmployeeDepartments();

  // A Combobox rather than a select — there are 100+ real departments, and
  // the count tells you whether a choice is worth making before you make it.
  const options: SelectOption[] = useMemo(
    () => [
      { label: 'All departments', value: 'all' },
      ...(departments ?? []).map((d) => ({
        label: `${d.name} (${d.count})`,
        value: d.name,
      })),
    ],
    [departments],
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_260px]">
      <Input
        placeholder="Search by name, code, email…"
        leftIcon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Combobox
        options={options}
        value={department}
        onChange={onDepartmentChange}
        placeholder="All departments"
      />
    </div>
  );
}

export type { Filters as EmployeeFilterValues };
