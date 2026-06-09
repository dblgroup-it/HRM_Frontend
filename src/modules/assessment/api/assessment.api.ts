import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

import type {
  AddExamQuestionInput,
  AssessmentComponentInput,
  AssessmentSetup,
  ExamAttemptsResult,
  ExamAttemptView,
  ExamBank,
  ExamTypeKey,
  InterviewRoundView,
  MyInterviewRound,
  PublicExam,
  RubricCriterionInput,
  ScheduleInterviewInput,
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

  setRubric: (
    reqId: string,
    criteria: RubricCriterionInput[],
  ): Promise<AssessmentSetup> =>
    http
      .put<ApiResponse<AssessmentSetup>>(`/requisitions/${reqId}/rubric`, {
        criteria,
      })
      .then((r) => r.data),

  setPlan: (
    reqId: string,
    components: AssessmentComponentInput[],
  ): Promise<AssessmentSetup> =>
    http
      .put<ApiResponse<AssessmentSetup>>(
        `/requisitions/${reqId}/assessment-plan`,
        { components },
      )
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

  // --- online exams ---
  examBank: (reqId: string): Promise<ExamBank> =>
    http
      .get<ApiResponse<ExamBank>>(`/requisitions/${reqId}/exam-bank`)
      .then((r) => r.data),

  addExamQuestion: (
    reqId: string,
    input: AddExamQuestionInput,
  ): Promise<ExamBank> =>
    http
      .post<ApiResponse<ExamBank>>(`/requisitions/${reqId}/exam-questions`, input)
      .then((r) => r.data),

  removeExamQuestion: (qid: string): Promise<ExamBank> =>
    http
      .delete<ApiResponse<ExamBank>>(`/exam-questions/${qid}`)
      .then((r) => r.data),

  candidateExams: (candidateId: string): Promise<ExamAttemptsResult> =>
    http
      .get<ApiResponse<ExamAttemptsResult>>(`/candidates/${candidateId}/exams`)
      .then((r) => r.data),

  createExamAttempt: (
    candidateId: string,
    examType: ExamTypeKey,
    notifyCandidate: boolean,
  ): Promise<ExamAttemptView & { link: string }> =>
    http
      .post<ApiResponse<ExamAttemptView & { link: string }>>(
        `/candidates/${candidateId}/exams`,
        { examType, notifyCandidate },
      )
      .then((r) => r.data),

  gradeExam: (attemptId: string): Promise<ExamAttemptsResult> =>
    http
      .post<ApiResponse<ExamAttemptsResult>>(
        `/exam-attempts/${attemptId}/grade`,
        undefined,
        { timeout: 90_000 },
      )
      .then((r) => r.data),

  // public (candidate)
  publicExam: (token: string): Promise<PublicExam> =>
    http.get<ApiResponse<PublicExam>>(`/exam/${token}`).then((r) => r.data),

  submitExam: (
    token: string,
    answers: Record<string, string>,
  ): Promise<{ ok: boolean }> =>
    http
      .post<ApiResponse<{ ok: boolean }>>(`/exam/${token}`, { answers })
      .then((r) => r.data),
};
