import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { assessmentApi } from '../api/assessment.api';
import type {
  AssessmentSetup,
  BulkScheduleInput,
  EvaluationSummaryResult,
  MyInterviewRound,
  ScheduleInterviewInput,
  DelegationTests,
  ScorecardEntry,
  ScreeningTests,
  ScreeningTestsInput,
  SubmitEvaluationInput,
} from '../types/assessment.types';

export const assessmentKeys = {
  setup: (reqId: string) => ['assessment', reqId] as const,
  scorecard: (reqId: string) => ['assessment-scorecard', reqId] as const,
  interviews: (candidateId: string) =>
    ['interviews', 'candidate', candidateId] as const,
  myInterviews: ['my-interviews'] as const,
};

export const delegationKeys = {
  mine: ['my-delegated-candidates'] as const,
  forCandidate: (candidateId: string) =>
    ['interview-delegations', candidateId] as const,
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

// --- scorecard + deliberation notes ---

export function useScorecard(reqId: string, enabled = true) {
  return useQuery<ScorecardEntry[]>({
    queryKey: assessmentKeys.scorecard(reqId),
    queryFn: () => assessmentApi.getScorecard(reqId),
    enabled: Boolean(reqId) && enabled,
  });
}

export function useSaveNotes(reqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notes: string) => assessmentApi.saveNotes(reqId, notes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assessmentKeys.setup(reqId) });
      toast.success('Deliberation notes saved');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not save notes')),
  });
}

export function useGenerateEvaluationSummary() {
  return useMutation<EvaluationSummaryResult, unknown, string>({
    mutationFn: (candidateId: string) =>
      assessmentApi.generateEvaluationSummary(candidateId),
    onError: (error) =>
      toast.error(errMsg(error, 'Could not generate summary')),
  });
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

export function useBulkScheduleInterviews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkScheduleInput) =>
      assessmentApi.bulkScheduleInterviews(input),
    onSuccess: (rounds) => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['candidates'] });
      toast.success(
        `${rounds.length} interview${rounds.length === 1 ? '' : 's'} scheduled`,
      );
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not schedule interviews')),
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

/**
 * @param silent Suppress the success toast so the caller can raise its own —
 *   the board does, because its toast carries an Undo.
 */
export function useUpdateInterview(candidateId: string, silent = false) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { roundId: string; status: string }) =>
      assessmentApi.updateInterview(vars.roundId, { status: vars.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assessmentKeys.interviews(candidateId) });
      // The delegate's board reads this too — without it a card stays put
      // after being moved.
      void qc.invalidateQueries({ queryKey: delegationKeys.mine });
      if (!silent) toast.success('Interview updated');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not update interview')),
  });
}

/**
 * Add people to a panel that is already arranged.
 *
 * Distinct from editing the interview: this only ever appends, and only the
 * newcomers are notified. Someone joining a session already in progress is
 * the case it exists for.
 */
export function useAddPanelists(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { roundId: string; panelistUserIds: string[] }) =>
      assessmentApi.addPanelists(vars.roundId, vars.panelistUserIds),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: assessmentKeys.interviews(candidateId),
      });
      void qc.invalidateQueries({ queryKey: assessmentKeys.myInterviews });
      void qc.invalidateQueries({ queryKey: delegationKeys.mine });
      toast.success('Interviewer added — their marking link is on its way');
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not add that interviewer')),
  });
}

/** What the candidate earns now, wants, and gets on top. */
export function useSetCandidatePackage(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      presentSalary?: number | null;
      salaryExpectation?: number | null;
      salaryBenefitsNote?: string | null;
      salaryBenefits?: string[];
      transportPickup?: string | null;
    }) => assessmentApi.setCandidatePackage(candidateId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: delegationKeys.mine });
      void qc.invalidateQueries({ queryKey: assessmentKeys.myInterviews });
      toast.success('Salary details saved');
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not save the salary details')),
  });
}

/** Turn the candidate down from the interview screen, at any round. */
export function useRejectAtInterview(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) =>
      assessmentApi.rejectAtInterview(candidateId, reason),
    onSuccess: (data) => {
      void qc.invalidateQueries({
        queryKey: assessmentKeys.interviews(candidateId),
      });
      void qc.invalidateQueries({ queryKey: delegationKeys.mine });
      toast.success(`${data.name} rejected`);
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not reject this candidate')),
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

// --- one-click panelist evaluation ---

export function usePublicEval(token: string) {
  return useQuery({
    queryKey: ['public-eval', token],
    queryFn: () => assessmentApi.publicEval(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useSubmitPublicEval(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitEvaluationInput) =>
      assessmentApi.submitPublicEval(token, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['public-eval', token] });
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not submit your evaluation')),
  });
}

export function useResendEvalToken(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { roundId: string; panelistUserId: string }) =>
      assessmentApi.resendEvalToken(vars.roundId, vars.panelistUserId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assessmentKeys.interviews(candidateId) });
      toast.success('New evaluation link generated');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not resend link')),
  });
}


