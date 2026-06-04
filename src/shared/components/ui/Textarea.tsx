import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

import { cn } from '@shared/lib';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={fieldId}
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          aria-invalid={!!error}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-colors',
            'placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/40',
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-slate-300 focus:border-brand-500',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-xs text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
