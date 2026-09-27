import { useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';

import { cn } from '@shared/lib';

import { useSaveFacilities } from '../hooks/useAssessment';
import type { FacilitiesView } from '../types/assessment.types';
import { benefitLabels } from './benefits';
import { FacilitiesForm } from './FacilitiesForm';

/**
 * The facilities section of the evaluation form, for an interviewer sitting
 * on the panel for HR.
 *
 * The rest of the panel never receives it — the server sends `facilities`
 * only to HR panelists — so this is not a hidden field but an absent one.
 *
 * One record per candidate, shared by every HR interviewer on the panel: the
 * form opens on whatever the last of them saved, says who that was, and a
 * save made over a colleague's newer one is refused and their figures shown.
 */
export function RailFacilities({
  target,
  facilities,
}: {
  target: { token: string } | { roundId: string };
  facilities: FacilitiesView;
}) {
  const save = useSaveFacilities(target);
  const filled =
    facilities.presentSalary != null ||
    facilities.salaryExpectation != null ||
    facilities.salaryBenefits.length > 0 ||
    Boolean(facilities.transportPickup);
  // Open on a blank record — that is the job to do. Folded once filled, so the
  // candidate's facts stay in view while marking.
  const [open, setOpen] = useState(!filled);

  const summary = [
    facilities.presentSalary != null && `Now ${facilities.presentSalary.toLocaleString('en-US')}`,
    facilities.salaryExpectation != null && `Wants ${facilities.salaryExpectation.toLocaleString('en-US')}`,
    facilities.salaryBenefits.length > 0 && `${benefitLabels(facilities.salaryBenefits).length} benefits`,
    facilities.transportPickup && 'pick-up noted',
  ].filter(Boolean);

  return (
    <div className="border-t border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 bg-emerald-50/60 px-4 py-3 text-left transition-colors hover:bg-emerald-50"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Building2 className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 text-xs font-bold uppercase tracking-wide text-slate-800">
            Facilities
            <span className="rounded-full bg-emerald-600/10 px-1.5 py-px text-[0.5625rem] font-bold tracking-wider text-emerald-700">
              FROM HR · ONLY YOU SEE THIS
            </span>
          </span>
          <span className="block truncate text-[0.6875rem] text-slate-500">
            {filled ? summary.join(' · ') : 'Salary, benefits and pick-up point — asked in the room'}
          </span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3">
          {/* Keyed on the stamp: when a colleague's save comes in, the fields
              reseed with their figures instead of keeping stale ones. */}
          <FacilitiesForm
            key={facilities.updatedAt ?? 'new'}
            dense
            initial={facilities}
            saving={save.isPending}
            onSave={(input) => save.mutate(input)}
          />
        </div>
      )}
    </div>
  );
}
