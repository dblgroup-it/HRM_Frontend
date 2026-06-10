import { cn } from '@shared/lib';

export interface SegmentedToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
}

/** Clear two-state On/Off control — a friendlier replacement for a bare switch. */
export function SegmentedToggle({
  value,
  onChange,
  disabled = false,
  onLabel = 'On',
  offLabel = 'Off',
}: SegmentedToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-0.5',
        disabled && 'opacity-50',
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          'rounded-md px-3.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed',
          value
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700',
        )}
      >
        {onLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          'rounded-md px-3.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed',
          !value
            ? 'bg-white text-slate-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700',
        )}
      >
        {offLabel}
      </button>
    </div>
  );
}
