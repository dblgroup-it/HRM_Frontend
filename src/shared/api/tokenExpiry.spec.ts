import { describe, expect, it } from 'vitest';

import { tokenExpired, tokenExpiresAt } from './tokenExpiry';

const b64url = (o: object) =>
  btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = (payload: object) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.sig`;

describe('tokenExpired', () => {
  const now = Date.parse('2026-09-27T12:00:00Z');
  it('reads exp from the token', () => {
    expect(tokenExpiresAt(token({ sub: 'u', exp: 1790000000 }))).toBe(1790000000);
  });
  it('says yesterday’s session is dead', () => {
    expect(tokenExpired(token({ exp: now / 1000 - 3600 }), now)).toBe(true);
  });
  it('lets a live session through', () => {
    expect(tokenExpired(token({ exp: now / 1000 + 3600 }), now)).toBe(false);
  });
  it('leaves anything it cannot read to the server', () => {
    expect(tokenExpired('not-a-jwt', now)).toBe(false);
    expect(tokenExpired(token({ sub: 'u' }), now)).toBe(false);
    expect(tokenExpired(null, now)).toBe(false);
  });
});