/** Hand-marked screening tests for one candidate. */
export function useScreeningTests(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: ['screening-tests', candidateId],
    queryFn: () => assessmentApi.screeningTests(candidateId),
    enabled: Boolean(candidateId) && enabled,
  });
}

export function useSaveScreeningTests(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScreeningTestsInput) =>
      assessmentApi.saveScreeningTests(candidateId, input),
    onSuccess: (data) => {
      qc.setQueryData(['screening-tests', candidateId], data);
      void qc.invalidateQueries({ queryKey: ['salary-fixation'] });
      // The worklist card shows these marks and gates the verdict on them.
      void qc.invalidateQueries({ queryKey: delegationKeys.mine });
      toast.success('Test marks saved');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not save the marks')),
  });
}

/** Attach or detach the marked answer script for a hand-marked test. */
export function useTestSheet(candidateId: string) {
  const qc = useQueryClient();
  const applied = (data: ScreeningTests) => {
    qc.setQueryData(['screening-tests', candidateId], data);
    void qc.invalidateQueries({ queryKey: ['salary-fixation'] });
  };
  const upload = useMutation({
    mutationFn: ({ kind, file }: { kind: 'written' | 'computer'; file: File }) =>
      assessmentApi.uploadTestSheet(candidateId, kind, file),
    onSuccess: (data) => {
      applied(data);
      toast.success('Exam sheet attached');
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not attach the exam sheet')),
  });
  const remove = useMutation({
    mutationFn: (kind: 'written' | 'computer') =>
      assessmentApi.removeTestSheet(candidateId, kind),
    onSuccess: (data) => {
      applied(data);
      toast.success('Exam sheet removed');
    },
    onError: (error) => toast.error(errMsg(error, 'Could not remove it')),
  });
  return { upload, remove };
}

/** Candidates handed to me to arrange the first interview for. */
export function useMyDelegatedCandidates() {
  return useQuery({
    queryKey: delegationKeys.mine,
    queryFn: () => assessmentApi.myDelegatedCandidates(),
    // The sidebar reads this too, to decide whether to show the nav item;
    // holding it a while keeps that from refetching on every page change.
    staleTime: 5 * 60 * 1000,
  });
}

export function useCandidateDelegations(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: delegationKeys.forCandidate(candidateId),
    queryFn: () => assessmentApi.listDelegations(candidateId),
    enabled,
  });
}

/** Send shortlisted candidates to interviewers — bulk on both axes. */
export function useDelegateInterviews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      candidateIds: string[];
      delegateUserIds: string[];
      note?: string;
      tests?: DelegationTests;
    }) =>
      assessmentApi.delegateInterviews(
        vars.candidateIds,
        vars.delegateUserIds,
        vars.note,
        vars.tests,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: delegationKeys.mine });
      void qc.invalidateQueries({ queryKey: ['interview-delegations'] });
      // The scoreboard and the workload counts both move on every send.
      void qc.invalidateQueries({ queryKey: ['interview-delegation-board'] });
      void qc.invalidateQueries({
        queryKey: ['interview-delegate-workload'],
      });
    },
  });
}

export function useRevokeDelegation(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (delegateUserId: string) =>
      assessmentApi.revokeDelegation(candidateId, delegateUserId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: delegationKeys.forCandidate(candidateId),
      });
    },
  });
}

/**
 * Record the verdict of the first interview.
 *
 * Whoever ran the session decides only this much: the candidate goes to the
 * final round, or stops here. Everything after that belongs to Head of Talent Acquisition.
 */
export function useFirstInterviewOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      candidateId: string;
      outcome: 'final' | 'rejected';
      note?: string;
    }) =>
      assessmentApi.firstInterviewOutcome(
        vars.candidateId,
        vars.outcome,
        vars.note,
      ),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: delegationKeys.mine });
      void qc.invalidateQueries({ queryKey: ['candidates'] });
      toast.success(
        data.stage === 'FINAL' || data.stage === 'final'
          ? `${data.name} moved to the final round`
          : `${data.name} was rejected after the first interview`,
      );
    },
    onError: (error) =>
      toast.error(errMsg(error, 'Could not record the outcome')),
  });
}

/**
 * What each interviewer in the picker is currently carrying.
 *
 * Keyed on the sorted id list so paging the search does not thrash the cache,
 * and kept fresh for a minute — a workload count does not need to be live, but
 * it must not be stale from an earlier sitting.
 */
export function useDelegateWorkload(userIds: string[]) {
  const key = [...userIds].sort();
  return useQuery({
    queryKey: ['interview-delegate-workload', key] as const,
    queryFn: () => assessmentApi.delegateWorkload(key),
    enabled: key.length > 0,
    staleTime: 60_000,
  });
}

/** The requisition delegation scoreboard. */
export function useDelegationBoard(reqId: string | undefined) {
  return useQuery({
    queryKey: ['interview-delegation-board', reqId] as const,
    queryFn: () => assessmentApi.delegationBoard(reqId!),
    enabled: Boolean(reqId),
  });
}
