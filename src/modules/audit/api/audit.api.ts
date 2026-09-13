import { http } from '@shared/api';
import type { ApiResponse, Paginated } from '@shared/types';

import type { AuditEntry, AuditFilters, AuditQuery } from '../types/audit.types';

export const auditApi = {
  list: (query: AuditQuery): Promise<Paginated<AuditEntry>> =>
    http
      .get<ApiResponse<Paginated<AuditEntry>>>('/audit-log', { params: query })
      .then((r) => r.data),

  filters: (): Promise<AuditFilters> =>
    http
      .get<ApiResponse<AuditFilters>>('/audit-log/filters')
      .then((r) => r.data),
};
