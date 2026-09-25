import { cn } from '@shared/lib';
// By path, not the barrel: the requisition barrel already imports this module.
import { CV_SOURCES } from '@modules/requisition/constants';
import type { CvSource } from '@modules/requisition/types/requisition.types';
import { CV_SOURCE_META } from '@modules/requisition/cvSourceMeta';

/**
 * Where the CVs came from, as a row of icon buttons rather than a dropdown —
 * the icon is the same one the candidate row carries afterwards.
 *
 * Offers the requisition's ticked sources, or all of them when none were
 * ticked. `optional` adds a way to clear the choice.
 */
export function CvSourcePicker({
  value,
  onChange,
  cvSources,
  label,
  optional = false,
}: {
  value: string;
  onChange: (v: string) => void;
  cvSources?: CvSource[];
  /** Heading above the buttons; left out where the form already has one. */
  label?: string;
  optional?: boolean;
}) {
  const options = cvSources?.length
    ? CV_SOURCES.filter((s) => cvSources.includes(s.value))
    : CV_SOURCES;

  return (
    <div>
      {label && (
        <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      )}
      <div
        role="radiogroup"
        aria-label={label ?? 'Source'}
        className="flex flex-wrap gap-1.5"
      >
        {options.map((s) => {
          const meta = CV_SOURCE_META[s.value];
          const Icon = meta.icon;
          const active = value === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(active && optional ? '' : s.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                active
                  ? cn(meta.tone, 'ring-2 ring-offset-1 ring-brand-400')
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>
      {optional && (
        <p className="mt-1 text-[0.6875rem] text-slate-400">
          Optional — click again to clear.
        </p>
      )}
    </div>
  );
}
