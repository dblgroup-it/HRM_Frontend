import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  AssessmentSetup,
  DelegatedCandidate,
  DelegationTests,
  InterviewDelegation,
  BulkScheduleInput,
  EvaluationSummaryResult,
  InterviewRoundView,
  MyInterviewRound,
  PublicEvalData,
  ScheduleInterviewInput,
  ScorecardEntry,
  ScreeningTests,
  ScreeningTestsInput,
  SubmitEvaluationInput,
} from '../types/assessment.types';

export const assessmentApi = {
  /** Hand shortlisted candidates to the people who will interview them. */
  delegateInterviews: (
    candidateIds: string[],
    delegateUserIds: string[],
    note?: string,
    tests?: DelegationTests,
  ): Promise<{ delegated: number }> =>
    http
      .post<ApiResponse<{ delegated: number }>>('/interview-delegations', {
        candidateIds,
        delegateUserIds,
        note,
        tests,
      })
      .then((r) => r.data),

  myDelegatedCandidates: (): Promise<DelegatedCandidate[]> =>
    http
      .get<ApiResponse<DelegatedCandidate[]>>('/my-delegated-candidates')
      .then((r) => r.data),

  listDelegations: (candidateId: string): Promise<InterviewDelegation[]> =>
    http
      .get<ApiResponse<InterviewDelegation[]>>(
        `/candidates/${candidateId}/interview-delegations`,
      )
      .then((r) => r.data),

  revokeDelegation: (
    candidateId: string,
    delegateUserId: string,
  ): Promise<{ success: boolean }> =>
    http
      .delete<ApiResponse<{ success: boolean }>>(
        `/candidates/${candidateId}/interview-delegations/${delegateUserId}`,
      )
      .then((r) => r.data),

  /** First-interview verdict: move the candidate on, or stop them here. */
  firstInterviewOutcome: (
    candidateId: string,
    outcome: 'final' | 'rejected',
    note?: string,
  ): Promise<{ id: string; name: string; stage: string }> =>
    http
      .post<ApiResponse<{ id: string; name: string; stage: string }>>(
        `/candidates/${candidateId}/first-interview-outcome`,
        { outcome, note },
      )
      .then((r) => r.data),

  /** Hand-marked screening tests for one candidate — no salary information. */
  screeningTests: (candidateId: string): Promise<ScreeningTests> =>
    http
      .get<ApiResponse<ScreeningTests>>(`/candidates/${candidateId}/screening-tests`)
      .then((r) => r.data),

  saveScreeningTests: (
    candidateId: string,
    input: ScreeningTestsInput,
  ): Promise<ScreeningTests> =>
    http
      .patch<ApiResponse<ScreeningTests>>(
        `/candidates/${candidateId}/screening-tests`,
        input,
      )
      .then((r) => r.data),

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
