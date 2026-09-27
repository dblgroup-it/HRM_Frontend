/**
 * When a session token stops being valid, read from the token itself.
 *
 * Sessions last a day (`JWT_EXPIRES_IN`), so everybody opening the app the next
 * morning arrives holding yesterday's. Knowing that locally means the app
 * drops it before sending a single request — instead of firing the dashboard,
 * the bell and the live connection, collecting a screenful of 401s in the
 * console, and only then showing the sign-in page.
 *
 * Only the expiry is read. The signature is the server's business: a token
 * that passes this check can still be refused (signed out elsewhere, password
 * changed), which is why the app also verifies once — see ProtectedRoute.
 */

/** Seconds of slack for a clock a little behind the server's. */
const SKEW_SECONDS = 30;

export function tokenExpiresAt(token: string | null | undefined): number | null {
  if (!token) return null;
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

/** True when the token says it has expired. A token without `exp` is left to the server. */
export function tokenExpired(token: string | null | undefined, now = Date.now()): boolean {
  const exp = tokenExpiresAt(token);
  return exp !== null && exp * 1000 <= now + SKEW_SECONDS * 1000;
}
