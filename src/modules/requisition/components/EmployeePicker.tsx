import { useMemo, useState } from 'react';
import { Search, UserRound, X } from 'lucide-react';

import { Input } from '@shared/components/ui';
import { useDebounce } from '@shared/hooks';
import { cn } from '@shared/lib';
import { useEmployees } from '@modules/employees';

export interface PickedEmployee {
  name: string;
  employeeCode: string;
  jobTitle: string;
}

/**
 * Search the employee directory for the person being replaced.
 *
 * Distinct from the approval-path PersonPicker: that one needs a login to name
 * as an approver, this one just records who left — so it searches the whole
 * synced directory and stores a name + code snapshot rather than a user id.
 * The person may well have already been deactivated.
 */
export function EmployeePicker({
  label,
  value,
  error,
  onPick,
}: {
  label: string;
  /** Currently selected name, or '' when nothing is picked. */
  value: string;
  error?: string;
  onPick: (employee: PickedEmployee | null) => void;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const { data, isFetching } = useEmployees({
    search: debounced,
    page: 1,
    pageSize: 6,
  });

  const results = useMemo(
    () => (debounced.trim().length >= 2 ? (data?.items ?? []) : []),
    [debounced, data],
  );

  if (value) {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
        <div className="flex items-center gap-2.5 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 ring-1 ring-brand-100">
            <UserRound className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
            {value}
          </span>
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => {
              onPick(null);
              setSearch('');
            }}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Input
        label={label}
        placeholder="Search by name, code or designation…"
        leftIcon={<Search className="h-4 w-4" />}
        value={search}
        error={error}
        onChange={(e) => setSearch(e.target.value)}
      />
      {debounced.trim().length >= 2 && (
        <div className="mt-1.5 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {isFetching && results.length === 0 && (
            <p className="px-3 py-3 text-xs text-slate-400">Searching…</p>
          )}
          {!isFetching && results.length === 0 && (
            <p className="px-3 py-3 text-xs text-slate-400">
              No matching employee.
            </p>
          )}
          {results.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => {
                onPick({
                  name: emp.name,
                  employeeCode: emp.employeeCode,
                  jobTitle: emp.jobTitle,
                });
                setSearch('');
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors duration-150',
                'hover:bg-brand-50/50 focus-visible:bg-brand-50/60 focus-visible:outline-none',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900">
                  {emp.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {emp.employeeCode}
                  {emp.jobTitle ? ` · ${emp.jobTitle}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
