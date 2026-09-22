import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMyPermissions } from '@modules/rbac';

import { availabilityApi } from '../api/availability.api';
import type { StartLeaveInput } from '../types/availability.types';

/**
 * Only these roles are layered, so only these roles carry an availability.
 *
 * Everybody else's absence changes nothing the system routes — their work is
 * not addressed to them by name — and a status nobody acts on is just another
 * thing in the header.
 */
const AVAILABILITY_ROLE_KEYS = ['factory_hr', 'corporate_recruiter'];

/** Does this user's absence move work? If not, they get no presence at all. */
export function useCarriesCover(): boolean {
  const { data: perms } = useMyPermissions();
  return (perms?.roles ?? []).some((r) =>
    AVAILABILITY_ROLE_KEYS.includes(r.key),
  );
}

/**
 * This user's presence, for the dot on their avatar.
 *
 * Asked for only by people whose absence moves work, so it costs everybody
 * else nothing — and it answers `null` for them rather than "on duty", so a
 * caller can tell "not applicable" from "at work".
 */
export function useMyPresence(): { onLeave: boolean; until: string | null } | null {
  const carriesCover = useCarriesCover();
  const { data } = useAvailability({ enabled: carriesCover });
  if (!carriesCover) return null;
  return {
    onLeave: Boolean(data?.onLeave),
    until: data?.leave?.endsAt ?? null,
  };
}

export const availabilityKeys = {
  all: ['availability'] as const,
  status: () => [...availabilityKeys.all, 'status'] as const,
  handover: () => [...availabilityKeys.all, 'handover'] as const,
};

/**
 * Only asked for by people whose absence moves work — Factory HR and
 * the Corporate Recruiters — so it costs nothing for everybody else.
 */
export function useAvailability({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: availabilityKeys.status(),
    queryFn: () => availabilityApi.status(),
    enabled,
  });
}

/**
 * What would move. Only fetched while the panel is open — it is a question
 * about this moment, and the answer changes as work comes and goes.
 */
export function useLeaveHandover(enabled: boolean) {
  return useQuery({
    queryKey: availabilityKeys.handover(),
    queryFn: () => availabilityApi.handover(),
    enabled,
    staleTime: 0,
  });
}

/** Going on leave moves real work, so every requisition view is refreshed. */
function useSyncAvailability() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['requisitions'] });
  };
}

export function useStartLeave() {
  const sync = useSyncAvailability();
  return useMutation({
    mutationFn: (input: StartLeaveInput) => availabilityApi.start(input),
    onSuccess: sync,
  });
}

export function useEndLeave() {
  const sync = useSyncAvailability();
  return useMutation({
    mutationFn: () => availabilityApi.end(),
    onSuccess: sync,
  });
}
