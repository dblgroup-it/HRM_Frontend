import { describe, expect, it } from 'vitest';

import { delegationBoardState } from './delegationBoardState';

/**
 * Regression cover for a board that reported a failed request as an empty one.
 *
 * REQ-2026-010 had a candidate, a completed interview and submitted marks, and
 * the board said "no candidate has been sent for a first interview yet" —
 * because the request 404'd against a stale server and `!data` was treated as
 * "nothing to show". An error must never be rendered as an answer.
 */
describe('delegationBoardState', () => {
  it('is loading while the request is in flight', () => {
    expect(
      delegationBoardState({ isLoading: true, isError: false, data: undefined }),
    ).toBe('loading');
  });

  it('is an ERROR when the request failed — not "empty"', () => {
    expect(
      delegationBoardState({ isLoading: false, isError: true, data: undefined }),
    ).toBe('error');
  });

  it('is an error when there is no data, however the query reports itself', () => {
    // A 404 can settle without isError depending on the client; missing data
    // still means we do not know the answer.
    expect(
      delegationBoardState({
        isLoading: false,
        isError: false,
        data: undefined,
      }),
    ).toBe('error');
  });

  it('still shows the error when a stale payload lingers beside the failure', () => {
    expect(
      delegationBoardState({
        isLoading: false,
        isError: true,
        data: { total: 4 },
      }),
    ).toBe('error');
  });

  it('is empty only when the server actually said zero', () => {
    expect(
      delegationBoardState({ isLoading: false, isError: false, data: { total: 0 } }),
    ).toBe('empty');
  });

  it('is ready when there is something to show', () => {
    expect(
      delegationBoardState({ isLoading: false, isError: false, data: { total: 1 } }),
    ).toBe('ready');
  });
});
