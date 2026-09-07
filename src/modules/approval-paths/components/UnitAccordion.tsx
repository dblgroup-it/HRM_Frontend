import { useMemo, useState } from 'react';
import {
  Building2,
  ChevronDown,
  Layers,
  UserCheck,
  UserPlus,
} from 'lucide-react';

import { Badge, Combobox, TreeAddNode } from '@shared/components/ui';
import { useMasterData } from '@modules/master-data';
import { cn } from '@shared/lib';

import type {
  RaiserApprovalPath,
  UnitApprovalPaths,
} from '../types/approval-path.types';
import { useAddRaiser } from '../hooks/useApprovalPaths';
import { RaiserChain } from './RaiserChain';
import { PersonPicker } from './PersonPicker';

/** A unit, with every raiser nominated for it and their chains. */
export function UnitAccordion({
  unit,
  defaultOpen = false,
  index = 0,
}: {
  unit: UnitApprovalPaths;
  defaultOpen?: boolean;
  /** Position in the list — only used to stagger the entrance animation. */
  index?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [newDepartment, setNewDepartment] = useState('');
  const addRaiser = useAddRaiser();
  const { data: master } = useMasterData();
  const count = unit.raisers.length;

  // Department is the grouping level; '' (the unit-wide fallback) leads, then
  // the named departments alphabetically.
  const groups = useMemo(() => {
    const byDepartment = new Map<string, RaiserApprovalPath[]>();
    for (const path of unit.raisers) {
      const list = byDepartment.get(path.department) ?? [];
      list.push(path);
      byDepartment.set(path.department, list);
    }
    return [...byDepartment.entries()].sort(([a], [b]) =>
      a === '' ? -1 : b === '' ? 1 : a.localeCompare(b),
    );
  }, [unit.raisers]);

  const departmentOptions = useMemo(
    () => (master?.departments ?? []).map((d) => ({ value: d, label: d })),
    [master],
  );

  return (
    <section
      className={cn(
        'animate-card-in overflow-hidden rounded-2xl border bg-white transition-[box-shadow,border-color] duration-200',
        open
          ? 'border-brand-200 shadow-card-hover'
          : 'border-slate-200/70 shadow-card hover:border-slate-300 hover:shadow-card-hover',
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200',
          open ? 'bg-brand-50/50' : 'hover:bg-slate-50/80',
        )}
      >
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-[background,color,box-shadow] duration-200',
            open
              ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_4px_10px_-3px_rgba(24,119,192,0.55)]'
              : 'bg-slate-100 text-slate-500',
          )}
        >
          <Building2 className="h-4.5 w-4.5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-semibold tracking-tight text-slate-900">
            {unit.unitName}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {count === 0
              ? 'Nobody can raise requisitions here yet'
              : `${count} requisition raiser${count > 1 ? 's' : ''}`}
          </span>
        </span>

        {count === 0 ? (
          <Badge tone="warning" dot className="shrink-0">
            Not set up
          </Badge>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200">
            <UserCheck className="h-3.5 w-3.5 text-brand-600" />
            {count}
          </span>
        )}

        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
            open ? 'bg-white text-brand-600 ring-1 ring-brand-100' : 'text-slate-400',
          )}
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </span>
      </button>

      {open && (
        <div className="animate-branch-open border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-4">
          {count === 0 && (
            <div className="mb-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <UserPlus className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-slate-700">
                No requisition raisers yet
              </p>
              <p className="max-w-sm text-xs leading-5 text-slate-500">
                Pick a department, then the person who should be able to open
                requisitions for it.
              </p>
            </div>
          )}

          {/* Unit → department → raiser → steps. Departments are the grouping
              level: you pick where the requisition comes from first, then who
              may raise it there. */}
          {groups.length > 0 && (
            <div className="relative">
              <span
                aria-hidden
                className="absolute bottom-0 left-[1.125rem] top-0 hidden w-px -translate-x-1/2 origin-top animate-rail-draw bg-gradient-to-b from-brand-200 to-slate-200 sm:block"
              />

              <div className="space-y-4">
                {groups.map(([dept, paths], gi) => (
                  <div key={dept || '__any__'} className="relative sm:pl-11">
                    <span
                      aria-hidden
                      className="absolute left-[1.125rem] top-5 hidden h-px w-5 rounded bg-slate-200 sm:block"
                    />
                    <span
                      aria-hidden
                      className="absolute left-[1.125rem] top-[1.1875rem] hidden h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-400 ring-2 ring-white sm:block"
                    />
                    <div
                      className="animate-card-in rounded-2xl border border-slate-200/80 bg-white/70 p-3 shadow-card"
                      style={{ animationDelay: `${Math.min(gi, 6) * 45}ms` }}
                    >
                      <div className="mb-2.5 flex flex-wrap items-center gap-2 px-1">
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            dept
                              ? 'bg-violet-50 text-violet-500 ring-1 ring-violet-100/70'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <Layers className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {dept || 'Any department'}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {dept
                              ? `${paths.length} raiser${paths.length > 1 ? 's' : ''} for this department`
                              : 'Fallback for departments without their own chain'}
                          </span>
                        </span>
                      </div>

                      <div className="space-y-3">
                        {paths.map((path) => (
                          <RaiserChain key={path.raiser.id} path={path} />
                        ))}
                      </div>

                      <TreeAddNode
                        className="mt-3"
                        label={
                          dept
                            ? `Add a raiser for ${dept}`
                            : 'Add a raiser for any department'
                        }
                      >
                        {(close) => (
                          <PersonPicker
                            autoFocus
                            placeholder="Search who will raise requisitions here…"
                            excludeUserIds={paths.map((r) => r.raiser.id)}
                            onPick={(person) => {
                              addRaiser.mutate({
                                unitId: unit.unitId,
                                raiserId: person.userId,
                                department: dept,
                              });
                              close();
                            }}
                          />
                        )}
                      </TreeAddNode>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Start a new department group — department first, then the person. */}
          <TreeAddNode
            className="mt-3"
            railAbove={groups.length > 0}
            label="Add a department"
          >
            {(close) => (
              <div className="space-y-2.5">
                <Combobox
                  label="Department"
                  placeholder="Select department"
                  options={departmentOptions}
                  value={newDepartment}
                  onChange={setNewDepartment}
                />
                {newDepartment ? (
                  <>
                    <p className="text-[0.6875rem] leading-5 text-slate-500">
                      Now pick who may raise requisitions for{' '}
                      <span className="font-medium text-slate-700">
                        {newDepartment}
                      </span>
                      .
                    </p>
                    <PersonPicker
                      autoFocus
                      placeholder="Search the requisition raiser…"
                      excludeUserIds={(
                        unit.raisers.filter(
                          (r) => r.department === newDepartment,
                        ) ?? []
                      ).map((r) => r.raiser.id)}
                      onPick={(person) => {
                        addRaiser.mutate({
                          unitId: unit.unitId,
                          raiserId: person.userId,
                          department: newDepartment,
                        });
                        setNewDepartment('');
                        close();
                      }}
                    />
                  </>
                ) : (
                  <p className="text-[0.6875rem] leading-5 text-slate-500">
                    Choose the department first — requisitions raised for it will
                    follow the chain you build here.
                  </p>
                )}
              </div>
            )}
          </TreeAddNode>

          {addRaiser.isError && (
            <p className="mt-2 rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 text-xs leading-5 text-red-700">
              {(addRaiser.error as Error).message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
