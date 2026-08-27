import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  AddQuestionInput,
  AiProficiencyAttempt,
  AiProficiencyBank,
  AiProficiencyReview,
  AssignTestInput,
  BulkAddQuestionsInput,
  GeneratedQuestion,
  GenerateQuestionsInput,
  PublicAiProficiencyData,
  UpdateQuestionInput,
} from '../types/aiProficiency.types';

export const aiProficiencyApi = {
  getBank: (params: { search?: string; grade?: string; page?: number }): Promise<AiProficiencyBank> => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.grade) q.set('grade', params.grade);
    if (params.page) q.set('page', String(params.page));
    return http
      .get<ApiResponse<AiProficiencyBank>>(`/ai-proficiency/questions?${q}`)
      .then((r) => r.data);
  },

  addQuestion: (input: AddQuestionInput) =>
    http
      .post<ApiResponse<AiProficiencyBank['questions'][number]>>('/ai-proficiency/questions', input)
      .then((r) => r.data),

  updateQuestion: (id: string, input: UpdateQuestionInput) =>
    http
      .patch<ApiResponse<AiProficiencyBank['questions'][number]>>(`/ai-proficiency/questions/${id}`, input)
      .then((r) => r.data),

  removeQuestion: (id: string) =>
    http.delete<ApiResponse<{ ok: true }>>(`/ai-proficiency/questions/${id}`).then((r) => r.data),

  bulkRemoveQuestions: (ids: string[]): Promise<{ ok: true; count: number }> =>
    http
      .post<ApiResponse<{ ok: true; count: number }>>('/ai-proficiency/questions/bulk-delete', { ids })
      .then((r) => r.data),

  generateQuestions: (input: GenerateQuestionsInput): Promise<{ items: GeneratedQuestion[] }> =>
    http
      .post<ApiResponse<{ items: GeneratedQuestion[] }>>(
        '/ai-proficiency/questions/generate',
        input,
        { timeout: 90_000 },
      )
      .then((r) => r.data),

  bulkAddQuestions: (
    input: BulkAddQuestionsInput,
  ): Promise<{ questions: AiProficiencyBank['questions']; count: number }> =>
    http
      .post<ApiResponse<{ questions: AiProficiencyBank['questions']; count: number }>>(
        '/ai-proficiency/questions/bulk',
        input,
      )
      .then((r) => r.data),

  getStatus: (candidateId: string): Promise<AiProficiencyAttempt | null> =>
    http
      .get<ApiResponse<AiProficiencyAttempt | null>>(`/candidates/${candidateId}/ai-proficiency`)
      .then((r) => r.data),

  assignTest: (candidateId: string, input: AssignTestInput): Promise<AiProficiencyAttempt> =>
    http
      .post<ApiResponse<AiProficiencyAttempt>>(`/candidates/${candidateId}/ai-proficiency`, input)
      .then((r) => r.data),

  getReview: (candidateId: string): Promise<AiProficiencyReview> =>
    http
      .get<ApiResponse<AiProficiencyReview>>(`/candidates/${candidateId}/ai-proficiency/review`)
      .then((r) => r.data),

  publicGet: (token: string): Promise<PublicAiProficiencyData> =>
    http.get<ApiResponse<PublicAiProficiencyData>>(`/ai-proficiency/${token}`).then((r) => r.data),

  publicStart: (token: string): Promise<{ startedAt: string }> =>
    http
      .post<ApiResponse<{ startedAt: string }>>(`/ai-proficiency/${token}/start`)
      .then((r) => r.data),

  publicSubmit: (
    token: string,
    answers: Record<string, string>,
    reason?: 'time_up' | 'violation',
  ): Promise<{ ok: boolean; totalScore: number; maxScore: number }> =>
    http
      .post<ApiResponse<{ ok: boolean; totalScore: number; maxScore: number }>>(
        `/ai-proficiency/${token}`,
        { answers, reason },
      )
      .then((r) => r.data),

  publicRecordViolation: (
    token: string,
    payload: { leftAt: string; returnedAt: string | null; endedTest: boolean },
  ): Promise<{ violationCount: number }> =>
    http
      .post<ApiResponse<{ violationCount: number }>>(`/ai-proficiency/${token}/violation`, payload)
      .then((r) => r.data),
};
