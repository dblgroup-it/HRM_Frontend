import { describe, expect, it } from 'vitest';

import { avatarCrop } from './avatarImage';

describe('avatarCrop', () => {
  it('keeps a square the full width of a portrait photo, nearer the top', () => {
    // 3000 × 4000: a 3000 square, 200 px from the top — not 500 (centred),
    // which cuts the top of the head off.
    expect(avatarCrop(3000, 4000)).toEqual({ x: 0, y: 200, side: 3000 });
  });

  it('centres a landscape photo across', () => {
    expect(avatarCrop(4000, 3000)).toEqual({ x: 500, y: 0, side: 3000 });
  });

  it('keeps a square photo whole', () => {
    expect(avatarCrop(800, 800)).toEqual({ x: 0, y: 0, side: 800 });
  });
});
