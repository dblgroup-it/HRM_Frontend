import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  AvailabilityStatus,
  LeaveHandover,
  StartLeaveInput,
} from '../types/availability.types';

export const availabilityApi = {
  status(): Promise<AvailabilityStatus> {
    return http
      .get<ApiResponse<AvailabilityStatus>>('/me/leave')
      .then((res) => res.data);
  },

  /** What would move — read before setting leave, to fill in the panel. */
  handover(): Promise<LeaveHandover> {
    return http
      .get<ApiResponse<LeaveHandover>>('/me/leave/handover')
      .then((res) => res.data);
  },

  start(input: StartLeaveInput): Promise<AvailabilityStatus> {
    return http
      .post<ApiResponse<AvailabilityStatus>>('/me/leave', input)
      .then((res) => res.data);
  },

  end(): Promise<AvailabilityStatus> {
    return http
      .patch<ApiResponse<AvailabilityStatus>>('/me/leave/end', {})
      .then((res) => res.data);
  },
};
