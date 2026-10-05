/**
 * Turn the photo someone picked into a proper profile picture.
 *
 * People upload whatever their phone or camera made — 3000 × 4000 pixels and
 * more — and that whole picture used to be stored and then squeezed into a
 * 40-pixel circle by the browser. Shrinking an image that far in one go
 * aliases: the face comes out grainy and jagged. Here the photo is cut to a
 * square around the face and reduced to AVATAR_PX in halving steps with
 * high-quality smoothing, which keeps it clean, and saved as a small JPEG —
 * sharp at every size it is shown, and a few dozen KB instead of megabytes.
 *
 * Phone photos carry their rotation in EXIF; drawing an <img> onto a canvas
 * applies it in every current browser, so the result is upright.
 */

/** Pixels per side: sharp at the largest avatar on a 2–3× screen. */
export const AVATAR_PX = 256;

/** Largest photo accepted before preparing — the prepared file is tiny. */
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/**
 * The square to keep: the full width (or height), and for a portrait photo
 * nearer the top than the middle — faces sit in the upper part of a photo,
 * and an exactly centred square cuts the top of the head off.
 */
export function avatarCrop(
  width: number,
  height: number,
): { x: number; y: number; side: number } {
  const side = Math.min(width, height);
  return {
    x: Math.round((width - side) / 2),
    y: Math.round((height - side) * 0.2),
    side,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be opened. Try a JPG or PNG.'));
    };
    img.src = url;
  });
}

function canvas(side: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = side;
  c.height = side;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('This browser cannot prepare images.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return [c, ctx];
}

export async function prepareAvatar(file: File): Promise<File> {
  const img = await loadImage(file);
  const { x, y, side } = avatarCrop(img.naturalWidth, img.naturalHeight);

  // The square, at full resolution, on white (a transparent PNG would turn
  // black as a JPEG).
  const [square, ctx] = canvas(side);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, side, side);
  ctx.drawImage(img, x, y, side, side, 0, 0, side, side);
  let current = square;

  // Halve until one last step reaches the target. Each step averages
  // neighbouring pixels properly; one big jump skips most of them.
  let size = side;
  while (size / 2 > AVATAR_PX) {
    size = Math.round(size / 2);
    const [next, nctx] = canvas(size);
    nctx.drawImage(current, 0, 0, size, size);
    current = next;
  }
  const target = Math.min(AVATAR_PX, size);
  const [out, octx] = canvas(target);
  octx.drawImage(current, 0, 0, target, target);

  const blob = await new Promise<Blob | null>((resolve) =>
    out.toBlob(resolve, 'image/jpeg', 0.9),
  );
  if (!blob) throw new Error('The picture could not be prepared.');
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
}
