import { forwardRef, useId, type InputHTMLAttributes } from 'react';

import { cn } from '@shared/lib';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            className={cn(
              'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 transition-colors',
              'placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/40',
              leftIcon && 'pl-10',
              error
                ? 'border-red-400 focus:border-red-500'
                : 'border-slate-300 focus:border-brand-500',
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
