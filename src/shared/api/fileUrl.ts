import { ENV } from '@shared/constants';

/**
 * Turn a document URL returned by the API into one the browser can open.
 *
 * ## Why this exists
 *
 * Documents are no longer public Google Drive links — they are streamed by the
 * backend, and the API returns a **relative** path like `/api/files/<grant>`.
 * A relative path in an `<a href>` resolves against the page's own origin, and
 * in development the page is served by Vite on a different port from NestJS.
 * So `/api/files/…` was fetched from the Vite dev server, which answered with
 * `index.html`; React Router had no matching route and rendered the app's
 * "404 Page not found" screen. Nothing was wrong with the backend.
 *
 * This project does **not** use a Vite proxy: `httpClient` talks to an absolute
 * `VITE_API_BASE_URL`, and this resolves document links the same way, so there
 * is one convention rather than two.
 *
 * ## Behaviour
 *
 * | Input | Development | Production (same origin behind nginx) |
 * | --- | --- | --- |
 * | `/api/files/abc` | `http://localhost:4000/api/files/abc` | `https://host/api/files/abc` |
 * | `/api/candidates/x/cv/file` | `http://localhost:4000/api/candidates/x/cv/file` | `https://host/api/candidates/x/cv/file` |
 * | `https://drive.google.com/…` | unchanged | unchanged |
 * | `null` / `''` | `undefined` | `undefined` |
 *
 * `ENV.API_BASE_URL` already ends in `/api`, so the leading `/api` on the
 * incoming path is dropped before joining — otherwise every link would become
 * `/api/api/files/…`.
 */
export function resolveApiFileUrl(
  path: string | null | undefined,
): string | undefined {
  if (!path) return undefined;

  const trimmed = path.trim();
  if (!trimmed) return undefined;

  // Already absolute — an external CV link (Bdjobs), or a URL the backend
  // absolutised itself for an email. Leave it exactly as it is.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;

  const base = ENV.API_BASE_URL.replace(/\/+$/, '');
  // Strip the API prefix the backend included, because `base` carries it.
  // Matched as a whole segment so a path like `/apiary/...` is left alone.
  const withoutPrefix = trimmed.replace(/^\/?api(?=\/|$)/, '');
  const suffix = withoutPrefix.startsWith('/')
    ? withoutPrefix
    : `/${withoutPrefix}`;

  return `${base}${suffix}`;
}
