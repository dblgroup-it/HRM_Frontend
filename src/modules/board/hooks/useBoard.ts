import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { boardApi } from '../api/board.api';

export const boardKeys = {
  groups: ['board-groups'] as const,
  approval: (candidateId: string) => ['board-approval', candidateId] as const,
  vote: (token: string) => ['board-vote', token] as const,
};

function errMsg(e: unknown, fallback: string) {
  const m = (e as { message?: string })?.message;
  return typeof m === 'string' ? m : fallback;
}

/* ── Board Groups ── */

export function useBoardGroups() {
  return useQuery({ queryKey: boardKeys.groups, queryFn: boardApi.listGroups });
}

export function useCreateBoardGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { name: string; description?: string }) => boardApi.createGroup(v.name, v.description),
    onSuccess: () => { qc.invalidateQueries({ queryKey: boardKeys.groups }); toast.success('Board group created'); },
    onError: (e) => toast.error(errMsg(e, 'Could not create group')),
  });
}

export function useUpdateBoardGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; name?: string; description?: string }) => boardApi.updateGroup(v.id, v.name, v.description),
    onSuccess: () => { qc.invalidateQueries({ queryKey: boardKeys.groups }); toast.success('Group updated'); },
    onError: (e) => toast.error(errMsg(e, 'Could not update group')),
  });
}

export function useDeleteBoardGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardApi.deleteGroup(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: boardKeys.groups }); toast.success('Group deleted'); },
    onError: (e) => toast.error(errMsg(e, 'Could not delete group')),
  });
}

export function useAddBoardMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { groupId: string; userIds: string[] }) => boardApi.addMembers(v.groupId, v.userIds),
    onSuccess: () => { qc.invalidateQueries({ queryKey: boardKeys.groups }); toast.success('Members added'); },
    onError: (e) => toast.error(errMsg(e, 'Could not add members')),
  });
}

export function useRemoveBoardMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { groupId: string; userId: string }) => boardApi.removeMember(v.groupId, v.userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: boardKeys.groups }); },
    onError: (e) => toast.error(errMsg(e, 'Could not remove member')),
  });
}

/* ── Board Approval ── */

export function useBoardApprovalStatus(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: boardKeys.approval(candidateId),
    queryFn: () => boardApi.getApprovalStatus(candidateId),
    enabled: Boolean(candidateId) && enabled,
  });
}

export function useHrBoardApprove(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, note }: { file: File; note?: string }) =>
      boardApi.hrApprove(candidateId, file, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.approval(candidateId) });
      toast.success('Board approval recorded');
    },
    onError: (e) => toast.error(errMsg(e, 'Could not record board approval')),
  });
}

/** Who the first link of the chain may be addressed to. */
export function useChainApprovers(candidateId: string, enabled = true) {
  return useQuery({
    queryKey: [...boardKeys.approval(candidateId), 'approvers'],
    queryFn: () => boardApi.listChainApprovers(candidateId),
    enabled,
  });
}

export function useSendBoardApproval(candidateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      memberIds: string[];
      corporateHrId?: string;
      chroId?: string;
    }) =>
      boardApi.sendForApproval(
        candidateId,
        vars.memberIds,
        vars.corporateHrId,
        vars.chroId,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.approval(candidateId) });
      toast.success('Board approval requests sent');
    },
    onError: (e) => toast.error(errMsg(e, 'Could not send board approval')),
  });
}

/* ── Public vote ── */

export function useVoteInfo(token: string) {
  return useQuery({
    queryKey: boardKeys.vote(token),
    queryFn: () => boardApi.getVoteInfo(token),
    retry: false,
  });
}

export function useSubmitVote(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      notes?: string;
      decision?: 'approved' | 'rejected';
    }) => boardApi.submitVote(token, vars.notes, vars.decision ?? 'approved'),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.vote(token) }),
    onError: (e) => toast.error(errMsg(e, 'Could not submit vote')),
  });
}

/* --- Hiring Approval Sheets --- */

export const sheetKeys = {
  inbox: ['board-approvals', 'inbox'] as const,
  sheets: ['board-sheets'] as const,
  sheet: (token: string) => ['board-sheet', token] as const,
};

/** Everything waiting on this Head of Talent Acquisition, ready to go onto a sheet. */
export function useHrInbox() {
  return useQuery({
    queryKey: sheetKeys.inbox,
    queryFn: () => boardApi.hrInbox(),
  });
}

export function useSheetApprovers(enabled = true) {
  return useQuery({
    queryKey: ['board-sheets', 'approvers'],
    queryFn: () => boardApi.sheetApprovers(),
    enabled,
  });
}

export function useSheets() {
  return useQuery({
    queryKey: sheetKeys.sheets,
    queryFn: () => boardApi.listSheets(),
  });
}

/** Mail the sheet's current stage again, to whoever still owes a reply. */
export function useResendSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => boardApi.resendSheet(batchId),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: sheetKeys.sheets });
      const who = r.stage === 'chro' ? 'the CHRO' : 'the board';
      toast.success(
        r.skipped.length
          ? `${r.reference} resent to ${r.sent} of ${who} — no email on file for ${r.skipped.join(', ')}`
          : `${r.reference} resent to ${who}`,
      );
    },
    onError: (e) => toast.error(errMsg(e, 'Could not resend the sheet')),
  });
}

/** Correct one row's CV-derived columns before the sheet goes out. */
export function useUpdateSheetRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      approvalId: string;
      education?: string | null;
      totalExperience?: string | null;
      lastOrganization?: string | null;
    }) => {
      const { approvalId, ...patch } = vars;
      return boardApi.updateSheetRow(approvalId, patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sheetKeys.inbox }),
    onError: (e) => toast.error(errMsg(e, 'Could not save')),
  });
}

export function useSendSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      approvalIds: string[];
      chroId: string;
      boardMemberIds: string[];
    }) => boardApi.sendSheet(vars.approvalIds, vars.chroId, vars.boardMemberIds),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: sheetKeys.inbox });
      void qc.invalidateQueries({ queryKey: sheetKeys.sheets });
      toast.success(
        `${r.reference} sent — ${r.candidates} candidate${r.candidates === 1 ? '' : 's'} on the sheet`,
      );
    },
    onError: (e) => toast.error(errMsg(e, 'Could not send the sheet')),
  });
}

export function useSheetVote(token: string) {
  return useQuery({
    queryKey: sheetKeys.sheet(token),
    queryFn: () => boardApi.getSheet(token),
    retry: false,
  });
}

export function useSubmitSheetVote(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { decision: 'approved' | 'rejected'; notes?: string }) =>
      boardApi.submitSheet(token, vars.decision, vars.notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: sheetKeys.sheet(token) }),
    onError: (e) => toast.error(errMsg(e, 'Could not submit your decision')),
  });
}
