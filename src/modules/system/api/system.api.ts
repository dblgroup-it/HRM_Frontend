import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

export interface ApiLogRow {
  id: string;
  createdAt: string;
  source: 'api' | 'browser';
  kind: 'error' | 'slow';
  method: string | null;
  path: string | null;
  status: number | null;
  durationMs: number | null;
  userId: string | null;
  userName: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  message: string | null;
  stack: string | null;
}

export interface ApiLogQuery {
  source?: string;
  kind?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PageOf<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiLogSummary {
  last24h: { serverErrors: number; clientErrors: number; browserErrors: number; slow: number };
  topFailing: { method: string | null; path: string | null; status: number | null; count: number }[];
}

export interface SandboxStatus {
  enabled: boolean;
  database?: string | null;
  date?: string | null;
}

export interface SandboxDatabases {
  current: string | null;
  following: string;
  copies: { name: string; date: string | null; sizeMb: number }[];
}

export interface OutboxRow {
  id: string;
  createdAt: string;
  kind: string;
  target: string | null;
  subject: string | null;
  body: string | null;
  meta: Record<string, unknown> | null;
}

export interface RepoPlan {
  label: string;
  error?: string;
  live?: string;
  dev?: string;
  devBranch?: string;
  dirty?: boolean;
  buildsOnLive?: boolean;
  commits?: { sha: string; subject: string; author: string; when: string }[];
}

export interface PromoteRun {
  runId: string;
  status: 'running' | 'success' | 'failed' | 'rolling_back' | 'rolled_back' | 'rollback_failed' | 'nothing';
  message: string;
  startedAt: string;
  finishedAt: string;
  backend: { from: string; to: string };
  frontend: { from: string; to: string };
  pushed: boolean;
}

export interface PromoteStatus {
  running: boolean;
  plan: { backend: RepoPlan; frontend: RepoPlan };
  last: PromoteRun | null;
  logTail: string;
}

export const systemApi = {
  promoteStatus: (): Promise<PromoteStatus> =>
    http.get<ApiResponse<PromoteStatus>>('/sandbox/promote').then((r) => r.data),
  startPromote: (): Promise<{ started: boolean }> =>
    http.post<ApiResponse<{ started: boolean }>>('/sandbox/promote', { confirm: 'DEPLOY' }).then((r) => r.data),
  apiLogs: (q: ApiLogQuery): Promise<PageOf<ApiLogRow>> =>
    http.get<ApiResponse<PageOf<ApiLogRow>>>('/api-logs', { params: q }).then((r) => r.data),
  apiLogSummary: (): Promise<ApiLogSummary> =>
    http.get<ApiResponse<ApiLogSummary>>('/api-logs/summary').then((r) => r.data),
  sandboxStatus: (): Promise<SandboxStatus> =>
    http.get<ApiResponse<SandboxStatus>>('/sandbox/status').then((r) => r.data),
  sandboxDatabases: (): Promise<SandboxDatabases> =>
    http.get<ApiResponse<SandboxDatabases>>('/sandbox/databases').then((r) => r.data),
  switchDatabase: (database: string): Promise<{ switching: string }> =>
    http
      .post<ApiResponse<{ switching: string }>>('/sandbox/databases/switch', { database })
      .then((r) => r.data),
  outbox: (q: { kind?: string; page?: number }): Promise<PageOf<OutboxRow>> =>
    http.get<ApiResponse<PageOf<OutboxRow>>>('/sandbox/outbox', { params: q }).then((r) => r.data),
};
