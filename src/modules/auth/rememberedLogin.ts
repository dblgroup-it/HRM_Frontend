/**
 * "Remember me" on the sign-in page.
 *
 * The email is kept in localStorage so the form opens with it filled in.
 * The password is never kept by the app: it goes to the browser's own
 * password manager, which stores it encrypted and outside the page's reach.
 * Anything the page itself can read, an injected script can read too — and
 * the session token already lives in localStorage, so one leak must not also
 * hand over the password.
 *
 * Chromium browsers (Chrome, Edge) are asked to save it explicitly through the
 * Credential Management API. Firefox and Safari have no such API; they offer
 * to save on their own when the form submits, which the form's autocomplete
 * attributes make them recognise.
 */

const KEY = 'hrm.rememberedLogin';

interface Stored {
  email: string;
}

/** The email to prefill, or null when nothing is remembered. */
export function loadRememberedEmail(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return typeof parsed.email === 'string' && parsed.email ? parsed.email : null;
  } catch {
    return null;
  }
}

type PasswordCredentialCtor = new (data: {
  id: string;
  password: string;
  name?: string;
}) => Credential;

function passwordCredential(): PasswordCredentialCtor | null {
  const ctor = (window as unknown as { PasswordCredential?: PasswordCredentialCtor })
    .PasswordCredential;
  return typeof ctor === 'function' && navigator.credentials ? ctor : null;
}

/**
 * After a successful sign-in. Remembered: keep the email and ask the browser
 * to save the password. Not remembered: forget the email.
 */
export function rememberLogin(
  remember: boolean,
  email: string,
  /** Null: remember the email only. */
  password: string | null,
  name?: string,
): void {
  if (!remember) {
    forgetRememberedLogin();
    return;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ email } satisfies Stored));
  } catch {
    /* private window or storage blocked — the form just opens empty */
  }
  const Ctor = passwordCredential();
  if (!Ctor || !password) return;
  // Shows the browser's own "Save password?" prompt. Refusing it, or a
  // browser policy blocking it, must never get in the way of signing in.
  navigator.credentials
    .store(new Ctor({ id: email, password, name }))
    .catch(() => undefined);
}

export function forgetRememberedLogin(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to forget */
  }
}

/**
 * The password the browser saved for this email, if it will hand it over
 * without showing anything. `silent` never opens a chooser: where the browser
 * wants to ask first, this returns null and its ordinary autofill still fills
 * the field.
 */
export async function savedPasswordFor(email: string): Promise<string | null> {
  if (!passwordCredential()) return null;
  try {
    const cred = (await navigator.credentials.get({
      password: true,
      mediation: 'silent',
    } as CredentialRequestOptions)) as (Credential & { password?: string }) | null;
    if (cred && cred.id === email && typeof cred.password === 'string') {
      return cred.password;
    }
  } catch {
    /* unsupported or refused */
  }
  return null;
}

/**
 * What was typed, held between the password step and the two-factor code.
 * Module state rather than component state: the sign-in page unmounts the
 * moment a session exists, before any callback of its own could run — which
 * is exactly why "Remember me" used to save nothing.
 */
let pending: { email: string; password: string; remember: boolean } | null = null;

interface SessionLike {
  user: { name: string };
  mustChangePassword?: boolean;
}

/** Called by the sign-in mutation. Remembers now, or after the 2FA code. */
export function afterPasswordStep(
  credentials: { email: string; password: string; remember?: boolean },
  session: SessionLike | null,
): void {
  const creds = {
    email: credentials.email.trim(),
    password: credentials.password,
    remember: Boolean(credentials.remember),
  };
  if (!session) {
    pending = creds; // two-factor still to come
    return;
  }
  pending = null;
  finish(creds, session);
}

/** Called once the two-factor code is accepted. */
export function afterTwoFactorStep(session: SessionLike): void {
  const creds = pending;
  pending = null;
  if (creds) finish(creds, session);
}

function finish(
  creds: { email: string; password: string; remember: boolean },
  session: SessionLike,
): void {
  // A password the account must change straight away is not worth saving:
  // the browser would offer the dead one next time.
  rememberLogin(
    creds.remember,
    creds.email,
    session.mustChangePassword ? null : creds.password,
    session.user.name,
  );
}
