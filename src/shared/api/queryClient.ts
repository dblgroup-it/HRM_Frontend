import { QueryClient } from '@tanstack/react-query';

import type { NormalizedError } from './httpClient';

/** Single shared QueryClient with sensible enterprise defaults. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      // A 401 means the session is already being torn down (see httpClient's
      // interceptor + AuthSync) — retrying it just delays the redirect.
      retry: (failureCount, error) =>
        (error as NormalizedError)?.status !== 401 && failureCount < 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
