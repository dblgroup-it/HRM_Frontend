import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type { TutorialVideoSettings, TutorialsList } from '../types/tutorials.types';

export const tutorialsApi = {
  list: (): Promise<TutorialsList> =>
    http.get<ApiResponse<TutorialsList>>('/tutorials').then((r) => r.data),

  videoSettings: (): Promise<TutorialVideoSettings> =>
    http
      .get<ApiResponse<TutorialVideoSettings>>('/settings/tutorial-videos')
      .then((r) => r.data),

  /** `playlist` as pasted — a link or the id; empty takes the videos off the page. */
  saveVideoSettings: (input: {
    playlist?: string;
    title?: string;
    channel?: string;
  }): Promise<TutorialVideoSettings> =>
    http
      .patch<ApiResponse<TutorialVideoSettings>>('/settings/tutorial-videos', input)
      .then((r) => r.data),
};
