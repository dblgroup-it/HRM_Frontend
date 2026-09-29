import { cn } from '@shared/lib';

import type { CandidateGender } from '../types/candidate.types';

// A plain fact, so it stays neutral: colour on a row is kept for things
// that need attention (sent, rejected, flagged).
const LOOK: Record<CandidateGender, { label: string }> = {
  male: { label: 'Male' },
  female: { label: 'Female' },
};

/**
 * "Male" / "Female" beside a candidate's name.
 *
 * Read by the AI off the CV, which always decides male or female from the
 * best evidence there — a stated gender, a title or prefix, the name, then
 * the photo — or sent by BDJobs. Only a CV nobody has read yet shows nothing.
 */
export function GenderBadge({
  gender,
  className,
}: {
  gender?: CandidateGender | null;
  className?: string;
}) {
  if (!gender) return null;
  const look = LOOK[gender];
  return (
    <span
      title={`${look.label} · read from the CV`}
      className={cn(
        'inline-flex shrink-0 items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-medium leading-none text-slate-600',
        className,
      )}
    >
      {look.label}
    </span>
  );
}
