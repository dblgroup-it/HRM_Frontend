import { describe, expect, it } from 'vitest';

import { nextInterviewKind, suggestBatchKind } from './nextInterviewKind';

describe('nextInterviewKind', () => {
  it('offers a first interview to someone who has had none', () => {
    expect(nextInterviewKind({ stage: 'shortlisted' })).toBe('first');
  });

  it('moves on once the first was held', () => {
    expect(nextInterviewKind({ stage: 'interview', completedRounds: ['first'] })).toBe('second');
    expect(
      nextInterviewKind({ stage: 'interview', completedRounds: ['first', 'second'] }),
    ).toBe('final');
  });

  it('counts a factory first interview as done once its verdict is in', () => {
    // The factory's round is not always marked completed before the verdict.
    expect(nextInterviewKind({ stage: 'final', firstRoundByFactory: true })).toBe('second');
    expect(
      nextInterviewKind({
        stage: 'interview',
        firstRoundByFactory: true,
        firstInterviewHold: null,
      }),
    ).toBe('second');
  });

  it('does not skip a factory first interview still in progress', () => {
    expect(
      nextInterviewKind({
        stage: 'interview',
        firstRoundByFactory: true,
        firstInterviewHold: { delegates: [] },
      }),
    ).toBe('first');
  });
});

describe('suggestBatchKind', () => {
  it('suggests the second interview for a batch done with the first', () => {
    const r = suggestBatchKind([
      { id: 'a', name: 'Rafiq', stage: 'final' },
      { id: 'b', name: 'Nusrat', stage: 'interview', completedRounds: ['first'] },
    ]);
    expect(r).toEqual({ kind: 'second', others: [] });
  });

  it('names whoever in the batch is due something else', () => {
    const r = suggestBatchKind([
      { id: 'a', name: 'Rafiq', stage: 'final' },
      { id: 'b', name: 'Nusrat', stage: 'final' },
      { id: 'c', name: 'Tanvir', stage: 'shortlisted' },
    ]);
    expect(r.kind).toBe('second');
    expect(r.others).toEqual([{ name: 'Tanvir', due: 'first' }]);
  });
});
