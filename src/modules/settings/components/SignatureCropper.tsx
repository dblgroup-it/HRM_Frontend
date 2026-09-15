import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@shared/components/ui';
import { cn } from '@shared/lib';
import {
  clampCrop,
  displayScale,
  initialCrop,
  maxCropWidth,
  moveCrop,
  resizeCrop,
  SIGNATURE_RATIO,
  type Rect,
  type Size,
} from './cropGeometry';

/** What the cropper produces. Fixed, so every signature prints identically. */
const OUTPUT_WIDTH = 900;
const OUTPUT_HEIGHT = OUTPUT_WIDTH / SIGNATURE_RATIO;

/**
 * Crop a signature to 3:1 before it is uploaded.
 *
 * Refusing a wrongly-shaped image and asking the person to go and crop it
 * elsewhere is the worst version of this: most scans of a signature are not
 * 3:1, and the fix is obvious but tedious. Letting them drag a box over the
 * scan takes seconds and means the server's ratio check becomes a guarantee
 * rather than an obstacle.
 *
 * Output is always exactly 900x300 PNG, whatever came in — so a signature is
 * the same size on every letter regardless of who scanned it and how.
 */
export function SignatureCropper({
  file,
  onCancel,
  onCropped,
  isUploading,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (cropped: File) => void;
  isUploading?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [panel, setPanel] = useState<Size>({ width: 640, height: 360 });
  const panelRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // A blob URL, revoked on unmount — these leak for the life of the document
  // otherwise, and this component is opened repeatedly from a settings page.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const measure = () =>
      setPanel({ width: el.clientWidth, height: Math.max(el.clientWidth * 0.55, 200) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  const scale = natural ? displayScale(natural, panel) : 1;

  /** Pointer drags are in displayed pixels; the crop lives in natural ones. */
  const startDrag = useCallback(
    (mode: 'move' | 'resize') => (event: React.PointerEvent) => {
      if (!crop || !natural) return;
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget as HTMLElement;
      target.setPointerCapture(event.pointerId);
      const originX = event.clientX;
      const originY = event.clientY;
      const from = crop;

      const onMove = (e: PointerEvent) => {
        const dx = (e.clientX - originX) / scale;
        const dy = (e.clientY - originY) / scale;
        setCrop(
          mode === 'move'
            ? moveCrop(from, dx, dy, natural)
            : resizeCrop(from, dx, natural),
        );
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [crop, natural, scale],
  );

  /** Draw the selected region to a fixed-size canvas and hand back a PNG. */
  const apply = () => {
    const image = imgRef.current;
    if (!image || !crop) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // White behind it: a transparent PNG signature disappears on a white letter
    // in some PDF renderers, and looks like a missing image rather than a bug.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT,
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCropped(
        new File([blob], 'signature.png', { type: 'image/png' }),
      );
    }, 'image/png');
  };

  const box = crop
    ? {
        left: crop.x * scale,
        top: crop.y * scale,
        width: crop.width * scale,
        height: crop.height * scale,
      }
    : null;

  return (
    <div className="space-y-3">
      <div
        ref={panelRef}
        className="relative mx-auto flex max-w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
        style={{ height: panel.height }}
      >
        {src && (
          <div className="relative" style={{ lineHeight: 0 }}>
            <img
              ref={imgRef}
              src={src}
              alt="Signature to crop"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                const size = {
                  width: el.naturalWidth,
                  height: el.naturalHeight,
                };
                setNatural(size);
                setCrop(initialCrop(size));
              }}
              style={
                natural
                  ? { width: natural.width * scale, height: natural.height * scale }
                  : undefined
              }
            />

            {box && (
              <>
                {/* Everything outside the selection, dimmed. Four panels rather
                    than one box-shadow so it prints predictably in a screenshot. */}
                <div className="pointer-events-none absolute inset-0 bg-slate-900/45"
                     style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${box.left}px ${box.top}px, ${box.left}px ${box.top + box.height}px, ${box.left + box.width}px ${box.top + box.height}px, ${box.left + box.width}px ${box.top}px, ${box.left}px ${box.top}px)` }} />
                <div
                  onPointerDown={startDrag('move')}
                  className="absolute cursor-move rounded-sm border-2 border-white shadow-[0_0_0_1px_rgba(15,23,42,.45)]"
                  style={box}
                >
                  <span className="absolute -top-6 left-0 rounded bg-slate-900/80 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">
                    3 : 1
                  </span>
                  <span
                    onPointerDown={startDrag('resize')}
                    className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-brand-500"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {natural && (
        <label className="block px-1">
          <span className="text-xs text-slate-500">Size</span>
          <input
            type="range"
            min={Math.min(40, maxCropWidth(natural))}
            max={maxCropWidth(natural)}
            value={crop?.width ?? 0}
            onChange={(e) =>
              setCrop((c) =>
                c ? clampCrop({ ...c, width: Number(e.target.value) }, natural) : c,
              )
            }
            className="mt-1 w-full accent-brand-500"
          />
        </label>
      )}

      <p className="px-1 text-xs text-slate-500">
        Drag the box over your signature, or use the slider to resize it. The
        crop is always 3:1 and is saved at {OUTPUT_WIDTH}×{OUTPUT_HEIGHT}.
      </p>

      <div className={cn('flex justify-end gap-2')}>
        <Button variant="secondary" onClick={onCancel} disabled={isUploading}>
          Cancel
        </Button>
        <Button onClick={apply} disabled={!crop || isUploading} isLoading={isUploading}>
          Save signature
        </Button>
      </div>
    </div>
  );
}
