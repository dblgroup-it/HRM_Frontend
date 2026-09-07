import { useMemo, useState } from 'react';
import { KeyRound, Search, UserPlus } from 'lucide-react';

import { Input } from '@shared/components/ui';
import { useDebounce } from '@shared/hooks';
import { cn } from '@shared/lib';
import { useEmployees } from '@modules/employees';

export interface PickedPerson {
  userId: string;
  name: string;
  employeeCode: string;
  designation: string | null;
  /** True when they have no login yet — saving provisions one. */
  needsAccess: boolean;
}

/**
 * Employee search used for both raisers and approvers.
 *
 * People without a login stay selectable — being named here provisions their
 * access automatically — so they're flagged rather than disabled.
 */
export function PersonPicker({
  label,
  placeholder = 'Search by name, code or designation…',
  excludeUserIds,
  onPick,
  autoFocus = false,
}: {
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  excludeUserIds: string[];
  onPick: (person: PickedPerson) => void;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const { data } = useEmployees({ search: debounced, page: 1, pageSize: 6 });

  const results = useMemo(
    () => (debounced.trim().length >= 2 ? (data?.items ?? []) : []),
    [debounced, data],
  );

  return (
    <div>
      <Input
        label={label}
        autoFocus={autoFocus}
        placeholder={placeholder}
        leftIcon={<Search className="h-4 w-4" />}
        className="border-slate-200 bg-white"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {results.length > 0 && (
        <div className="animate-branch-open mt-1.5 max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {results.map((emp) => {
            const already = emp.userId
              ? excludeUserIds.includes(emp.userId)
              : false;
            // No linked login record at all — nothing we can name or provision.
            const unusable = !emp.userId;
            return (
              <button
                key={emp.id}
                type="button"
                disabled={unusable || already}
                onClick={() => {
                  if (!emp.userId) return;
                  onPick({
                    userId: emp.userId,
                    name: emp.name,
                    employeeCode: emp.employeeCode,
                    designation: emp.jobTitle || null,
                    needsAccess: !emp.hasSystemAccess,
                  });
                  setSearch('');
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:bg-brand-50/60',
                  unusable || already
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:bg-brand-50/50',
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
                {already ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.625rem] font-medium text-slate-500">
                    Added
                  </span>
                ) : !emp.hasSystemAccess ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.625rem] font-medium text-emerald-700 ring-1 ring-emerald-100">
                    <KeyRound className="h-3 w-3" />
                    Grants access
                  </span>
                ) : (
                  <UserPlus className="h-4 w-4 shrink-0 text-brand-600" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
