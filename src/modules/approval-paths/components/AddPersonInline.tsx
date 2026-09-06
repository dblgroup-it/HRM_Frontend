import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { cn } from '@shared/lib';

import { PersonPicker, type PickedPerson } from './PersonPicker';

/**
 * A dashed "+ Add …" affordance that reveals the search only when clicked.
 *
 * Keeps the resting state of a chain compact — an always-open search box per
 * raiser made the page feel like a form rather than a structure.
 */
export function AddPersonInline({
  cta,
  placeholder,
  excludeUserIds,
  onPick,
  className,
}: {
  cta: string;
  placeholder?: string;
  excludeUserIds: string[];
  onPick: (person: PickedPerson) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700',
          className,
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        {cta}
      </button>
    );
  }

  return (
    <div className={cn('rounded-lg border border-brand-200 bg-brand-50/40 p-2.5', className)}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{cta}</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <PersonPicker
        autoFocus
        placeholder={placeholder}
        excludeUserIds={excludeUserIds}
        onPick={(p) => {
          onPick(p);
          setOpen(false);
        }}
      />
    </div>
  );
}
