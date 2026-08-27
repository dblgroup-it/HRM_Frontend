import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { facilityConfirmApi, facilityProvisioningApi } from '../api/facilityProvisioning.api';
import type { NotifyFacilityInput } from '../types/facilityProvisioning.types';

const keys = {
  status: (candidateId: string) => ['facility-provisioning', candidateId] as const,
  suggest: (candidateId: string, key: string) =>
    ['facility-provisioning', candidateId, key, 'suggest'] as const,
};

export function useFacilityProvisioning(candidateId: string) {
  return useQuery({
    queryKey: keys.status(candidateId),
    queryFn: () => facilityProvisioningApi.getStatus(candidateId),
    enabled: Boolean(candidateId),
  });
}

export function useSuggestedRecipients(candidateId: string, key: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.suggest(candidateId, key),
    queryFn: () => facilityProvisioningApi.suggest(candidateId, key),
    enabled: enabled && Boolean(candidateId) && Boolean(key),
    staleTime: 60_000,
  });
}

export function useNotifyFacility(candidateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, input }: { key: string; input: NotifyFacilityInput }) =>
      facilityProvisioningApi.notify(candidateId, key, input),
    onSuccess: (data) => queryClient.setQueryData(keys.status(candidateId), data),
  });
}

/** Public — the Admin/IT recipient's confirmation page. */
export function useFacilityConfirmInfo(token: string) {
  return useQuery({
    queryKey: ['facility-confirm', token],
    queryFn: () => facilityConfirmApi.get(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useSubmitFacilityConfirm(token: string) {
  return useMutation({
    mutationFn: (note?: string) => facilityConfirmApi.confirm(token, note),
  });
}
