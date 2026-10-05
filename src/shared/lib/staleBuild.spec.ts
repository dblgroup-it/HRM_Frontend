import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isStaleBuildError,
  reloadForNewBuild,
  reloadInProgress,
} from './staleBuild';

describe('isStaleBuildError', () => {
  it('recognises a page file the last deploy removed, in every browser', () => {
    for (const message of [
      // Chrome / Edge
      'Failed to fetch dynamically imported module: https://talenthub.dbl-group.com/assets/OrganogramPage-C8Kw7O-R.js',
      // Firefox
      'error loading dynamically imported module: https://talenthub.dbl-group.com/assets/RequisitionsPage-Dk1PohO8.js',
      // Safari
      'Importing a module script failed.',
      // Vite's own CSS preload
      'Unable to preload CSS for /assets/index-abc.css',
    ]) {
      expect(isStaleBuildError(new TypeError(message))).toBe(true);
    }
  });

  it('leaves real faults alone', () => {
    expect(isStaleBuildError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    expect(isStaleBuildError(new Error('Network Error'))).toBe(false);
    expect(isStaleBuildError(undefined)).toBe(false);
  });
});

describe('reloadForNewBuild', () => {
  let store: Map<string, string>;
  const reload = vi.fn();

  beforeEach(() => {
    store = new Map();
    reload.mockClear();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    vi.stubGlobal('window', { location: { reload } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reloads once, and says a reload is under way', () => {
    expect(reloadForNewBuild()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadInProgress()).toBe(true);
  });

  it('does not reload again straight after — a second failure is a real problem', () => {
    reloadForNewBuild();
    expect(reloadForNewBuild()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('may reload again for a later deploy', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T08:00:00Z'));
    reloadForNewBuild();
    vi.setSystemTime(new Date('2026-10-05T09:00:00Z'));
    expect(reloadForNewBuild()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('never reloads when it cannot remember doing so (no loop possible)', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
    });
    expect(reloadForNewBuild()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
