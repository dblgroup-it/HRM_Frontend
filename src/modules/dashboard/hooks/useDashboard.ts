import { useQuery } from '@tanstack/react-query';

import { dashboardApi } from '../api/dashboard.api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
};

/** Fetches aggregated HR dashboard data. */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: () => dashboardApi.getDashboard(),
    // A dashboard should reflect current data — always refetch when opened.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
