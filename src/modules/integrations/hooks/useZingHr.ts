import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { organogramKeys } from '@modules/organogram';

import { zinghrApi } from '../api/zinghr.api';

export const zinghrKeys = {
  status: ['zinghr', 'status'] as const,
  logs: ['zinghr', 'logs'] as const,
};

/**
 * Latest run, polled every 1.5s while a sync is running so the UI shows
 * live progress; idle otherwise.
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: zinghrKeys.status,
    queryFn: () => zinghrApi.status(),
    refetchOnWindowFocus: false,
    refetchInterval: (query) =>
      query.state.data?.status === 'running' ? 1500 : false,
  });
}

export function useZingHrLogs() {
  return useQuery({
    queryKey: zinghrKeys.logs,
    queryFn: () => zinghrApi.logs(),
    refetchOnWindowFocus: false,
  });
}

/** Trigger a background sync, then let the status poll take over. */
export function useStartSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => zinghrApi.startSync(),
    onSuccess: (log) => {
      queryClient.setQueryData(zinghrKeys.status, log);
      void queryClient.invalidateQueries({ queryKey: zinghrKeys.status });
    },
  });
}

/** Refresh data that a completed sync may have changed. */
export function useRefreshAfterSync() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: zinghrKeys.logs });
    void queryClient.invalidateQueries({ queryKey: ['employees'] });
    void queryClient.invalidateQueries({ queryKey: organogramKeys.all });
  };
}
