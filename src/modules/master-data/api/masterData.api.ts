import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type { MasterData } from '../types/master-data.types';

export const masterDataApi = {
  get(): Promise<MasterData> {
    return http
      .get<ApiResponse<MasterData>>('/master-data')
      .then((res) => res.data);
  },
};
