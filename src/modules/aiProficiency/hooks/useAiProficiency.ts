import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { aiProficiencyApi } from '../api/aiProficiency.api';
import type {
  AddQuestionInput,
  AssignTestInput,
  BulkAddQuestionsInput,
  GenerateQuestionsInput,
  PublicAiProficiencyData,
  UpdateQuestionInput,
} from '../types/aiProficiency.types';

export const aiProficiencyKeys = {
  bank: (params: { search?: string; grade?: string; page?: number }) =>
    ['ai-proficiency-bank', params] as const,
  status: (candidateId: string) => ['ai-proficiency-status', candidateId] as const,
  review: (candidateId: string) => ['ai-proficiency-review', candidateId] as const,
  public: (token: string) => ['ai-proficiency-public', token] as const,
};

function errMsg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

export function useAiProficiencyBank(params: { search?: string; grade?: string; page?: number }) {
  return useQuery({
    queryKey: aiProficiencyKeys.bank(params),
    queryFn: () => aiProficiencyApi.getBank(params),
  });
}

export function useAddQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddQuestionInput) => aiProficiencyApi.addQuestion(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-proficiency-bank'] });
      toast.success('Question added');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not add question')),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateQuestionInput }) =>
      aiProficiencyApi.updateQuestion(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-proficiency-bank'] });
      toast.success('Question updated');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not update question')),
  });
}

export function useRemoveQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiProficiencyApi.removeQuestion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-proficiency-bank'] });
      toast.success('Question removed');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not remove question')),
  });
}

export function useBulkRemoveQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => aiProficiencyApi.bulkRemoveQuestions(ids),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai-proficiency-bank'] });
      toast.success(`${data.count} question${data.count === 1 ? '' : 's'} removed`);
    },
    onError: (error) => toast.error(errMsg(error, 'Could not remove questions')),
  });
}

/** Ask the AI for a batch of candidate questions — nothing is saved yet, caller reviews first. */
export function useGenerateQuestions() {
  return useMutation({
    mutationFn: (input: GenerateQuestionsInput) => aiProficiencyApi.generateQuestions(input),
    onError: (error) => toast.error(errMsg(error, 'Could not generate questions')),
  });
}

export function useBulkAddQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkAddQuestionsInput) => aiProficiencyApi.bulkAddQuestions(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai-proficiency-bank'] });
      toast.success(`${data.count} question${data.count === 1 ? '' : 's'} added to the bank`);
    },
    onError: (error) => toast.error(errMsg(error, 'Could not save questions')),
  });
}

export function useAiProficiencyStatus(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: aiProficiencyKeys.status(candidateId),
    queryFn: () => aiProficiencyApi.getStatus(candidateId),
    enabled: Boolean(candidateId) && enabled,
  });
}

export function useAssignAiProficiencyTest(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignTestInput) => aiProficiencyApi.assignTest(candidateId, input),
    onSuccess: (data) => {
      qc.setQueryData(aiProficiencyKeys.status(candidateId), data);
      toast.success('AI Proficiency Test assigned');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not assign test')),
  });
}

/** Assign the same test (grade + question count) to many candidates at once. */
export function useBulkAssignAiProficiencyTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      candidateIds,
      input,
    }: {
      candidateIds: string[];
      input: AssignTestInput;
    }) => {
      const results = await Promise.allSettled(
        candidateIds.map((id) => aiProficiencyApi.assignTest(id, input)),
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      return { succeeded, failed, total: results.length };
    },
    onSuccess: ({ succeeded, failed, total }, { candidateIds }) => {
      for (const id of candidateIds) {
        qc.invalidateQueries({ queryKey: aiProficiencyKeys.status(id) });
      }
      if (failed === 0) {
        toast.success(`AI Proficiency Test assigned to ${succeeded} candidate${succeeded === 1 ? '' : 's'}`);
      } else {
        toast.warning(`Assigned to ${succeeded} of ${total} — ${failed} failed (already has a pending test?)`);
      }
    },
    onError: (error) => toast.error(errMsg(error, 'Could not assign tests')),
  });
}

export function useAiProficiencyReview(candidateId: string, enabled: boolean) {
  return useQuery({
    queryKey: aiProficiencyKeys.review(candidateId),
    queryFn: () => aiProficiencyApi.getReview(candidateId),
    enabled: Boolean(candidateId) && enabled,
  });
}

export function usePublicAiProficiency(token: string) {
  return useQuery({
    queryKey: aiProficiencyKeys.public(token),
    queryFn: () => aiProficiencyApi.publicGet(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useSubmitAiProficiency(token: string) {
  return useMutation({
    mutationFn: (vars: { answers: Record<string, string>; reason?: 'time_up' | 'violation' }) =>
      aiProficiencyApi.publicSubmit(token, vars.answers, vars.reason),
  });
}

export function useStartAiProficiency(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => aiProficiencyApi.publicStart(token),
    onSuccess: ({ startedAt }) => {
      qc.setQueryData<PublicAiProficiencyData | undefined>(
        aiProficiencyKeys.public(token),
        (prev) => (prev ? { ...prev, startedAt } : prev),
      );
    },
  });
}

export function useRecordAiProficiencyViolation(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { leftAt: string; returnedAt: string | null; endedTest: boolean }) =>
      aiProficiencyApi.publicRecordViolation(token, payload),
    onSuccess: ({ violationCount }) => {
      qc.setQueryData<PublicAiProficiencyData | undefined>(
        aiProficiencyKeys.public(token),
        (prev) => (prev ? { ...prev, violationCount } : prev),
      );
    },
  });
}
