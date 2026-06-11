import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

export interface IngestReport {
  scanned: number;
  imported: number;
  duplicates: number;
  unmatched: number;
}

export interface NudgeReport {
  staleApprovals: number;
  approversNudged: number;
  unmarkedInterviews: number;
  panelistsNudged: number;
}

export interface BackupReport {
  file: string;
  sizeBytes: number;
  url: string;
  kept: number;
  pruned: number;
}

export type AutomationJob = 'ingest' | 'nudges' | 'backup';

export interface JobPauseState {
  paused: boolean;
  pausedUntil: string | null;
  indefinite: boolean;
}

export type AutomationStatus = Record<AutomationJob, JobPauseState>;

export const automationApi = {
  status: (): Promise<AutomationStatus> =>
    http
      .get<ApiResponse<AutomationStatus>>('/automation/status')
      .then((r) => r.data),

  pause: (job: AutomationJob, days?: number): Promise<JobPauseState> =>
    http
      .post<ApiResponse<JobPauseState>>(
        `/automation/${job}/pause`,
        days ? { days } : {},
      )
      .then((r) => r.data),

  resume: (job: AutomationJob): Promise<JobPauseState> =>
    http
      .post<ApiResponse<JobPauseState>>(`/automation/${job}/resume`)
      .then((r) => r.data),

  logs: (): Promise<{ lines: string[] }> =>
    http
      .get<ApiResponse<{ lines: string[] }>>('/automation/logs')
      .then((r) => r.data),

  gmailIngest: (): Promise<IngestReport> =>
    http
      .post<ApiResponse<IngestReport>>('/automation/gmail-ingest', undefined, {
        timeout: 120_000,
      })
      .then((r) => r.data),

  nudges: (): Promise<NudgeReport> =>
    http
      .post<ApiResponse<NudgeReport>>('/automation/nudges', undefined, {
        timeout: 120_000,
      })
      .then((r) => r.data),

  backup: (): Promise<BackupReport> =>
    http
      .post<ApiResponse<BackupReport>>('/automation/backup', undefined, {
        // pg_dump + Drive upload can take a while on a grown database.
        timeout: 600_000,
      })
      .then((r) => r.data),
};
