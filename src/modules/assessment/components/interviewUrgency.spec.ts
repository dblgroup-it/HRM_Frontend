import { describe, expect, it } from 'vitest';

import { interviewUrgency } from './interviewUrgency';

describe('interviewUrgency', () => {
  const now = new Date(2026, 8, 25, 11, 40); // 25 Sep, 11:40 local

  it('calls later today "today", not "tomorrow"', () => {
    expect(
      interviewUrgency(new Date(2026, 8, 25, 14, 40).toISOString(), now)
    ).toBe('today');
    expect(
      interviewUrgency(new Date(2026, 8, 25, 23, 59).toISOString(), now)
    ).toBe('today');
  });

  it('calls any time tomorrow "tomorrow"', () => {
    expect(
      interviewUrgency(new Date(2026, 8, 26, 0, 5).toISOString(), now)
    ).toBe('tomorrow');
    expect(
      interviewUrgency(new Date(2026, 8, 26, 17, 0).toISOString(), now)
    ).toBe('tomorrow');
  });

  it('marks a past day overdue and says nothing further out', () => {
    expect(
      interviewUrgency(new Date(2026, 8, 24, 16, 0).toISOString(), now)
    ).toBe('overdue');
    expect(
      interviewUrgency(new Date(2026, 8, 28, 10, 0).toISOString(), now)
    ).toBeNull();
    expect(interviewUrgency(null, now)).toBeNull();
  });
});
