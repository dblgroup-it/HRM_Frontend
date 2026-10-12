import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type { TutorialsList } from '../types/tutorials.types';

export const tutorialsApi = {
  list: (): Promise<TutorialsList> =>
    http.get<ApiResponse<TutorialsList>>('/tutorials').then((r) => r.data),
};
