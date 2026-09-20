import { PenLine, ShieldAlert } from 'lucide-react';

import { cn } from '@shared/lib';

import type { LetterSignatories } from '../types/onboarding.types';

/**
 * Who the letter goes out over.
 *
 * Required, not defaulted. The signatory used to be whichever `chro` role
 * assignment the database happened to return first, so nothing on screen told
 * HR whose name would appear at the bottom of a contract — and with more than
 * one holder of the role it was a coin toss.
 *
 * Whether that person has an e-signature on file is shown here rather than
 * discovered in the preview: it is the difference between a letter that can
 * be emailed as-is and one somebody has to print and sign, and HR should know
 * which they are producing before they produce it.
 */
export function SignatoryPicker({
  data,
  value,
  onChange,
  labelClass,
}: {
  data: LetterSignatories | undefined;
  value: string;
  onChange: (id: string) => void;
  /** The host modal's field-label class, so this sits in its form. */
  labelClass: string;
}) {
  const signatories = data?.signatories ?? [];
  const title = data?.title ?? 'Chief Human Resources Officer';
  const picked = signatories.find((s) => s.id === value);

  if (data && signatories.length === 0) {
    return (
      <div>
        <span className={labelClass}>Signed by</span>
        <p className="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Nobody holds the CHRO role, so this letter has no one to go out over.
          Assign it in Configuration &rarr; Access Control first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className={labelClass}>Signed by</span>
      <div className="grid gap-1.5">
        {signatories.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              'rounded-xl border px-3 py-2 text-left transition-colors',
              value === s.id
                ? 'border-brand-300 bg-brand-50/60'
                : 'border-slate-200 bg-white hover:bg-slate-50',
            )}
          >
            <span className="block text-sm font-semibold text-slate-800">
              {s.name}
            </span>
            <span className="mt-0.5 block text-[0.6875rem] text-slate-500">
              {title}
              {s.employeeCode ? ` · ${s.employeeCode}` : ''}
            </span>
            <span
              className={cn(
                'mt-1 inline-flex items-center gap-1 text-[0.625rem] font-semibold',
                s.hasSignature ? 'text-emerald-600' : 'text-amber-600',
              )}
            >
              <PenLine className="h-3 w-3" />
              {s.hasSignature
                ? 'E-signature on file'
                : 'No e-signature — prints a blank rule to sign'}
            </span>
          </button>
        ))}
      </div>
      {picked && !picked.hasSignature && (
        <p className="mt-1.5 text-[0.6875rem] text-slate-500">
          The letter will print {picked.name}&rsquo;s name and title over an
          empty line, ready to be signed by hand.
        </p>
      )}
      {!value && signatories.length > 0 && (
        <p className="mt-1.5 text-[0.6875rem] font-medium text-amber-600">
          Choose who signs before sending.
        </p>
      )}
    </div>
  );
}
