/** The nine scored questions on DBL's reference-check form, in paper order. */
export const RATING_QUESTIONS = [
  { key: 'trustworthiness', letter: 'a', text: 'Trustworthiness' },
  { key: 'values', letter: 'b', text: 'Organizational values and ethics' },
  { key: 'strategy', letter: 'c', text: 'Strategic know-how when deciding' },
  { key: 'peers', letter: 'd', text: 'Relations with peers / supervisor' },
  { key: 'quality', letter: 'e', text: 'Quality of work performed' },
  { key: 'commitment', letter: 'f', text: 'Level of commitment to the job' },
  { key: 'creativity', letter: 'g', text: 'Creativity in solving problems' },
  { key: 'communication', letter: 'h', text: 'Interpersonal communication' },
  { key: 'integrity', letter: 'i', text: 'Integrity performing assigned duties' },
] as const;

export const RATING_SCALE = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'average', label: 'Average' },
  { value: 'unsatisfactory', label: 'Unsatisfactory' },
] as const;

/** Question e is scored differently on the paper form. */
export const QUALITY_SCALE = [
  { value: 'consistently_high', label: 'Consistently high quality' },
  { value: 'meets_requirements', label: 'Meets job requirements' },
  { value: 'needs_improvement', label: 'Needs improvement' },
] as const;

export const scaleFor = (key: string) =>
  key === 'quality' ? QUALITY_SCALE : RATING_SCALE;

export interface ReferenceCheck {
  id: string;
  refereeName: string;
  refereeDesignation: string | null;
  refereeOrganization: string | null;
  refereeEmail: string | null;
  refereePhone: string | null;
  knownDuration: string | null;
  relationship: string | null;
  strengths: string | null;
  weaknesses: string | null;
  ratings: Record<string, string>;
  handover: string | null;
  rehireEligible: string | null;
  concerns: string | null;
  overallComments: string | null;
  conductedByName: string;
  conductedAt: string;
}

/** What the form sends — same shape, without the server-set fields. */
export interface ReferenceCheckInput {
  refereeName: string;
  refereeDesignation?: string;
  refereeOrganization?: string;
  refereeEmail?: string;
  refereePhone?: string;
  knownDuration?: string;
  relationship?: string;
  strengths?: string;
  weaknesses?: string;
  ratings?: Record<string, string>;
  handover?: string;
  rehireEligible?: string;
  concerns?: string;
  overallComments?: string;
}
