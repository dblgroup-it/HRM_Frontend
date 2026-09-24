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
  DelegateWorkload,
  DelegationBoard,
  BulkFirstInterviewOutcomeResult,
  FirstInterviewApprovalRow,
  FirstInterviewOutcomeResult,
  HeadDecision,
  HeadDecisionResult,
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

  /** What each named interviewer is currently carrying (send dialog). */
  delegateWorkload: (userIds: string[]): Promise<DelegateWorkload[]> =>
    http
      .post<ApiResponse<DelegateWorkload[]>>(
        '/interview-delegations/workload',
        { userIds },
      )
      .then((r) => r.data),

  /** The scoreboard: every delegation on a requisition and where it stands. */
  delegationBoard: (reqId: string): Promise<DelegationBoard> =>
    http
      .get<ApiResponse<DelegationBoard>>(
        `/requisitions/${reqId}/interview-delegations`,
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
  ): Promise<FirstInterviewOutcomeResult> =>
    http
      .post<ApiResponse<FirstInterviewOutcomeResult>>(
        `/candidates/${candidateId}/first-interview-outcome`,
        { outcome, note },
      )
      .then((r) => r.data),

  /** The same verdict for several candidates — per-candidate results. */
  firstInterviewOutcomeMany: (input: {
    candidateIds: string[];
    outcome: 'final' | 'rejected';
    note?: string;
  }): Promise<BulkFirstInterviewOutcomeResult> =>
    http
      .post<ApiResponse<BulkFirstInterviewOutcomeResult>>(
        '/first-interview-outcomes',
        input,
      )
      .then((r) => r.data),

  /** Finalists waiting on this Factory HR Head. */
  firstInterviewApprovals: (): Promise<FirstInterviewApprovalRow[]> =>
    http
      .get<ApiResponse<FirstInterviewApprovalRow[]>>('/first-interview-approvals')
      .then((r) => r.data),

  decideFirstInterviewApprovals: (input: {
    candidateIds: string[];
    decision: HeadDecision;
    note?: string;
  }): Promise<HeadDecisionResult> =>
    http
      .post<ApiResponse<HeadDecisionResult>>(
        '/first-interview-approvals/decide',
        input,
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

  /** Attach the marked answer script (PDF). Optional throughout. */
  uploadTestSheet: (
    candidateId: string,
    kind: 'written' | 'computer',
    file: File,
  ): Promise<ScreeningTests> => {
    const fd = new FormData();
    fd.append('file', file);
    return http
      .post<ApiResponse<ScreeningTests>>(
        `/candidates/${candidateId}/screening-tests/${kind}/sheet`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      .then((r) => r.data);
  },

  removeTestSheet: (
    candidateId: string,
    kind: 'written' | 'computer',
  ): Promise<ScreeningTests> =>
    http
      .delete<ApiResponse<ScreeningTests>>(
        `/candidates/${candidateId}/screening-tests/${kind}/sheet`,
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

  /** Append people to a panel that already exists — including mid-session. */
  addPanelists: (
    roundId: string,
    panelistUserIds: string[],
  ): Promise<InterviewRoundView> =>
    http
      .post<ApiResponse<InterviewRoundView>>(
        `/interviews/${roundId}/panelists`,
        { panelistUserIds },
      )
      .then((r) => r.data),

  /** What the candidate earns now, wants, and gets on top — taken in the room. */
  setCandidatePackage: (
    candidateId: string,
    input: {
      presentSalary?: number | null;
      salaryExpectation?: number | null;
      salaryBenefitsNote?: string | null;
      salaryBenefits?: string[];
      /** Where the transport run would pick them up. */
      transportPickup?: string | null;
    },
  ): Promise<{ id: string }> =>
    http
      .patch<ApiResponse<{ id: string }>>(
        `/candidates/${candidateId}/package`,
        input,
      )
      .then((r) => r.data),

  /** Turn the candidate down from the interview screen, at any round. */
  rejectAtInterview: (
    candidateId: string,
    reason?: string,
  ): Promise<{ id: string; name: string; stage: string }> =>
    http
      .post<ApiResponse<{ id: string; name: string; stage: string }>>(
        `/candidates/${candidateId}/interview-reject`,
        { reason },
      )
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
