import { describe, expect, it } from 'vitest';

import { heldByLabel } from './heldByLabel';

const d = (id: string, name: string) => ({ id, name });

describe('heldByLabel', () => {
  it('names the one person holding it', () => {
    expect(heldByLabel({ delegates: [d('1', 'Md. Karim')] })).toBe('Md. Karim');
  });

  it('names both, because both were handed the candidate', () => {
    expect(
      heldByLabel({ delegates: [d('1', 'Md. Karim'), d('2', 'Nusrat Jahan')] }),
    ).toBe('Md. Karim and Nusrat Jahan');
  });

  it('counts the rest past two rather than running off the chip', () => {
    expect(
      heldByLabel({
        delegates: [d('1', 'Md. Karim'), d('2', 'Nusrat Jahan'), d('3', 'Sabbir')],
      }),
    ).toBe('Md. Karim and 2 others');
  });

  it('says something rather than nothing when the names are missing', () => {
    // A hold with no usable name still means hands off; "With" followed by
    // blank space reads as a rendering fault.
    expect(heldByLabel({ delegates: [] })).toBe('another interviewer');
    expect(heldByLabel({ delegates: [d('1', '')] })).toBe('another interviewer');
  });
});
