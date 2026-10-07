import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REUSE_MARGIN_MS, forgetProof, keepProof, usableProof } from './applyEmailProof';

const NOW = new Date('2026-10-07T10:00:00Z');
const inMs = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

/** The tests run outside a browser: a sessionStorage that can also be made to fail. */
function fakeStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
    removeItem: vi.fn((k: string) => void store.delete(k)),
  };
  vi.stubGlobal('sessionStorage', storage);
  return storage;
}

describe('applyEmailProof', () => {
  let storage: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    storage = fakeStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reuses the proof for the same address, however it is typed', () => {
    keepProof('Rahim@Gmail.com', 'tok', inMs(60 * 60_000));
    expect(usableProof('  rahim@gmail.COM ', NOW)).toBe('tok');
  });

  it('does not reuse it for another address', () => {
    keepProof('rahim@gmail.com', 'tok', inMs(60 * 60_000));
    expect(usableProof('karim@gmail.com', NOW)).toBeNull();
  });

  it('does not reuse a proof about to lapse — the upload could outlast it', () => {
    keepProof('rahim@gmail.com', 'tok', inMs(REUSE_MARGIN_MS));
    expect(usableProof('rahim@gmail.com', NOW)).toBeNull();
    keepProof('rahim@gmail.com', 'tok', inMs(REUSE_MARGIN_MS + 1000));
    expect(usableProof('rahim@gmail.com', NOW)).toBe('tok');
  });

  it('is gone once forgotten', () => {
    keepProof('rahim@gmail.com', 'tok', inMs(60 * 60_000));
    forgetProof();
    expect(usableProof('rahim@gmail.com', NOW)).toBeNull();
  });

  it('asks for a code rather than failing when storage is blocked or holds rubbish', () => {
    sessionStorage.setItem('hrm.applyEmailProof', '{not json');
    expect(usableProof('rahim@gmail.com', NOW)).toBeNull();
    storage.getItem.mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(usableProof('rahim@gmail.com', NOW)).toBeNull();
    storage.setItem.mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => keepProof('rahim@gmail.com', 'tok', inMs(60_000))).not.toThrow();
    vi.unstubAllGlobals();
    // No storage at all (some embedded browsers).
    expect(usableProof('rahim@gmail.com', NOW)).toBeNull();
    expect(() => forgetProof()).not.toThrow();
  });
});
