import { describe, expect, it } from 'vitest';

import { canAccessRecruitment, canViewCandidatePipeline } from './access';

const roles = (...keys: string[]) => ({
  isSuperUser: false,
  roles: keys.map((key) => ({ key, unitId: null, unitName: null })),
});

/**
 * Who the recruitment surfaces open for.
 *
 * The case that went wrong: a Corporate Recruiter went on leave and named a
 * stand-in. The API let the stand-in act on everything — the requisition even
 * appeared in their list — but this gate only ever asked about `recruiterId`,
 * so the page they opened had no pipeline, no assessment and no onboarding on
 * it. The requisition arrived and the process did not.
 */
describe('canAccessRecruitment', () => {
  const unit = 'Jinnat Textile Mills Ltd.';

  it('lets the assigned recruiter into their own requisition', () => {
    expect(
      canAccessRecruitment(roles('corporate_recruiter'), unit, {
        recruiterId: 'u1',
        myUserId: 'u1',
      }),
    ).toBe(true);
  });

  it('lets the stand-in covering that recruiter in as well', () => {
    expect(
      canAccessRecruitment(roles('corporate_recruiter'), unit, {
        recruiterId: 'u1',
        coverRecruiterId: 'u2',
        myUserId: 'u2',
      }),
    ).toBe(true);
  });

  it('keeps the recruiter in while they are covered — cover is additive', () => {
    expect(
      canAccessRecruitment(roles('corporate_recruiter'), unit, {
        recruiterId: 'u1',
        coverRecruiterId: 'u2',
        myUserId: 'u1',
      }),
    ).toBe(true);
  });

  it('does not let a third recruiter into somebody else’s requisition', () => {
    expect(
      canAccessRecruitment(roles('corporate_recruiter'), unit, {
        recruiterId: 'u1',
        coverRecruiterId: 'u2',
        myUserId: 'u3',
      }),
    ).toBe(false);
  });

  it('lets Head of Talent Acquisition and CHRO in regardless of assignment', () => {
    for (const key of ['corporate_hr', 'chro']) {
      expect(canAccessRecruitment(roles(key), unit)).toBe(true);
    }
    expect(canAccessRecruitment({ isSuperUser: true }, unit)).toBe(true);
  });

  it('scopes a unit-held role to its own unit', () => {
    const perms = {
      isSuperUser: false,
      roles: [
        { key: 'corporate_hr', unitId: 'unit-1', unitName: 'Mawna Fashions Ltd' },
      ],
    };
    expect(canAccessRecruitment(perms, 'Mawna Fashions Ltd')).toBe(true);
    expect(canAccessRecruitment(perms, unit)).toBe(false);
  });

  it('shows the pipeline pages to any Corporate Recruiter', () => {
    // Their own requisitions are only discoverable from there; what they see
    // is scoped server-side.
    expect(canViewCandidatePipeline(roles('corporate_recruiter'))).toBe(true);
    expect(canViewCandidatePipeline(roles('factory_hr'))).toBe(false);
  });
});
