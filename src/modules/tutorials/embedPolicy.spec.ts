import { describe, expect, it } from 'vitest';

import { allowsFrameFrom } from './embedPolicy';

const YT = 'https://www.youtube-nocookie.com';
// The production policy before and after the video playlist (deploy/ubuntu/dbl-hrm-security-headers.conf).
const BEFORE =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const AFTER = BEFORE.replace("object-src 'none'", "frame-src 'self' https://www.youtube-nocookie.com; object-src 'none'");

describe('allowsFrameFrom', () => {
  it('refuses YouTube under the policy the server sends today', () => {
    expect(allowsFrameFrom(BEFORE, YT)).toBe(false);
  });

  it('allows it once frame-src names the privacy-enhanced player', () => {
    expect(allowsFrameFrom(AFTER, YT)).toBe(true);
    expect(allowsFrameFrom(AFTER, 'https://www.youtube.com')).toBe(false);
  });

  it('allows anything with no policy — a local dev server', () => {
    expect(allowsFrameFrom(null, YT)).toBe(true);
    expect(allowsFrameFrom('', YT)).toBe(true);
  });

  it('reads the fallbacks, wildcards and schemes', () => {
    expect(allowsFrameFrom("child-src https://*.youtube-nocookie.com", YT)).toBe(true);
    expect(allowsFrameFrom('default-src https:', YT)).toBe(true);
    expect(allowsFrameFrom('frame-src *', YT)).toBe(true);
    expect(allowsFrameFrom("frame-src 'none'; default-src *", YT)).toBe(false);
    expect(allowsFrameFrom('frame-src www.youtube-nocookie.com', YT)).toBe(true);
    expect(allowsFrameFrom('frame-src http://www.youtube-nocookie.com', YT)).toBe(false);
  });

  it('needs every policy to allow it when several are sent', () => {
    expect(allowsFrameFrom(`${AFTER}, frame-src 'self'`, YT)).toBe(false);
  });
});
