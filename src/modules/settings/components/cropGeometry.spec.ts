import { describe, expect, it } from 'vitest';

import {
  clampCrop,
  displayScale,
  initialCrop,
  maxCropWidth,
  moveCrop,
  resizeCrop,
  SIGNATURE_RATIO,
} from './cropGeometry';

const ratioOf = (r: { width: number; height: number }) => r.width / r.height;

describe('initialCrop', () => {
  it('is limited by height on an image wider than 3:1', () => {
    // 1200/3 = 400, taller than the image, so height decides: a 900x300 box,
    // centred horizontally. Taking the full 1200 width would be 4:1.
    expect(initialCrop({ width: 1200, height: 300 })).toEqual({
      x: 150,
      y: 0,
      width: 900,
      height: 300,
    });
  });

  it('is limited by width on an image narrower than 3:1', () => {
    expect(initialCrop({ width: 900, height: 600 })).toEqual({
      x: 0,
      y: 150,
      width: 900,
      height: 300,
    });
  });

  it('centres inside a tall image', () => {
    const crop = initialCrop({ width: 600, height: 600 });
    expect(crop.width).toBe(600);
    expect(crop.height).toBe(200);
    expect(crop.y).toBe(200); // vertically centred
    expect(crop.x).toBe(0);
  });

  it('is always exactly 3:1', () => {
    for (const image of [
      { width: 900, height: 300 },
      { width: 4000, height: 120 },
      { width: 120, height: 4000 },
      { width: 501, height: 337 },
    ]) {
      expect(ratioOf(initialCrop(image))).toBeCloseTo(SIGNATURE_RATIO, 6);
    }
  });

  it('never starts outside the image', () => {
    for (const image of [
      { width: 900, height: 300 },
      { width: 100, height: 900 },
      { width: 4000, height: 50 },
    ]) {
      const c = initialCrop(image);
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + c.width).toBeLessThanOrEqual(image.width + 1e-9);
      expect(c.y + c.height).toBeLessThanOrEqual(image.height + 1e-9);
    }
  });
});

describe('clampCrop', () => {
  const image = { width: 900, height: 600 };

  it('pulls a box back inside after a drag leaves the element', () => {
    // A pointer can leave the element mid-drag and still deliver coordinates.
    const c = clampCrop({ x: -500, y: -500, width: 300, height: 100 }, image);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
  });

  it('pulls it back from the far edge too', () => {
    const c = clampCrop({ x: 5000, y: 5000, width: 300, height: 100 }, image);
    expect(c.x + c.width).toBeLessThanOrEqual(image.width);
    expect(c.y + c.height).toBeLessThanOrEqual(image.height);
  });

  it('restores the ratio whatever height it is handed', () => {
    const c = clampCrop({ x: 0, y: 0, width: 300, height: 999 }, image);
    expect(ratioOf(c)).toBeCloseTo(SIGNATURE_RATIO, 6);
  });

  it('refuses to exceed what the image can hold', () => {
    const c = clampCrop({ x: 0, y: 0, width: 99999, height: 1 }, image);
    expect(c.width).toBe(maxCropWidth(image));
    expect(ratioOf(c)).toBeCloseTo(SIGNATURE_RATIO, 6);
  });

  it('keeps a minimum size so the box cannot vanish', () => {
    const c = clampCrop({ x: 0, y: 0, width: 0, height: 0 }, image);
    expect(c.width).toBeGreaterThan(0);
  });
});

describe('moveCrop and resizeCrop', () => {
  const image = { width: 900, height: 600 };
  const start = initialCrop(image);

  it('moves within bounds', () => {
    // The initial crop spans the full width here, so only vertical movement is
    // possible — and clamping must hold x rather than let it drift.
    const c = moveCrop(start, 50, 20, image);
    expect(c.x).toBe(0);
    expect(c.y).toBe(start.y + 20);
  });

  it('moves on both axes when there is room', () => {
    const roomy = { width: 1200, height: 600 };
    const from = initialCrop(roomy); // 1200x400 limited by height -> 1800? no
    const smaller = resizeCrop(from, -600, roomy);
    const moved = moveCrop(smaller, 30, 40, roomy);
    expect(moved.x).toBe(smaller.x + 30);
    expect(moved.y).toBe(smaller.y + 40);
  });

  it('stops at the edge rather than escaping', () => {
    const c = moveCrop(start, 10_000, 10_000, image);
    expect(c.x + c.width).toBeLessThanOrEqual(image.width);
    expect(c.y + c.height).toBeLessThanOrEqual(image.height);
  });

  it('holds the ratio through any resize', () => {
    for (const dx of [-500, -50, 0, 50, 5000]) {
      expect(ratioOf(resizeCrop(start, dx, image))).toBeCloseTo(
        SIGNATURE_RATIO,
        6,
      );
    }
  });
});

describe('displayScale', () => {
  it('shrinks a large image to fit the panel', () => {
    expect(displayScale({ width: 2000, height: 1000 }, { width: 500, height: 500 })).toBe(0.25);
  });

  it('never enlarges a small one', () => {
    // Blowing up a 200px scan invites a crop that prints as a smear.
    expect(displayScale({ width: 200, height: 60 }, { width: 800, height: 400 })).toBe(1);
  });

  it('survives a zero-sized image without dividing by zero', () => {
    expect(displayScale({ width: 0, height: 0 }, { width: 500, height: 500 })).toBe(1);
  });
});
