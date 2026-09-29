import { describe, expect, it } from 'vitest';

import { dhakaInputToIso, isoToDhakaInput } from './dhakaTime';

describe('Dhaka interview times', () => {
  it('reads what is typed as GMT+6, whatever the computer says', () => {
    expect(new Date(dhakaInputToIso('2026-10-01T11:30')!).toISOString()).toBe(
      '2026-10-01T05:30:00.000Z',
    );
  });

  it('shows a stored time back in GMT+6', () => {
    expect(isoToDhakaInput('2026-10-01T05:30:00.000Z')).toBe('2026-10-01T11:30');
    // Past midnight UTC is the next morning in Dhaka.
    expect(isoToDhakaInput('2026-10-01T20:15:00.000Z')).toBe('2026-10-02T02:15');
  });

  it('round-trips', () => {
    expect(isoToDhakaInput(dhakaInputToIso('2026-12-31T23:45'))).toBe('2026-12-31T23:45');
  });

  it('leaves an empty box empty', () => {
    expect(dhakaInputToIso('  ')).toBeUndefined();
    expect(isoToDhakaInput(null)).toBe('');
  });
});
