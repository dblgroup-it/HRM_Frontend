import type { BoardApproval, BoardApprovalStage } from '../types/board.types';

export const BOARD_STAGE_ORDER: BoardApprovalStage[] = ['corporate_hr', 'chro', 'board'];

export type BoardStageState = 'approved' | 'rejected' | 'waiting' | 'upcoming';

/**
 * Where one link of the chain stands.
 *
 * Read from `currentStage`, not only from this candidate's votes: once Head of
 * Talent Acquisition puts the candidate on a sheet, the CHRO and board vote on
 * the sheet, so the candidate's own vote list stays empty and every link used
 * to read "Not yet sent" while it was in fact with the CHRO.
 */
export function boardStageState(
  approval: Pick<BoardApproval, 'status' | 'currentStage' | 'votes'>,
  stage: BoardApprovalStage,
): BoardStageState {
  const votes = approval.votes.filter((v) => v.stage === stage);
  if (votes.some((v) => v.status === 'rejected')) return 'rejected';
  if (votes.some((v) => v.status === 'approved')) return 'approved';

  const here = BOARD_STAGE_ORDER.indexOf(stage);
  const current = BOARD_STAGE_ORDER.indexOf(approval.currentStage);
  if (approval.status === 'approved') return 'approved';
  if (here < current) return 'approved';
  if (here === current) return approval.status === 'rejected' ? 'rejected' : 'waiting';
  return 'upcoming';
}

/** True while the request sits with the CHRO or board on a sheet — out of the recruiter's hands. */
export function isOnSheet(
  approval: Pick<BoardApproval, 'status' | 'currentStage'> | null | undefined,
): boolean {
  return approval?.status === 'pending' && approval.currentStage !== 'corporate_hr';
}
