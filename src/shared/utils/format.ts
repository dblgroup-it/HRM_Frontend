import { format, formatDistanceToNow, parseISO } from 'date-fns';

import type { ISODateString } from '@shared/types';

/** Format an ISO date string as e.g. "04 Jun 2026". */
export function formatDate(value: ISODateString, pattern = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(value), pattern);
  } catch {
    return value;
  }
}

/** Relative time, e.g. "3 hours ago". */
export function formatRelative(value: ISODateString): string {
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true });
  } catch {
    return value;
  }
}

/** Currency formatting, defaults to BDT for DBL Group. */
export function formatCurrency(amount: number, currency = 'BDT'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact number, e.g. 1.2k. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
}

/** Initials from a full name, e.g. "Ada Lovelace" -> "AL". */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
