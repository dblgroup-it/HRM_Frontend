import { describe, expect, it } from 'vitest';

import {
  canAccessMedical,
  canApproveMedical,
  holdsCentralMedicalRole,
  holdsMedicalExaminerRole,
  isMedicalOnly,
} from './access';

const roles = (...keys: string[]) => ({
  roles: keys.map((key) => ({ key, unitId: null })),
});

describe('canApproveMedical', () => {
  it('admits the Central Medical Officer', () => {
    expect(canApproveMedical(roles('central_medical_officer'))).toBe(true);
  });

  it('does NOT admit an examining officer', () => {
    // The whole point of the layer: the person who made the finding is not the
    // person who confirms it.
    expect(canApproveMedical(roles('medical_officer'))).toBe(false);
  });

  it('admits a super user', () => {
    expect(canApproveMedical({ isSuperUser: true })).toBe(true);
  });

  it('refuses when permissions have not loaded', () => {
    expect(canApproveMedical(undefined)).toBe(false);
  });
});

describe('isMedicalOnly', () => {
  it('is true for an examining officer with nothing else', () => {
    expect(isMedicalOnly(roles('medical_officer'))).toBe(true);
  });

  it('is true for a Central Medical Officer with nothing else', () => {
    expect(isMedicalOnly(roles('central_medical_officer'))).toBe(true);
  });

  it('is true when someone holds both medical roles', () => {
    expect(isMedicalOnly(roles('medical_officer', 'central_medical_officer'))).toBe(true);
  });

  it('is FALSE as soon as one recruitment role is held', () => {
    // Someone who is also a recruiter keeps the full navigation — hiding
    // Requisitions from them would break their actual job.
    expect(isMedicalOnly(roles('medical_officer', 'corporate_recruiter'))).toBe(false);
    expect(isMedicalOnly(roles('central_medical_officer', 'requisition_raiser'))).toBe(false);
  });

  it('is false for a super user', () => {
    expect(isMedicalOnly({ isSuperUser: true, ...roles('medical_officer') })).toBe(false);
  });

  it('is false for someone with no roles at all', () => {
    // Not "medical only" — just unprivileged. Hiding nav on this basis would
    // silently narrow the app for anyone mid-provisioning.
    expect(isMedicalOnly(roles())).toBe(false);
    expect(isMedicalOnly(undefined)).toBe(false);
  });
});

describe('canAccessMedical is unchanged by the new role', () => {
  it('still admits the examining roles', () => {
    expect(canAccessMedical(roles('medical_officer'))).toBe(true);
  });

  it('does not admit the CMO to the examining queue', () => {
    // A CMO confirms findings; they do not record them.
    expect(canAccessMedical(roles('central_medical_officer'))).toBe(false);
  });
});

describe('holdsMedicalExaminerRole / holdsCentralMedicalRole', () => {
  it('is true only for someone actually holding the role', () => {
    expect(holdsMedicalExaminerRole(roles('medical_officer'))).toBe(true);
    expect(holdsCentralMedicalRole(roles('central_medical_officer'))).toBe(true);
  });

  it('does NOT admit a super user', () => {
    // The difference from canAccessMedical: a super user may open the pages,
    // but these queues are not their work and must not sit on their dashboard.
    expect(holdsMedicalExaminerRole({ isSuperUser: true })).toBe(false);
    expect(holdsCentralMedicalRole({ isSuperUser: true })).toBe(false);
    // ...even alongside other roles.
    expect(
      holdsCentralMedicalRole({ isSuperUser: true, ...roles('corporate_hr') }),
    ).toBe(false);
  });

  it('keeps the two roles apart', () => {
    expect(holdsCentralMedicalRole(roles('medical_officer'))).toBe(false);
    expect(holdsMedicalExaminerRole(roles('central_medical_officer'))).toBe(false);
  });

  it('is false for every other role', () => {
    for (const key of ['corporate_hr', 'chro', 'corporate_recruiter', 'sbu_head']) {
      expect(holdsMedicalExaminerRole(roles(key))).toBe(false);
      expect(holdsCentralMedicalRole(roles(key))).toBe(false);
    }
  });

  it('is false when permissions have not loaded', () => {
    expect(holdsMedicalExaminerRole(undefined)).toBe(false);
    expect(holdsCentralMedicalRole(null)).toBe(false);
  });

  it('still lets a super user OPEN the pages — access is a separate question', () => {
    expect(canAccessMedical({ isSuperUser: true })).toBe(true);
    expect(canApproveMedical({ isSuperUser: true })).toBe(true);
  });
});
