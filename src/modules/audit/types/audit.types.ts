/** One field that changed, as recorded in the log. */
export interface AuditChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorName: string;
  /** user — signed in · public — token link · system — scheduled work. */
  actorType: 'user' | 'public' | 'system';
  action: string;
  entity: string;
  entityId: string | null;
  entityLabel: string | null;
  summary: string;
  changes: AuditChange[];
  /** db — field-level · http — request-level · system — scheduled. */
  source: 'db' | 'http' | 'system';
  method: string | null;
  path: string | null;
  statusCode: number | null;
  ip: string | null;
  requestId: string | null;
}

export interface AuditQuery {
  actorId?: string;
  entity?: string;
  action?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditFilters {
  entities: { value: string; count: number }[];
  actions: { value: string; count: number }[];
  actors: { value: string; label: string; count: number }[];
}
