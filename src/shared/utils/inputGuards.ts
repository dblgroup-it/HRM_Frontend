import type { ClipboardEvent, KeyboardEvent, WheelEvent } from 'react';

/**
 * Keys a `type="number"` input accepts that a count never needs: a sign, a
 * decimal point, and the exponent `e` (so "1e3" and "-10.1" could be typed).
 */
const NOT_A_WHOLE_NUMBER = new Set(['-', '+', '.', ',', 'e', 'E']);

/**
 * Spread onto a number input that holds a count — posts, heads, seats. It
 * stops a negative or a fraction being typed or pasted at all, rather than
 * letting it in and complaining on submit. The schema still validates.
 */
export const wholeNumberInput = {
  type: 'number',
  inputMode: 'numeric',
  step: 1,
  min: 0,
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
    if (NOT_A_WHOLE_NUMBER.has(e.key)) e.preventDefault();
  },
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => {
    if (!/^\d+$/.test(e.clipboardData.getData('text').trim())) e.preventDefault();
  },
  // A scroll over a focused number input silently changes its value.
  onWheel: (e: WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
} as const;

/** Bangladesh mobile: +880 is fixed, then the ten digits after the leading 0. */
export const BD_MOBILE_PREFIX = '+880';
export const BD_MOBILE_DIGITS = 10;

/**
 * The ten local digits from whatever was typed or pasted — "01712345678",
 * "+8801712345678", "880 1712-345678" and "1712345678" all give "1712345678".
 */
export function bdMobileLocalDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, BD_MOBILE_DIGITS);
}

/** A complete Bangladeshi mobile: 1 then a 3–9 operator digit, then eight. */
export function isValidBdMobile(localDigits: string): boolean {
  return /^1[3-9]\d{8}$/.test(localDigits);
}

/** The stored form: "+8801712345678". Empty stays empty. */
export function toBdMobile(localDigits: string): string {
  return localDigits ? `${BD_MOBILE_PREFIX}${localDigits}` : '';
}
