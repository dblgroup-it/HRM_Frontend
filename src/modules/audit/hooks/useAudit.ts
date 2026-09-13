import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { auditApi } from '../api/audit.api';
import type { AuditQuery } from '../types/audit.types';

export const auditKeys = {
  list: (q: AuditQuery) => ['audit-log', q] as const,
  filters: ['audit-log', 'filters'] as const,
};

export function useAuditLog(query: AuditQuery) {
  return useQuery({
    queryKey: auditKeys.list(query),
    queryFn: () => auditApi.list(query),
    // Paging a log shouldn't blank the table between pages.
    placeholderData: keepPreviousData,
  });
}

export function useAuditFilters() {
  return useQuery({
    queryKey: auditKeys.filters,
    queryFn: () => auditApi.filters(),
    staleTime: 60_000,
  });
}
