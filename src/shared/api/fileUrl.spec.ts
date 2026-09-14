import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * Regression cover for the "404 Page not found" document bug.
 *
 * The API returns document links as a relative path (`/api/files/<grant>`).
 * In development the SPA is served by Vite on one port and NestJS listens on
 * another, so a relative href resolved against the Vite origin: the dev server
 * answered with `index.html`, React Router found no matching route, and the
 * user saw the app's own 404 page. The backend was never reached.
 *
 * This project deliberately uses absolute API URLs rather than a Vite proxy —
 * `httpClient` already talks to `VITE_API_BASE_URL` — so document links resolve
 * the same way, and these tests pin that down for both environments.
 */
const DEV_BASE = 'http://localhost:4000/api';
const PROD_BASE = 'https://talenthub.example.com/api';

async function withBase(base: string) {
  vi.resetModules();
  vi.doMock('@shared/constants', () => ({
    ENV: { API_BASE_URL: base, USE_MOCK_API: false },
    STORAGE_KEYS: { AUTH: 'hrm.auth' },
  }));
  return (await import('./fileUrl')).resolveApiFileUrl;
}

describe('resolveApiFileUrl', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.doUnmock('@shared/constants'));

  describe('development — frontend and backend on different origins', () => {
    it('sends a file grant to the BACKEND, not the Vite dev server', async () => {
      const resolve = await withBase(DEV_BASE);
      const url = resolve('/api/files/abc.def');
      expect(url).toBe('http://localhost:4000/api/files/abc.def');
      // The bug: this used to stay relative and hit :3000.
      expect(url).not.toMatch(/^\/api/);
      expect(url).not.toContain(':3000');
    });

    it('resolves the authenticated CV route too', async () => {
      const resolve = await withBase(DEV_BASE);
      expect(resolve('/api/candidates/c1/cv/file')).toBe(
        'http://localhost:4000/api/candidates/c1/cv/file',
      );
    });

    it.each([
      '/api/onboarding/docs/d1/file',
      '/api/onboarding/ob1/medical-report/file',
      '/api/board-vote/tok/cv',
      '/api/board-sheet/tok/cv/c1',
      '/api/eval/tok/cv',
    ])('resolves %s', async (path) => {
      const resolve = await withBase(DEV_BASE);
      expect(resolve(path)).toBe(`http://localhost:4000${path}`);
    });
  });

  describe('production — same origin behind nginx', () => {
    it('produces a same-origin URL nginx proxies to the backend', async () => {
      const resolve = await withBase(PROD_BASE);
      expect(resolve('/api/files/abc.def')).toBe(
        'https://talenthub.example.com/api/files/abc.def',
      );
    });
  });

  describe('production — API base configured as a relative path', () => {
    // Some same-origin deployments set VITE_API_BASE_URL=/api rather than a
    // full URL. The link must stay relative in that case (the page and the API
    // share an origin), and still must not double the prefix.
    it('keeps the link relative and correct', async () => {
      const resolve = await withBase('/api');
      expect(resolve('/api/files/abc')).toBe('/api/files/abc');
      expect(resolve('/api/candidates/c1/cv/file')).toBe(
        '/api/candidates/c1/cv/file',
      );
      expect(resolve('/api/files/abc')).not.toContain('/api/api');
    });
  });

  describe('no /api/api duplication', () => {
    it.each([DEV_BASE, PROD_BASE, 'http://localhost:4000/api/'])(
      'never doubles the prefix with base %s',
      async (base) => {
        const resolve = await withBase(base);
        for (const p of ['/api/files/x', 'api/files/x', '/files/x']) {
          const url = resolve(p)!;
          expect(url).not.toContain('/api/api');
          expect(url.match(/\/api\//g)).toHaveLength(1);
        }
      },
    );

    it('leaves a path that merely starts with "api" alone', async () => {
      const resolve = await withBase(DEV_BASE);
      // Not the /api prefix — a different segment that happens to share letters.
      expect(resolve('/apiary/x')).toBe('http://localhost:4000/api/apiary/x');
    });
  });

  describe('URL-safe grants survive intact', () => {
    it('does not mangle a base64url grant containing - _ and .', async () => {
      const resolve = await withBase(DEV_BASE);
      const grant = 'eyJmIjoiMS1fQSJ9.KO8LHbg-RzWBuD63R2Wu_xkxlyva';
      expect(resolve(`/api/files/${grant}`)).toBe(
        `http://localhost:4000/api/files/${grant}`,
      );
    });
  });

  describe('pass-through and empty input', () => {
    it.each([
      'https://drive.google.com/file/d/ABC/view',
      'http://example.com/cv.pdf',
    ])('leaves the absolute URL %s unchanged', async (abs) => {
      const resolve = await withBase(DEV_BASE);
      expect(resolve(abs)).toBe(abs);
    });

    it.each([null, undefined, '', '   '])(
      'returns undefined for %s so the link renders disabled',
      async (input) => {
        const resolve = await withBase(DEV_BASE);
        expect(resolve(input)).toBeUndefined();
      },
    );
  });
});
