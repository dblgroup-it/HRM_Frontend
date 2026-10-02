import { ENV, STORAGE_KEYS } from '@shared/constants';

/**
 * Report errors that happen in a user's browser to the API log.
 *
 * A crash on somebody's screen used to leave no trace anywhere — the server
 * saw nothing wrong. Each one now lands in Configuration → API Logs with the
 * page and the user. Throttled here as well as on the server: one broken
 * component can throw on every render, and the same message is sent once a
 * minute at most, twenty a session in all.
 */

const MAX_PER_SESSION = 20;
const SAME_MESSAGE_MS = 60_000;
const sent = new Map<string, number>();
let count = 0;

/** Noise browsers raise that says nothing about this app. */
const IGNORE = [/ResizeObserver loop/i, /^Script error\.?$/i, /extension:\/\//i];

function currentUser(): { userId?: string; userName?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    const user = raw ? (JSON.parse(raw) as { state?: { user?: { id?: string; name?: string } } }).state?.user : null;
    return user ? { userId: user.id, userName: user.name } : {};
  } catch {
    return {};
  }
}

export function reportClientError(error: unknown, extra?: string): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = `${err.name}: ${err.message}`.slice(0, 2000);
    if (IGNORE.some((re) => re.test(message))) return;
    const now = Date.now();
    if (count >= MAX_PER_SESSION) return;
    if (now - (sent.get(message) ?? 0) < SAME_MESSAGE_MS) return;
    sent.set(message, now);
    count++;
    const stack = [err.stack, extra].filter(Boolean).join('\n\n').slice(0, 12000);
    void fetch(`${ENV.API_URL}/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        message,
        stack: stack || undefined,
        page: window.location.pathname,
        ...currentUser(),
      }),
    }).catch(() => {
      /* reporting must never cause an error of its own */
    });
  } catch {
    /* ditto */
  }
}

/** Catch what nothing else catches. Call once, at start-up. */
export function installClientErrorReporting(): void {
  if (ENV.USE_MOCK_API) return;
  window.addEventListener('error', (e) => reportClientError(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => reportClientError(e.reason));
}
