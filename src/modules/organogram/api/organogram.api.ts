import { ENV, MOCK_LATENCY } from '@shared/constants';
import { http } from '@shared/api';
import { delay } from '@shared/utils';
import type { ApiResponse } from '@shared/types';

import type {
  OrganogramUnit,
  SeatLookupResult,
} from '../types/organogram.types';
import { MOCK_SEATS } from '../data/organogram.mock';

function rollup(): OrganogramUnit[] {
  const byUnit = new Map<string, typeof MOCK_SEATS>();
  for (const seat of MOCK_SEATS) {
    const list = byUnit.get(seat.unit) ?? [];
    list.push(seat);
    byUnit.set(seat.unit, list);
  }

  return [...byUnit.entries()].map(([unit, seats]) => {
    const byDept = new Map<string, typeof MOCK_SEATS>();
    for (const seat of seats) {
      const list = byDept.get(seat.department) ?? [];
      list.push(seat);
      byDept.set(seat.department, list);
    }

    const departments = [...byDept.entries()].map(([department, deptSeats]) => {
      const sanctioned = deptSeats.reduce((s, x) => s + x.sanctioned, 0);
      const filled = deptSeats.reduce((s, x) => s + x.filled, 0);
      return {
        department,
        seats: deptSeats,
        sanctioned,
        filled,
        vacant: sanctioned - filled,
      };
    });

    const sanctioned = departments.reduce((s, d) => s + d.sanctioned, 0);
    const filled = departments.reduce((s, d) => s + d.filled, 0);
    return { unit, departments, sanctioned, filled, vacant: sanctioned - filled };
  });
}

/** Match a requested position against the organogram. */
function lookup(
  unit: string,
  department: string,
  designation: string
): SeatLookupResult {
  const seat =
    MOCK_SEATS.find(
      (s) =>
        s.unit === unit &&
        s.department === department &&
        s.designation.toLowerCase() === designation.trim().toLowerCase()
    ) ?? null;

  if (!seat) {
    return { inOrganogram: false, vacant: 0, requirement: 'new', seat: null };
  }

  const vacant = seat.sanctioned - seat.filled;
  return {
    inOrganogram: true,
    vacant,
    requirement: vacant > 0 ? 'existing' : 'new',
    seat,
  };
}

export const organogramApi = {
  units(): Promise<OrganogramUnit[]> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() => rollup());
    }
    return http
      .get<ApiResponse<OrganogramUnit[]>>('/organogram')
      .then((res) => res.data);
  },

  lookup(
    unit: string,
    department: string,
    designation: string
  ): Promise<SeatLookupResult> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY / 2).then(() =>
        lookup(unit, department, designation)
      );
    }
    return http
      .get<ApiResponse<SeatLookupResult>>('/organogram/lookup', {
        params: { unit, department, designation },
      })
      .then((res) => res.data);
  },
};
