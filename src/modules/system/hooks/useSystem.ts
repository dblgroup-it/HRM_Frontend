import { useMutation, useQuery, keepPreviousData } from '@tanstack/react-query';

import { useAuthStore } from '@modules/auth';

import { systemApi, type ApiLogQuery } from '../api/system.api';

export const systemKeys = {
  all: ['system'] as const,
  apiLogs: (q: ApiLogQuery) => [...systemKeys.all, 'api-logs', q] as const,
  apiLogSummary: () => [...systemKeys.all, 'api-logs', 'summary'] as const,
  sandbox: () => [...systemKeys.all, 'sandbox'] as const,
  databases: () => [...systemKeys.all, 'sandbox', 'databases'] as const,
  promote: () => [...systemKeys.all, 'sandbox', 'promote'] as const,
  outbox: (q: { kind?: string; page?: number }) => [...systemKeys.all, 'sandbox', 'outbox', q] as const,
};

export function useApiLogs(q: ApiLogQuery) {
  return useQuery({
    queryKey: systemKeys.apiLogs(q),
    queryFn: () => systemApi.apiLogs(q),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

export function useApiLogSummary() {
  return useQuery({
    queryKey: systemKeys.apiLogSummary(),
    queryFn: systemApi.apiLogSummary,
    refetchInterval: 30_000,
  });
}

/** Is this the dev server? Asked once per session; it does not change. */
export function useSandboxStatus() {
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: systemKeys.sandbox(),
    queryFn: systemApi.sandboxStatus,
    enabled: signedIn,
    staleTime: Infinity,
  });
}

export function useSandboxDatabases(enabled: boolean) {
  return useQuery({
    queryKey: systemKeys.databases(),
    queryFn: systemApi.sandboxDatabases,
    enabled,
  });
}

export function useSwitchDatabase() {
  return useMutation({ mutationFn: systemApi.switchDatabase });
}

export function useOutbox(q: { kind?: string; page?: number }, enabled: boolean) {
  return useQuery({
    queryKey: systemKeys.outbox(q),
    queryFn: () => systemApi.outbox(q),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Polls quickly while a deploy runs, slowly otherwise. */
export function usePromoteStatus(enabled: boolean) {
  return useQuery({
    queryKey: systemKeys.promote(),
    queryFn: systemApi.promoteStatus,
    enabled,
    refetchInterval: (q) => (q.state.data?.running ? 2000 : 15000),
  });
}

export function useStartPromote() {
  return useMutation({ mutationFn: systemApi.startPromote });
}
