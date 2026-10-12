import { useQuery } from '@tanstack/react-query';

import { tutorialsApi } from '../api/tutorials.api';

/**
 * The guides, each with a signed link that lasts a working day. Refetched
 * whenever the page is looked at again, so a link is never stale when clicked.
 */
export function useTutorials() {
  return useQuery({
    queryKey: ['tutorials'],
    queryFn: () => tutorialsApi.list(),
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: true,
  });
}
