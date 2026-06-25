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
  BdJobsSkill,
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

  getStatus: (): Promise<{ configured: boolean }> =>
    http
      .get<ApiResponse<{ configured: boolean }>>('/integrations/bdjobs/status')
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
