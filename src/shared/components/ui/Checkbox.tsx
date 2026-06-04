import { forwardRef, useId, type InputHTMLAttributes } from 'react';

import { cn } from '@shared/lib';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;

    return (
      <label
        htmlFor={fieldId}
        className={cn(
          'flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50',
          className
        )}
      >
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          {...props}
        />
        <span>
          <span className="block text-sm font-medium text-slate-700">
            {label}
          </span>
          {description && (
            <span className="block text-xs text-slate-400">{description}</span>
          )}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
