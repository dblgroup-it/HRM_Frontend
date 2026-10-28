import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  AiProviderName,
  AiProviderSettings,
  AiProviderTestResult,
  AiProviderUpdate,
} from '../types/aiProvider.types';

export const aiProviderApi = {
  get: (): Promise<AiProviderSettings> =>
    http.get<ApiResponse<AiProviderSettings>>('/settings/ai-provider').then((r) => r.data),

  save: (input: AiProviderUpdate): Promise<AiProviderSettings> =>
    http
      .patch<ApiResponse<AiProviderSettings>>('/settings/ai-provider', input)
      .then((r) => r.data),

  /** A key or model typed on the page is tested before it is saved; otherwise the saved ones. */
  test: (input: {
    provider: AiProviderName;
    apiKey?: string;
    model?: string;
  }): Promise<AiProviderTestResult> =>
    http
      .post<ApiResponse<AiProviderTestResult>>('/settings/ai-provider/test', input)
      .then((r) => r.data),
};
