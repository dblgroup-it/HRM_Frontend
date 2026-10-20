import { describe, expect, it } from 'vitest';

import { chapterAt, clock, partLengths, speedLabel } from './videoUtils';

const chapters = [
  { n: 1, title: 'One', startMs: 4000 },
  { n: 2, title: 'Two', startMs: 60000 },
  { n: 3, title: 'Three', startMs: 125000 },
];

describe('video utils', () => {
  it('formats a player clock', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(65000)).toBe('1:05');
    expect(clock(3725000)).toBe('1:02:05');
    expect(clock(-5)).toBe('0:00');
  });

  it('finds the part playing at a time', () => {
    expect(chapterAt(chapters, 0)).toBe(0);
    expect(chapterAt(chapters, 4000)).toBe(0);
    expect(chapterAt(chapters, 60000)).toBe(1);
    expect(chapterAt(chapters, 999999)).toBe(2);
  });

  it('measures each part to the next, the last to the end', () => {
    expect(partLengths(chapters, 200000)).toEqual([56000, 65000, 75000]);
  });

  it('labels speeds', () => {
    expect(speedLabel(1)).toBe('1×');
    expect(speedLabel(1.25)).toBe('1.25×');
    expect(speedLabel(1.5)).toBe('1.5×');
  });
});
