import { cn } from '@shared/lib';

import type { CandidateGender } from '../types/candidate.types';

const LOOK: Record<CandidateGender, { label: string; tone: string }> = {
  male: { label: 'Male', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  female: { label: 'Female', tone: 'bg-pink-50 text-pink-700 ring-pink-200' },
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
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.625rem] font-semibold leading-none ring-1',
        look.tone,
        className,
      )}
    >
      {look.label}
    </span>
  );
}
