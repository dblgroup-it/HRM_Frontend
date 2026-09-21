/**
 * The benefits a candidate can tick as part of their current package.
 *
 * Keys match the backend catalogue (`assessment/candidate-benefits.ts`) —
 * that is what is stored, so a label here can be reworded freely.
 */
export const BENEFIT_OPTIONS = [
  { key: 'lunch_full', label: 'Lunch — full' },
  { key: 'lunch_partial', label: 'Lunch — partial' },
  { key: 'transport_free', label: 'Pick & drop — free' },
  { key: 'transport_paid', label: 'Pick & drop — they pay' },
  { key: 'profit_share', label: 'Profit share' },
  { key: 'dormitory', label: 'Dormitory' },
  { key: 'family_accommodation', label: 'Family accommodation' },
  { key: 'tax_paid', label: 'Tax paid by company' },
] as const;

export type BenefitKey = (typeof BENEFIT_OPTIONS)[number]['key'];

/**
 * Pairs that cannot both be true of one package — ticking one clears the
 * other, rather than letting the server refuse the save.
 */
export const BENEFIT_OPPOSITE: Partial<Record<BenefitKey, BenefitKey>> = {
  lunch_full: 'lunch_partial',
  lunch_partial: 'lunch_full',
  transport_free: 'transport_paid',
  transport_paid: 'transport_free',
};

/** Labels for stored keys, in catalogue order; unknown keys are dropped. */
export function benefitLabels(keys: readonly string[] | null | undefined): string[] {
  const set = new Set(keys ?? []);
  return BENEFIT_OPTIONS.filter((o) => set.has(o.key)).map((o) => o.label);
}
