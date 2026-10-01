import { describe, expect, it } from 'vitest';

import { draftRoleProfile, pointsOf } from './roleProfileDraft';

const base = {
  designation: 'Assistant Officer',
  department: 'Dyeing and Finishing',
  unitFactory: 'Jinnat Textile Mills Ltd.',
  placeOfPosting: 'Kashimpur',
  jobDescription: '',
  education: '',
  experience: '',
  others: '',
};

describe('draftRoleProfile', () => {
  it('is null without a job analysis', () => {
    expect(draftRoleProfile(base)).toBeNull();
  });

  it('turns the job analysis into a profile', () => {
    const p = draftRoleProfile({
      ...base,
      jobDescription: '- Run the dyeing floor\n- Keep shade records\n2) Train operators',
      education: 'B.Sc. in Textile Engineering',
      experience: '1-2 years in dyeing',
      others: 'Shift work',
    })!;
    expect(p.jobDescription).toContain('Run the dyeing floor');
    expect(p.responsibilities).toEqual([
      'Run the dyeing floor',
      'Keep shade records',
      'Train operators',
    ]);
    expect(p.requirements).toEqual([
      'Education: B.Sc. in Textile Engineering',
      'Experience: 1-2 years in dyeing',
      'Shift work',
    ]);
    expect(p.summary).toBe(
      'Assistant Officer — Dyeing and Finishing, Jinnat Textile Mills Ltd., based at Kashimpur.'
    );
    expect(p.generatedBy).toBe('job_analysis');
  });
});

describe('pointsOf', () => {
  it('splits a paragraph into sentences', () => {
    expect(pointsOf('Plan production. Check quality; Report daily.')).toEqual([
      'Plan production.',
      'Check quality',
      'Report daily.',
    ]);
  });
  it('keeps decimals and abbreviations together', () => {
    expect(pointsOf('Hold a B.Sc. in Textile Engineering')).toEqual([
      'Hold a B.Sc. in Textile Engineering',
    ]);
  });
});
