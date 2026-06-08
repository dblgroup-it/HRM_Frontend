import { format, formatDistanceToNow, parseISO } from 'date-fns';

import type { ISODateString } from '@shared/types';
import { ENV } from '@shared/constants';

const API_ORIGIN = ENV.API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Resolve a media URL for use in <img>. Absolute/data/blob URLs pass through;
 * backend-relative paths (e.g. "/api/users/:id/avatar") are prefixed with the
 * API origin so they load from the backend, not the SPA host.
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

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
