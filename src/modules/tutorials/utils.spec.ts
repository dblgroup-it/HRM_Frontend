import { describe, expect, it } from 'vitest';

import type { Tutorial } from './types/tutorials.types';
import { atPage, greeting, matchesQuery, matchingChapters, readingTime } from './utils';

const guide = (over: Partial<Tutorial> = {}): Tutorial => ({
  slug: 'factory-hr',
  number: '02',
  title: 'Factory HR',
  kicker: 'Role Guide 02',
  subtitle: 'Job analysis for your unit’s requisitions.',
  audience: 'HR officers at each unit.',
  group: 'Requisition',
  contents: [],
  chapters: [
    { title: 'Writing the job analysis', page: 5 },
    { title: 'Running first interviews', page: 7 },
  ],
  pages: 11,
  bytes: 700_000,
  url: '/api/tutorials/file/g',
  downloadUrl: '/api/tutorials/file/g?download=1',
  thumbUrl: null,
  ...over,
});

describe('tutorials utils', () => {
  it('estimates reading time at two minutes a page, rounded', () => {
    expect(readingTime(1)).toBe('5 min');
    expect(readingTime(11)).toBe('20 min');
    expect(readingTime(28)).toBe('55 min');
    expect(readingTime(137)).toBe('4.5 h');
  });

  it('matches every word typed, across titles and chapter names', () => {
    expect(matchesQuery(guide(), '')).toBe(true);
    expect(matchesQuery(guide(), 'factory')).toBe(true);
    expect(matchesQuery(guide(), 'first interviews')).toBe(true);
    expect(matchesQuery(guide(), 'INTERVIEWS job')).toBe(true);
    expect(matchesQuery(guide(), 'medical')).toBe(false);
  });

  it('finds the chapters a search can jump straight to', () => {
    expect(matchingChapters(guide(), 'interviews').map((c) => c.title)).toEqual(['Running first interviews']);
    expect(matchingChapters(guide(), 'job writing').map((c) => c.page)).toEqual([5]);
    expect(matchingChapters(guide(), 'factory')).toEqual([]);
    expect(matchingChapters(guide(), '  ')).toEqual([]);
  });

  it('opens a chapter at its page, or the guide at its start', () => {
    expect(atPage('https://x/api/tutorials/file/g', 5)).toBe('https://x/api/tutorials/file/g#page=5');
    expect(atPage('https://x/api/tutorials/file/g', null)).toBe('https://x/api/tutorials/file/g');
    expect(atPage(undefined, 5)).toBeUndefined();
  });

  it('greets by the time of day', () => {
    expect(greeting(new Date(2026, 9, 12, 9))).toBe('Good morning');
    expect(greeting(new Date(2026, 9, 12, 13))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 9, 12, 19))).toBe('Good evening');
  });
});
