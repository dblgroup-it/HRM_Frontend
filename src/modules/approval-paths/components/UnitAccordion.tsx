import { useState } from 'react';
import { Building2, ChevronDown, UserCheck } from 'lucide-react';

import { Badge } from '@shared/components/ui';
import { cn } from '@shared/lib';

import type { UnitApprovalPaths } from '../types/approval-path.types';
import { useAddRaiser } from '../hooks/useApprovalPaths';
import { RaiserChain } from './RaiserChain';
import { AddPersonInline } from './AddPersonInline';

/** A unit, with every raiser nominated for it and their chains. */
export function UnitAccordion({
  unit,
  defaultOpen = false,
}: {
  unit: UnitApprovalPaths;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const addRaiser = useAddRaiser();
  const count = unit.raisers.length;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-white transition',
        open ? 'border-brand-200 shadow-sm' : 'border-slate-200',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition',
          open ? 'bg-brand-50/60' : 'hover:bg-slate-50',
        )}
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition',
            open ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500',
          )}
        >
          <Building2 className="h-4.5 w-4.5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800">
            {unit.unitName}
          </span>
          <span className="block text-xs text-slate-400">
            {count === 0
              ? 'Nobody can raise requisitions here yet'
              : `${count} requisition raiser${count > 1 ? 's' : ''}`}
          </span>
        </span>

        {count === 0 ? (
          <Badge tone="warning">Not set up</Badge>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            <UserCheck className="h-3.5 w-3.5 text-brand-600" />
            {count}
          </span>
        )}

        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-4">
          {unit.raisers.map((path) => (
            <RaiserChain key={path.raiser.id} path={path} />
          ))}

          {count === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-xs text-slate-400">
              No requisition raisers yet. Add the first person who should be
              able to open requisitions for this unit.
            </p>
          )}

          <AddPersonInline
            cta="Add a requisition raiser"
            placeholder="Search who will raise requisitions here…"
            excludeUserIds={unit.raisers.map((r) => r.raiser.id)}
            onPick={(person) =>
              addRaiser.mutate({
                unitId: unit.unitId,
                raiserId: person.userId,
              })
            }
          />
          {addRaiser.isError && (
            <p className="text-xs text-red-600">
              {(addRaiser.error as Error).message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
