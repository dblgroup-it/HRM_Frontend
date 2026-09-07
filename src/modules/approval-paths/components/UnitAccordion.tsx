import { useState } from 'react';
import { Building2, ChevronDown, UserCheck, UserPlus } from 'lucide-react';

import { Badge, TreeAddNode } from '@shared/components/ui';
import { cn } from '@shared/lib';

import type { UnitApprovalPaths } from '../types/approval-path.types';
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
  const addRaiser = useAddRaiser();
  const count = unit.raisers.length;

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
                Add the first person who should be able to open requisitions for
                this unit.
              </p>
            </div>
          )}

          {/* Raisers hang off a single trunk, so the unit → raiser
              relationship reads structurally and not just by indentation. */}
          {count > 0 && (
            <div className="relative">
              <span
                aria-hidden
                className="absolute bottom-0 left-[1.125rem] top-0 hidden w-px -translate-x-1/2 origin-top animate-rail-draw bg-gradient-to-b from-brand-200 to-slate-200 sm:block"
              />

              <div className="space-y-3">
                {unit.raisers.map((path, i) => (
                  <div key={path.raiser.id} className="relative sm:pl-11">
                    <span
                      aria-hidden
                      className="absolute left-[1.125rem] top-8 hidden h-px w-5 rounded bg-slate-200 sm:block"
                    />
                    <span
                      aria-hidden
                      className="absolute left-[1.125rem] top-[1.8125rem] hidden h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-400 ring-2 ring-white sm:block"
                    />
                    <div
                      className="animate-card-in"
                      style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}
                    >
                      <RaiserChain path={path} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* The unit's tree grows from here. */}
          <TreeAddNode
            className="mt-3"
            railAbove={count > 0}
            label="Add a requisition raiser"
          >
            {(close) => (
              <PersonPicker
                autoFocus
                placeholder="Search who will raise requisitions here…"
                excludeUserIds={unit.raisers.map((r) => r.raiser.id)}
                onPick={(person) => {
                  addRaiser.mutate({
                    unitId: unit.unitId,
                    raiserId: person.userId,
                  });
                  close();
                }}
              />
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
