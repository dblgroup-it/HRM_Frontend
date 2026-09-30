import { useId, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@shared/lib';

export interface CreditLine {
  text: string;
  className: string;
}

/** Gap between the text and the path the light runs along, in px. */
const ORBIT_PAD = 5;
const ORBIT_RADIUS = 6;

/**
 * Outline that hugs each line of text: a narrow box around the short top
 * line stepping out to a wider box around the name, so two lines trace an
 * upside-down T. Corners are rounded, concave ones included.
 */
function outlinePath(boxes: DOMRect[], origin: DOMRect): string {
  const rows = boxes.map((b) => ({
    l: b.left - origin.left - ORBIT_PAD,
    r: b.right - origin.left + ORBIT_PAD,
    t: b.top - origin.top,
    b: b.bottom - origin.top,
  }));
  if (rows.length === 0) return '';
  rows[0].t -= ORBIT_PAD;
  rows[rows.length - 1].b += ORBIT_PAD;
  for (let i = 1; i < rows.length; i++) {
    const mid = (rows[i - 1].b + rows[i].t) / 2;
    rows[i - 1].b = mid;
    rows[i].t = mid;
  }
  // Clockwise: down the right edge row by row, back up the left.
  const pts: [number, number][] = [];
  rows.forEach((row) => pts.push([row.r, row.t], [row.r, row.b]));
  [...rows].reverse().forEach((row) => pts.push([row.l, row.b], [row.l, row.t]));
  const clean = pts.filter(
    (p, i) => {
      const q = pts[(i + 1) % pts.length];
      return Math.abs(p[0] - q[0]) > 0.5 || Math.abs(p[1] - q[1]) > 0.5;
    }
  );
  const n = clean.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const [px, py] = clean[(i - 1 + n) % n];
    const [cx, cy] = clean[i];
    const [nx, ny] = clean[(i + 1) % n];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(ORBIT_RADIUS, inLen / 2, outLen / 2);
    const ax = cx - ((cx - px) / inLen) * r;
    const ay = cy - ((cy - py) / inLen) * r;
    const bx = cx + ((nx - cx) / outLen) * r;
    const by = cy + ((ny - cy) / outLen) * r;
    d += `${i === 0 ? 'M' : 'L'}${ax.toFixed(1)},${ay.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)} `;
  }
  return d + 'Z';
}

/**
 * The "Developed by" credit: text only, with one short streak of brand light
 * running around the outline of the words themselves. Only the streak is
 * stroked, so the text never sits in a box.
 */
export function DevCredit({
  lines,
  className,
  title,
}: {
  lines: CreditLine[];
  className?: string;
  title?: string;
}) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [d, setD] = useState('');

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const boxes = lineRefs.current
        .filter((el): el is HTMLSpanElement => !!el && el.offsetWidth > 0)
        .map((el) => el.getBoundingClientRect());
      setD(boxes.length ? outlinePath(boxes, wrap.getBoundingClientRect()) : '');
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [lines.length]);

  return (
    <div
      ref={wrapRef}
      className={cn('relative px-3 py-2 text-center', className)}
      title={title}
    >
      {d && (
        <svg className="dev-credit-orbit" aria-hidden>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1877c0" />
              <stop offset="100%" stopColor="#8cc63f" />
            </linearGradient>
          </defs>
          <path d={d} pathLength={100} stroke={`url(#${id})`} />
        </svg>
      )}
      {lines.map((line, i) => (
        <p key={line.text} className="leading-tight">
          <span
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={cn('inline-block max-w-full truncate align-top', line.className)}
          >
            {line.text}
          </span>
        </p>
      ))}
    </div>
  );
}
