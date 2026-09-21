import { describe, expect, it } from 'vitest';

import { defaultRequisitionTab, type RequisitionTabKey } from './defaultTab';
import type { CandidateStats } from './types/requisition.types';

const stats = (s: Partial<CandidateStats>): CandidateStats => ({
  applied: 0,
  ai_shortlisted: 0,
  shortlisted: 0,
  interview: 0,
  final: 0,
  selected: 0,
  rejected: 0,
  total: 0,
  ...s,
});

const hr: RequisitionTabKey[] = [
  'details',
  'approvals',
  'posting',
  'recruitment',
  'assessment',
  'interviews',
  'onboarding',
];
// Can see candidates but not run the later stages.
const viewer: RequisitionTabKey[] = [
  'details',
  'approvals',
  'posting',
  'recruitment',
];

const posted = (s: Partial<CandidateStats>, available = hr) =>
  defaultRequisitionTab({
    status: 'posted',
    driveReady: true,
    stats: stats(s),
    available,
  });

describe('defaultRequisitionTab', () => {
  it('opens a posted requisition on Recruitment while it is only sourcing', () => {
    expect(posted({ applied: 4, shortlisted: 2 })).toBe('recruitment');
  });

  it('goes to Interviews once anyone is being interviewed', () => {
    expect(posted({ shortlisted: 3, interview: 1 })).toBe('interviews');
    expect(posted({ final: 1 })).toBe('interviews');
  });

  it('goes to Onboarding once anyone is selected — the furthest stage wins', () => {
    expect(posted({ interview: 2, selected: 1 })).toBe('onboarding');
  });

  it('keeps other roles where they were', () => {
    expect(posted({ interview: 2, selected: 1 }, viewer)).toBe('recruitment');
  });

  it('waits for the Drive workspace before leaving Posting', () => {
    expect(
      defaultRequisitionTab({
        status: 'posted',
        driveReady: false,
        stats: stats({ selected: 1 }),
        available: hr,
      }),
    ).toBe('posting');
  });

  it('follows the status before posting', () => {
    const at = (status: 'draft' | 'pending_approval' | 'approved') =>
      defaultRequisitionTab({ status, driveReady: false, available: hr });
    expect(at('draft')).toBe('details');
    expect(at('pending_approval')).toBe('approvals');
    expect(at('approved')).toBe('posting');
  });
});
