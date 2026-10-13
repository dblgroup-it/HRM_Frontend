/**
 * Whether this site's Content-Security-Policy lets the page frame a given
 * origin. The production nginx sends one (`deploy/ubuntu/dbl-hrm-security-
 * headers.conf`), and until it allows YouTube's player, Play opens the
 * playlist on YouTube instead of showing a refused frame.
 *
 * Frames fall back frame-src → child-src → default-src; no policy at all (a
 * local dev server) allows everything. Several policies must all allow it.
 */
export function allowsFrameFrom(csp: string | null | undefined, origin: string): boolean {
  if (!csp || !csp.trim()) return true;
  const url = new URL(origin);
  return csp.split(',').every((policy) => {
    const directives = new Map<string, string[]>();
    for (const part of policy.split(';')) {
      const [name, ...sources] = part.trim().split(/\s+/);
      if (name && !directives.has(name.toLowerCase())) {
        directives.set(name.toLowerCase(), sources);
      }
    }
    const sources =
      directives.get('frame-src') ?? directives.get('child-src') ?? directives.get('default-src');
    if (!sources) return true;
    return sources.some((raw) => {
      const s = raw.toLowerCase();
      if (s === '*') return url.protocol === 'https:' || url.protocol === 'http:';
      if (s === `${url.protocol}`) return true; // "https:"
      const m = /^(?:(https?):\/\/)?(\*\.)?([a-z0-9.-]+)(?::\d+)?\/?$/.exec(s);
      if (!m) return false;
      const [, scheme, wildcard, host] = m;
      if (scheme && `${scheme}:` !== url.protocol) return false;
      return wildcard ? url.hostname.endsWith(`.${host}`) : url.hostname === host;
    });
  });
}
