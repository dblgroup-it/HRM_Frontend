/**
 * A tab running an older build of the app.
 *
 * Every page's code is its own file, named after its contents, and a deploy
 * replaces them all. A tab opened before the deploy still runs the old app,
 * and the first time it opens a page it has not loaded yet it asks for a file
 * that no longer exists — "Failed to fetch dynamically imported module".
 * "Try again" cannot help: the old app keeps asking for the old file. Loading
 * the page afresh picks up the new build, so that is what happens — once.
 * If it happens again straight away the problem is something else, and the
 * error is shown and reported as usual.
 */

const STALE_BUILD =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading (CSS )?chunk [\w-]+ failed/i;

const RELOADED_AT = 'hrm.staleBuildReloadAt';
/** A second failure within this long is not a stale tab, and is not reloaded again. */
const LOOP_GUARD_MS = 30_000;

/** This page has asked to be reloaded and is on its way out. */
let reloading = false;

export function reloadInProgress(): boolean {
  return reloading;
}

export function isStaleBuildError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? '');
  return STALE_BUILD.test(message);
}

/**
 * Load the latest build. False — and nothing happens — when it was just
 * tried, or when there is nowhere to remember that it was (so it can never
 * become a reload loop).
 */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0);
    if (Date.now() - last < LOOP_GUARD_MS) return false;
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  } catch {
    return false;
  }
  reloading = true;
  window.location.reload();
  return true;
}

/**
 * Vite announces a page file it could not load: start the reload at once.
 *
 * The error is deliberately not cancelled. Cancelling it makes the import
 * resolve to nothing, and the page then fails with a second, unrecognisable
 * error ("reading 'default'"). Left alone, the original error reaches the
 * ErrorBoundary, which knows it, shows "Loading the latest version" and
 * reports nothing while the reload is under way.
 */
export function installStaleBuildRecovery(): void {
  window.addEventListener('vite:preloadError', () => {
    reloadForNewBuild();
  });
}
