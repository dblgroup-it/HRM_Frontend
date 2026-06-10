import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { assessmentApi } from '../api/assessment.api';
import type {
  AddExamQuestionInput,
  AssessmentComponentInput,
  AssessmentSetup,
  ExamAttemptsResult,
  ExamBank,
  ExamTypeKey,
  MyInterviewRound,
  RubricCriterionInput,
  ScheduleInterviewInput,
  SubmitEvaluationInput,
} from '../types/assessment.types';

export const assessmentKeys = {
  setup: (reqId: string) => ['assessment', reqId] as const,
  interviews: (candidateId: string) =>
    ['interviews', 'candidate', candidateId] as const,
  myInterviews: ['my-interviews'] as const,
  examBank: (reqId: string) => ['exam-bank', reqId] as const,
  candidateExams: (candidateId: string) =>
    ['exams', 'candidate', candidateId] as const,
};

function errMsg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

export function useAssessmentSetup(reqId: string, enabled = true) {
  return useQuery({
    queryKey: assessmentKeys.setup(reqId),
    queryFn: () => assessmentApi.getSetup(reqId),
    enabled: Boolean(reqId) && enabled,
  });
}

function useSetupMutation<TVars>(
  reqId: string,
  fn: (vars: TVars) => Promise<AssessmentSetup>,
  successMsg?: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(assessmentKeys.setup(reqId), data);
      if (successMsg) toast.success(successMsg);
    },
    onError: (error) => toast.error(errMsg(error, 'Could not save')),
  });
}

export function useAddCommitteeMember(reqId: string) {
  return useSetupMutation(
    reqId,
    (vars: { memberUserId: string; role?: string }) =>
      assessmentApi.addMember(reqId, vars.memberUserId, vars.role),
    'Committee member added',
  );
}

export function useRemoveCommitteeMember(reqId: string) {
  return useSetupMutation(reqId, (memberId: string) =>
    assessmentApi.removeMember(memberId),
  );
}

export function useSetRubric(reqId: string) {
  return useSetupMutation(
    reqId,
    (criteria: RubricCriterionInput[]) =>
      assessmentApi.setRubric(reqId, criteria),
    'Rubric saved',
  );
}

export function useSetPlan(reqId: string) {
  return useSetupMutation(reqId, (components: AssessmentComponentInput[]) =>
    assessmentApi.setPlan(reqId, components),
  );
}

export function useGenerateQuestions(reqId: string) {
  return useSetupMutation(
    reqId,
    () => assessmentApi.generateQuestions(reqId),
    'Interview questions generated',
  );
}

// --- interviews ---

export function useCandidateInterviews(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: assessmentKeys.interviews(candidateId),
    queryFn: () => assessmentApi.candidateInterviews(candidateId),
    enabled: Boolean(candidateId) && enabled,
  });
}

export function useScheduleInterview(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleInterviewInput) =>
      assessmentApi.scheduleInterview(candidateId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assessmentKeys.interviews(candidateId) });
      qc.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Interview scheduled');
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not schedule the interview')),
  });
}

export function useRemoveInterview(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roundId: string) => assessmentApi.removeInterview(roundId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assessmentKeys.interviews(candidateId) });
      qc.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Interview removed');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not remove')),
  });
}

// --- committee marking ("My Interviews") ---

export function useMyInterviews() {
  return useQuery({
    queryKey: assessmentKeys.myInterviews,
    queryFn: () => assessmentApi.myInterviews(),
  });
}

export function useSubmitEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { roundId: string; input: SubmitEvaluationInput }) =>
      assessmentApi.submitEvaluation(vars.roundId, vars.input),
    onSuccess: (data: MyInterviewRound[]) => {
      qc.setQueryData(assessmentKeys.myInterviews, data);
      qc.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Marks submitted');
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not submit your marks')),
  });
}

// --- online exams ---

export function useExamBank(reqId: string, enabled = true) {
  return useQuery({
    queryKey: assessmentKeys.examBank(reqId),
    queryFn: () => assessmentApi.examBank(reqId),
    enabled: Boolean(reqId) && enabled,
  });
}

export function useAddExamQuestion(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddExamQuestionInput) =>
      assessmentApi.addExamQuestion(reqId, input),
    onSuccess: (data: ExamBank) => {
      qc.setQueryData(assessmentKeys.examBank(reqId), data);
      toast.success('Question added');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not add the question')),
  });
}

export function useRemoveExamQuestion(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (qid: string) => assessmentApi.removeExamQuestion(qid),
    onSuccess: (data: ExamBank) =>
      qc.setQueryData(assessmentKeys.examBank(reqId), data),
    onError: (error) => toast.error(errMsg(error, 'Could not remove')),
  });
}

export function useCandidateExams(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: assessmentKeys.candidateExams(candidateId),
    queryFn: () => assessmentApi.candidateExams(candidateId),
    enabled: Boolean(candidateId) && enabled,
  });
}

export function useCreateExamAttempt(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { examType: ExamTypeKey; notifyCandidate: boolean }) =>
      assessmentApi.createExamAttempt(
        candidateId,
        vars.examType,
        vars.notifyCandidate,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: assessmentKeys.candidateExams(candidateId),
      });
      toast.success('Exam link created');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not create the exam')),
  });
}

export function useGradeExam(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: string) => assessmentApi.gradeExam(attemptId),
    onSuccess: (data: ExamAttemptsResult) => {
      qc.setQueryData(assessmentKeys.candidateExams(candidateId), data);
      toast.success('Graded with AI');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not grade')),
  });
}

export function usePublicExam(token: string) {
  return useQuery({
    queryKey: ['public-exam', token],
    queryFn: () => assessmentApi.publicExam(token),
    enabled: Boolean(token),
    retry: false,
  });
}
