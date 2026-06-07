import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { organogramKeys } from '@modules/organogram';

import { unitsApi } from '../api/units.api';
import type {
  CreateUnitInput,
  UpsertPositionInput,
} from '../types/unit.types';

type PositionPatch = Partial<UpsertPositionInput>;

export const unitKeys = {
  all: ['units'] as const,
};

export function useUnitsConfig() {
  return useQuery({
    queryKey: unitKeys.all,
    queryFn: () => unitsApi.list(),
  });
}

/** Invalidate units + organogram after any configuration change. */
function useConfigInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: unitKeys.all });
    void queryClient.invalidateQueries({ queryKey: organogramKeys.all });
  };
}

export function useCreateUnit() {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: (input: CreateUnitInput) => unitsApi.createUnit(input),
    onSuccess: invalidate,
  });
}

export function useRenameUnit() {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      unitsApi.renameUnit(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteUnit() {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: (id: string) => unitsApi.deleteUnit(id),
    onSuccess: invalidate,
  });
}

export function useAddDepartment() {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: ({ unitId, name }: { unitId: string; name: string }) =>
      unitsApi.addDepartment(unitId, name),
    onSuccess: invalidate,
  });
}

export function useRenameDepartment() {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      unitsApi.renameDepartment(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteDepartment() {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: (departmentId: string) =>
      unitsApi.deleteDepartment(departmentId),
    onSuccess: invalidate,
  });
}

export function useUpdatePosition() {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PositionPatch }) =>
      unitsApi.updatePosition(id, input),
    onSuccess: invalidate,
  });
}

export function useUpsertPosition() {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: ({
      departmentId,
      input,
    }: {
      departmentId: string;
      input: UpsertPositionInput;
    }) => unitsApi.upsertPosition(departmentId, input),
    onSuccess: invalidate,
  });
}

export function useDeletePosition() {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: (positionId: string) => unitsApi.deletePosition(positionId),
    onSuccess: invalidate,
  });
}
