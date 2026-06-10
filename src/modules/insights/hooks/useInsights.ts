import { useMutation, useQuery } from '@tanstack/react-query';

import { insightsApi } from '../api/insights.api';

export function useInsightsStatus() {
  return useQuery({
    queryKey: ['insights', 'status'],
    queryFn: () => insightsApi.status(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAsk() {
  return useMutation({ mutationFn: (question: string) => insightsApi.ask(question) });
}

export function useDigest() {
  return useMutation({ mutationFn: () => insightsApi.digest() });
}

export function useBottlenecks() {
  return useMutation({ mutationFn: () => insightsApi.bottlenecks() });
}
