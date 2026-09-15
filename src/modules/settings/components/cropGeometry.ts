/**
 * The arithmetic behind the signature cropper.
 *
 * Kept apart from the component because this is where cropping actually goes
 * wrong — a box that drifts outside the image, a ratio that slips as you drag a
 * corner, a rectangle measured in displayed pixels but applied to the original.
 * None of that is visible in a screenshot and all of it is testable here.
 *
 * Every rectangle is in NATURAL image pixels, never displayed ones. The image
 * is shown scaled to fit a panel; doing the maths in display space and scaling
 * at the end compounds rounding into a visibly off-centre crop.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Three times as wide as tall — what the signature box must always be. */
export const SIGNATURE_RATIO = 3;

/**
 * The starting crop: the widest 3:1 box that fits, centred.
 *
 * Opening on the largest valid selection means a correctly-shaped image needs
 * no dragging at all, and a tall one starts somewhere sensible rather than in a
 * corner.
 */
export function initialCrop(image: Size): Rect {
  const widthLimited = image.width / SIGNATURE_RATIO <= image.height;
  const width = widthLimited ? image.width : image.height * SIGNATURE_RATIO;
  const height = width / SIGNATURE_RATIO;
  return {
    x: (image.width - width) / 2,
    y: (image.height - height) / 2,
    width,
    height,
  };
}

/** The largest 3:1 crop this image can hold. */
export function maxCropWidth(image: Size): number {
  return Math.min(image.width, image.height * SIGNATURE_RATIO);
}

/**
 * Force a rectangle to be a valid crop: 3:1, no larger than the image, fully
 * inside it.
 *
 * Applied after every drag and resize rather than trusting the gesture, because
 * a pointer can leave the element mid-drag and browsers deliver coordinates
 * outside the box when it does.
 */
export function clampCrop(rect: Rect, image: Size): Rect {
  const min = Math.min(40, maxCropWidth(image));
  const width = Math.max(min, Math.min(rect.width, maxCropWidth(image)));
  const height = width / SIGNATURE_RATIO;
  return {
    width,
    height,
    x: Math.max(0, Math.min(rect.x, image.width - width)),
    y: Math.max(0, Math.min(rect.y, image.height - height)),
  };
}

/** Move a crop by a delta, keeping it inside the image. */
export function moveCrop(rect: Rect, dx: number, dy: number, image: Size): Rect {
  return clampCrop({ ...rect, x: rect.x + dx, y: rect.y + dy }, image);
}

/**
 * Resize from the bottom-right corner, holding the top-left still.
 *
 * Height follows width, so the ratio cannot drift however the pointer moves —
 * dragging a corner of a fixed-ratio box is a one-dimensional gesture wearing a
 * two-dimensional costume.
 */
export function resizeCrop(rect: Rect, dx: number, image: Size): Rect {
  return clampCrop({ ...rect, width: rect.width + dx }, image);
}

/** Convert a point in displayed pixels to natural image pixels. */
export function toNatural(value: number, scale: number): number {
  return scale > 0 ? value / scale : 0;
}

/**
 * How much the image is shrunk to fit its panel.
 *
 * Never above 1: a small scan is shown at its own size rather than blown up,
 * which would invite someone to crop a 200px-wide signature into something that
 * looks fine on screen and prints as a smear.
 */
export function displayScale(image: Size, panel: Size): number {
  if (!image.width || !image.height) return 1;
  return Math.min(panel.width / image.width, panel.height / image.height, 1);
}
