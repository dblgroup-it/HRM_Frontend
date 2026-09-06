import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  ApprovalPathLevelInput,
  RaiserApprovalPath,
  UnitApprovalPaths,
} from '../types/approval-path.types';

export const approvalPathsApi = {
  list(): Promise<UnitApprovalPaths[]> {
    return http
      .get<ApiResponse<UnitApprovalPaths[]>>('/approval-paths')
      .then((res) => res.data);
  },

  addRaiser(unitId: string, raiserId: string): Promise<RaiserApprovalPath> {
    return http
      .post<ApiResponse<RaiserApprovalPath>>(
        `/approval-paths/${unitId}/raisers`,
        { raiserId },
      )
      .then((res) => res.data);
  },

  removeRaiser(unitId: string, raiserId: string): Promise<{ success: boolean }> {
    return http
      .delete<ApiResponse<{ success: boolean }>>(
        `/approval-paths/${unitId}/raisers/${raiserId}`,
      )
      .then((res) => res.data);
  },

  replace(
    unitId: string,
    raiserId: string,
    levels: ApprovalPathLevelInput[],
  ): Promise<RaiserApprovalPath> {
    return http
      .put<ApiResponse<RaiserApprovalPath>>(
        `/approval-paths/${unitId}/raisers/${raiserId}`,
        { levels },
      )
      .then((res) => res.data);
  },
};
