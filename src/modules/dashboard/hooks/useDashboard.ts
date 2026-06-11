import { useQuery } from '@tanstack/react-query';

import { dashboardApi } from '../api/dashboard.api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
};

/** Fetches aggregated HR dashboard data (the backend caches it ~45s too). */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: () => dashboardApi.getDashboard(),
    staleTime: 45_000,
    refetchOnWindowFocus: false,
  });
}
