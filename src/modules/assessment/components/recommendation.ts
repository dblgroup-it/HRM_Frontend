import type { RecommendationKey } from '../types/assessment.types';

/**
 * The interviewer's suggestion, as the UI says it.
 *
 * Its own module because the components that render it must export only
 * components or Fast Refresh stops working, and because four surfaces show
 * the same three verdicts — the token page, My Interviews, the recruiter's
 * round cards and the drawer. One vocabulary, so "Talent Bank" never becomes
 * "Talent Pool" on one screen and not another.
 *
 * Deliberately no entry for null. A missing recommendation is not a fourth
 * verdict, it is an evaluation submitted before anyone was asked for one, and
 * the caller renders nothing at all in that case.
 */
export const RECOMMENDATIONS: {
  key: RecommendationKey;
  label: string;
  /** What it means, for the person choosing it. */
  hint: string;
}[] = [
  { key: 'select', label: 'Select', hint: 'Put them through' },
  { key: 'reject', label: 'Reject', hint: 'Do not proceed' },
  {
    key: 'talent_pool',
    label: 'Talent Pool',
    hint: 'Not this role — worth keeping',
  },
];

const BY_KEY = new Map(RECOMMENDATIONS.map((r) => [r.key, r]));

export function recommendationLabel(key: RecommendationKey): string {
  return BY_KEY.get(key)?.label ?? key;
}

/** Tailwind classes for a chip, one colour per verdict. */
export function recommendationTone(key: RecommendationKey): string {
  switch (key) {
    case 'select':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'reject':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'talent_pool':
      return 'bg-violet-50 text-violet-700 ring-violet-200';
  }
}

/** The selected state of a picker button. */
export function recommendationActiveTone(key: RecommendationKey): string {
  switch (key) {
    case 'select':
      return 'border-emerald-600 bg-emerald-600 text-white';
    case 'reject':
      return 'border-rose-600 bg-rose-600 text-white';
    case 'talent_pool':
      return 'border-violet-600 bg-violet-600 text-white';
  }
}
