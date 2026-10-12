import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

const prefersStill = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/**
 * Counts to `value`, easing out — a number arriving, not a slot machine.
 * From 0 the first time, then from whatever is showing; under reduced motion
 * it simply shows the number. Always ends on `value`, whatever changes in
 * between (it once stuck at 0 when the motion setting changed mid-visit).
 */
export function useCountUp(value: number, durationMs = 900): number {
  const [shown, setShown] = useState(() => (prefersStill() ? value : 0));
  const showing = useRef(shown);

  useEffect(() => {
    const from = showing.current;
    if (prefersStill() || from === value) {
      showing.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const next = Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3)));
      showing.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return shown;
}

/**
 * Leans a card's cover toward the pointer: sets `--rx` / `--ry` on the card,
 * which the cover's transform reads. Mouse only, and nothing at all under
 * reduced motion.
 */
export function useTilt<T extends HTMLElement>(strength = 7) {
  const ref = useRef<T>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent<T>) => {
      const el = ref.current;
      if (!el || e.pointerType !== 'mouse' || prefersStill()) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', `${(x * strength * 2).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-y * strength).toFixed(2)}deg`);
    },
    [strength],
  );

  const onPointerLeave = useCallback(() => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
