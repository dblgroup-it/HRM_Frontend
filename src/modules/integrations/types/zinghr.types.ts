export interface ZingHrSyncLog {
  id: string;
  source: string;
  total: number;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  /** running | success | failed */
  status: string;
  message: string | null;
  logs: string[];
  startedAt: string;
  finishedAt: string | null;
}
