import { useQuery } from '@tanstack/react-query';

import { masterDataApi } from '../api/masterData.api';

export const masterDataKeys = { all: ['master-data'] as const };

/**
 * Fixed dropdown vocabulary. Changes rarely, so it is cached hard — the form
 * would otherwise refetch 1,000 options on every mount.
 */
export function useMasterData() {
  return useQuery({
    queryKey: masterDataKeys.all,
    queryFn: () => masterDataApi.get(),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });
}
