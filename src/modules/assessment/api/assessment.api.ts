import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  AssessmentSetup,
  BulkScheduleInput,
  EvaluationSummaryResult,
  InterviewRoundView,
  MyInterviewRound,
  PublicEvalData,
  ScheduleInterviewInput,
  ScorecardEntry,
  SubmitEvaluationInput,
} from '../types/assessment.types';

export const assessmentApi = {
  getSetup: (reqId: string): Promise<AssessmentSetup> =>
    http
      .get<ApiResponse<AssessmentSetup>>(`/requisitions/${reqId}/assessment`)
      .then((r) => r.data),

  addMember: (
    reqId: string,
    memberUserId: string,
    role = 'interviewer',
  ): Promise<AssessmentSetup> =>
    http
      .post<ApiResponse<AssessmentSetup>>(`/requisitions/${reqId}/committee`, {
        memberUserId,
        role,
      })
      .then((r) => r.data),

  removeMember: (memberId: string): Promise<AssessmentSetup> =>
    http
      .delete<ApiResponse<AssessmentSetup>>(`/committee/${memberId}`)
      .then((r) => r.data),

  // --- interviews ---
  candidateInterviews: (candidateId: string): Promise<InterviewRoundView[]> =>
    http
      .get<ApiResponse<InterviewRoundView[]>>(
        `/candidates/${candidateId}/interviews`,
      )
      .then((r) => r.data),

  scheduleInterview: (
    candidateId: string,
    input: ScheduleInterviewInput,
  ): Promise<InterviewRoundView> =>
    http
      .post<ApiResponse<InterviewRoundView>>(
        `/candidates/${candidateId}/interviews`,
        input,
      )
      .then((r) => r.data),

  removeInterview: (roundId: string): Promise<{ id: string }> =>
    http
      .delete<ApiResponse<{ id: string }>>(`/interviews/${roundId}`)
      .then((r) => r.data),

  updateInterview: (
    roundId: string,
    data: { status?: string },
  ): Promise<{ id: string }> =>
    http
      .patch<ApiResponse<{ id: string }>>(`/interviews/${roundId}`, data)
      .then((r) => r.data),

  bulkScheduleInterviews: (input: BulkScheduleInput): Promise<InterviewRoundView[]> =>
    http
      .post<ApiResponse<InterviewRoundView[]>>('/interviews/bulk', input)
      .then((r) => r.data),

  // --- committee marking ---
  myInterviews: (): Promise<MyInterviewRound[]> =>
    http
      .get<ApiResponse<MyInterviewRound[]>>('/my-interviews')
      .then((r) => r.data),

  submitEvaluation: (
    roundId: string,
    input: SubmitEvaluationInput,
  ): Promise<MyInterviewRound[]> =>
    http
      .post<ApiResponse<MyInterviewRound[]>>(
        `/interviews/${roundId}/evaluation`,
        input,
      )
      .then((r) => r.data),

  // --- scorecard + deliberation notes ---
  getScorecard: (reqId: string): Promise<ScorecardEntry[]> =>
    http
      .get<ApiResponse<ScorecardEntry[]>>(
        `/requisitions/${reqId}/assessment/scorecard`,
      )
      .then((r) => r.data),

  saveNotes: (reqId: string, notes: string): Promise<{ ok: boolean }> =>
    http
      .patch<ApiResponse<{ ok: boolean }>>(
        `/requisitions/${reqId}/assessment/notes`,
        { notes },
      )
      .then((r) => r.data),

  generateEvaluationSummary: (candidateId: string): Promise<EvaluationSummaryResult> =>
    http
      .post<ApiResponse<EvaluationSummaryResult>>(
        `/candidates/${candidateId}/evaluation-summary`,
        undefined,
        { timeout: 60_000 },
      )
      .then((r) => r.data),

  // public — one-click panelist evaluation (no login)
  publicEval: (token: string): Promise<PublicEvalData> =>
    http.get<ApiResponse<PublicEvalData>>(`/eval/${token}`).then((r) => r.data),

  submitPublicEval: (
    token: string,
    input: SubmitEvaluationInput,
  ): Promise<{ ok: boolean; total: number }> =>
    http
      .post<ApiResponse<{ ok: boolean; total: number }>>(`/eval/${token}`, input)
      .then((r) => r.data),

  // resend eval link for a panelist (Corp HR only)
  resendEvalToken: (
    roundId: string,
    panelistUserId: string,
  ): Promise<{ evalLink: string }> =>
    http
      .post<ApiResponse<{ evalLink: string }>>(
        `/interviews/${roundId}/eval-token/${panelistUserId}/resend`,
        undefined,
      )
      .then((r) => r.data),
};
