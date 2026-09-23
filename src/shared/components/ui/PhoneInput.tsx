import { useId } from 'react';

import { cn } from '@shared/lib';
import {
  BD_MOBILE_DIGITS,
  BD_MOBILE_PREFIX,
  bdMobileLocalDigits,
} from '@shared/utils';

export interface PhoneInputProps {
  /** The ten local digits, without +880 or the leading 0 — e.g. "1712345678". */
  value: string;
  onChange: (localDigits: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** `lg` matches the public pages' taller, rounder fields. */
  size?: 'md' | 'lg';
  autoComplete?: string;
}

/**
 * A Bangladeshi mobile number. +880 is printed, not typed, so what is left is
 * exactly ten digits (the leading 0 is the +880). Digits only; a pasted
 * "01712…" or "+880 1712…" is trimmed to the same ten.
 */
export function PhoneInput({
  value,
  onChange,
  label,
  required,
  error,
  hint,
  size = 'md',
  autoComplete = 'tel-national',
}: PhoneInputProps) {
  const id = useId();
  const lg = size === 'lg';

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'mb-1.5 block text-sm text-slate-700',
            lg ? 'font-semibold' : 'font-medium'
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      <div
        className={cn(
          'flex w-full items-stretch overflow-hidden border bg-white transition',
          lg ? 'rounded-xl' : 'h-10 rounded-lg',
          'focus-within:ring-2',
          error
            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100'
            : cn(
                'border-slate-300',
                lg
                  ? 'border-slate-200 focus-within:border-brand-400 focus-within:ring-brand-100'
                  : 'focus-within:border-brand-500 focus-within:ring-brand-500/40'
              )
        )}
      >
        <span
          className={cn(
            'flex select-none items-center border-r border-slate-200 bg-slate-50 font-medium tabular-nums text-slate-600',
            lg ? 'px-3.5 text-sm' : 'px-3 text-sm'
          )}
        >
          {BD_MOBILE_PREFIX}
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete}
          aria-invalid={!!error}
          maxLength={BD_MOBILE_DIGITS}
          value={value}
          // Typing: digits only, and a leading 0 is the +880 already shown.
          onChange={(e) =>
            onChange(
              e.target.value
                .replace(/\D/g, '')
                .replace(/^0+/, '')
                .slice(0, BD_MOBILE_DIGITS)
            )
          }
          onPaste={(e) => {
            e.preventDefault();
            onChange(bdMobileLocalDigits(e.clipboardData.getData('text')));
          }}
          placeholder="1XXXXXXXXX"
          className={cn(
            // The wrapper draws the focus ring; the app-wide focus-visible
            // ring on the input itself would box it inside the field.
            'min-w-0 flex-1 bg-transparent text-sm tabular-nums text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0',
            lg ? 'px-4 py-3' : 'px-3'
          )}
        />
        <span
          className={cn(
            'flex items-center pr-3 text-[11px] tabular-nums',
            value.length === BD_MOBILE_DIGITS ? 'text-emerald-600' : 'text-slate-400'
          )}
          aria-hidden
        >
          {value.length}/{BD_MOBILE_DIGITS}
        </span>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
