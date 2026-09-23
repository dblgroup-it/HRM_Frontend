import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';
import type {
  BdJobsCategory,
  BdJobsDegree,
  BdJobsEduLevel,
  BdJobsFormData,
  BdJobsIndustry,
  BdJobsLocation,
  BdJobsPost,
  BdJobsSettingsInput,
  BdJobsSettingsView,
  BdJobsSkill,
  BdJobsStatus,
} from '../types/bdjobs.types';

export const bdJobsApi = {
  searchLocations: (search?: string): Promise<BdJobsLocation[]> =>
    http
      .get<ApiResponse<BdJobsLocation[]>>('/integrations/bdjobs/locations', {
        params: search ? { search } : {},
      })
      .then((r) => r.data),

  getEduLevels: (): Promise<BdJobsEduLevel[]> =>
    http
      .get<ApiResponse<BdJobsEduLevel[]>>('/integrations/bdjobs/education-levels')
      .then((r) => r.data),

  getDegrees: (eduLevelId: number): Promise<BdJobsDegree[]> =>
    http
      .get<ApiResponse<BdJobsDegree[]>>('/integrations/bdjobs/degrees', {
        params: { eduLevelId },
      })
      .then((r) => r.data),

  searchIndustry: (searchtxt: string): Promise<BdJobsIndustry[]> =>
    http
      .get<ApiResponse<BdJobsIndustry[]>>('/integrations/bdjobs/industry', {
        params: { searchtxt },
      })
      .then((r) => r.data),

  searchSkills: (search: string, catId?: number): Promise<BdJobsSkill[]> =>
    http
      .get<ApiResponse<BdJobsSkill[]>>('/integrations/bdjobs/skills', {
        params: { search, ...(catId ? { catId } : {}) },
      })
      .then((r) => r.data),

  getCategories: (): Promise<BdJobsCategory[]> =>
    http
      .get<ApiResponse<BdJobsCategory[]>>('/integrations/bdjobs/categories')
      .then((r) => r.data),

  getStatus: (): Promise<BdJobsStatus> =>
    http
      .get<ApiResponse<BdJobsStatus>>('/integrations/bdjobs/status')
      .then((r) => r.data),

  // --- admin configuration ---
  getSettings: (): Promise<BdJobsSettingsView> =>
    http
      .get<ApiResponse<BdJobsSettingsView>>('/integrations/bdjobs/settings')
      .then((r) => r.data),

  updateSettings: (
    input: Partial<BdJobsSettingsInput>,
  ): Promise<BdJobsSettingsView> =>
    http
      .patch<ApiResponse<BdJobsSettingsView>>(
        '/integrations/bdjobs/settings',
        input,
      )
      .then((r) => r.data),

  /**
   * Put the shipped configuration back. Credentials, company ID and the on/off
   * switch are kept server-side — this is a rescue, not a wipe.
   */
  restoreSettings: (): Promise<BdJobsSettingsView> =>
    http
      .post<ApiResponse<BdJobsSettingsView>>(
        '/integrations/bdjobs/settings/restore',
      )
      .then((r) => r.data),

  /** Tests the values currently in the form; blank secrets use the saved ones. */
  testConnection: (
    creds: Partial<
      Pick<
        BdJobsSettingsInput,
        'baseUrl' | 'companyId' | 'authToken' | 'decodeId' | 'signatureFormat'
      >
    > = {},
  ): Promise<{ ok: boolean; message: string }> =>
    http
      .post<ApiResponse<{ ok: boolean; message: string }>>(
        '/integrations/bdjobs/test',
        creds,
        { timeout: 30_000 },
      )
      .then((r) => r.data),

  getPost: (reqId: string): Promise<BdJobsPost | null> =>
    http
      .get<ApiResponse<BdJobsPost | null>>(`/requisitions/${reqId}/bdjobs`)
      .then((r) => r.data),

  post: (reqId: string, data: BdJobsFormData): Promise<BdJobsPost> =>
    http
      .post<ApiResponse<BdJobsPost>>(`/requisitions/${reqId}/bdjobs/post`, data)
      .then((r) => r.data),
};
