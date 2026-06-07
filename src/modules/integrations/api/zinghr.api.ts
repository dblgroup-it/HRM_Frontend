import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type { ZingHrSyncLog } from '../types/zinghr.types';

export const zinghrApi = {
  /** Start a background sync; returns the running run record. */
  startSync(): Promise<ZingHrSyncLog> {
    return http
      .post<ApiResponse<ZingHrSyncLog>>('/integrations/zinghr/sync')
      .then((res) => res.data);
  },

  /** Latest run (running or finished) — polled for live progress. */
  status(): Promise<ZingHrSyncLog | null> {
    return http
      .get<ApiResponse<ZingHrSyncLog | null>>('/integrations/zinghr/sync/status')
      .then((res) => res.data);
  },

  logs(take = 20): Promise<ZingHrSyncLog[]> {
    return http
      .get<ApiResponse<ZingHrSyncLog[]>>('/integrations/zinghr/logs', {
        params: { take },
      })
      .then((res) => res.data);
  },
};
