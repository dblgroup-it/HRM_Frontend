import { UserPlus, X } from 'lucide-react';

import { cn } from '@shared/lib';
// By path, not the barrel: the requisition barrel already imports this module.
import {
  EmployeePicker,
  type PickedEmployee,
} from '@modules/requisition/components/EmployeePicker';

/**
 * "Referred by an employee" — a switch, then the referrer picked from the
 * employee directory.
 *
 * Shared by the single-CV forms and the bulk ones: an employee who passes on
 * several CVs at once refers every candidate in that batch.
 */
export function ReferralPicker({
  on,
  onToggle,
  referrer,
  onPick,
  several = false,
}: {
  on: boolean;
  onToggle: (on: boolean) => void;
  referrer: PickedEmployee | null;
  onPick: (employee: PickedEmployee | null) => void;
  /** Word it for a batch: every CV in it gets the same referrer. */
  several?: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => {
          if (on) onPick(null);
          onToggle(!on);
        }}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
          on
            ? 'border-violet-200 bg-violet-50/70'
            : 'border-slate-200 bg-white hover:bg-slate-50',
        )}
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            on ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500',
          )}
        >
          <UserPlus className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-800">
            {several ? 'Referred by an employee — all of these CVs' : 'Referred by an employee'}
          </span>
          <span className="block text-xs text-slate-500">
            {several
              ? 'Every candidate in this upload is recorded as their referral.'
              : 'Pick who put them forward from the employee directory.'}
          </span>
        </span>
        <span
          className={cn(
            'relative h-5 w-9 shrink-0 rounded-full transition-colors',
            on ? 'bg-violet-600' : 'bg-slate-300',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
              on ? 'left-[1.125rem]' : 'left-0.5',
            )}
          />
        </span>
      </button>
      {on && (
        <div className="mt-2.5">
          {referrer ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-violet-200 bg-white px-3 py-2">
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                  Referred by
                </p>
                <p className="truncate text-slate-800">
                  <span className="font-mono">{referrer.employeeCode}</span>
                  {' – '}
                  <span className="font-medium">{referrer.name}</span>
                  {referrer.jobTitle ? ` – ${referrer.jobTitle}` : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label="Change referrer"
                onClick={() => onPick(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <EmployeePicker label="Referred by" value="" onPick={onPick} />
          )}
        </div>
      )}
    </div>
  );
}
