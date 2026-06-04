import { useQuery } from '@tanstack/react-query';

import { organogramApi } from '../api/organogram.api';

export const organogramKeys = {
  all: ['organogram'] as const,
  units: ['organogram', 'units'] as const,
  lookup: (unit: string, department: string, designation: string) =>
    ['organogram', 'lookup', unit, department, designation] as const,
};

export function useOrganogramUnits() {
  return useQuery({
    queryKey: organogramKeys.units,
    queryFn: () => organogramApi.units(),
  });
}

/**
 * Live seat lookup used by the requisition form to decide New vs Replacement.
 * Enabled only once unit, department and a non-trivial designation are present.
 */
export function useSeatLookup(
  unit: string,
  department: string,
  designation: string
) {
  const enabled =
    Boolean(unit) && Boolean(department) && designation.trim().length > 2;

  return useQuery({
    queryKey: organogramKeys.lookup(unit, department, designation.trim()),
    queryFn: () => organogramApi.lookup(unit, department, designation),
    enabled,
  });
}
