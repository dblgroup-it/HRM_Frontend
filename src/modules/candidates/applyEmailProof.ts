/**
 * The careers page's proof that an applicant owns their email address, kept
 * for this browser tab.
 *
 * The server's proof lasts an hour and names the address, not the job, so
 * someone applying for a second post in the same sitting is not sent another
 * code. It lives in sessionStorage — gone when the tab closes — and is only
 * reused with a margin left, so it cannot lapse between pressing Submit and
 * the CV finishing its upload.
 *
 * Storage can be missing or throw (private windows, blocked site data); every
 * access is guarded, and without it the applicant is simply asked for a code.
 */

const KEY = 'hrm.applyEmailProof';
/** A proof with less than this left is not reused. */
export const REUSE_MARGIN_MS = 5 * 60_000;

/** One spelling per mailbox, as the server keys it. */
export const normaliseEmail = (email: string) => email.trim().toLowerCase();

interface Proof {
  email: string;
  token: string;
  expiresAt: string;
}

/** The stored proof for this address, if it has long enough left to use. */
export function usableProof(email: string, now: Date = new Date()): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const proof = JSON.parse(raw) as Partial<Proof>;
    if (
      typeof proof.token !== 'string' ||
      typeof proof.expiresAt !== 'string' ||
      proof.email !== normaliseEmail(email)
    ) {
      return null;
    }
    const left = new Date(proof.expiresAt).getTime() - now.getTime();
    return left > REUSE_MARGIN_MS ? proof.token : null;
  } catch {
    return null;
  }
}

export function keepProof(email: string, token: string, expiresAt: string): void {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ email: normaliseEmail(email), token, expiresAt } satisfies Proof),
    );
  } catch {
    // Not kept: the next application asks for a code again.
  }
}

export function forgetProof(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}
