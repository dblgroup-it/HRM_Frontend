import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';

const FADE = 28;

/**
 * Labels when they all fit, icons when they don't — measured, not a breakpoint.
 *
 * A breakpoint only knows the screen; these bars sit in columns whose width
 * depends on the sidebar, the card and whatever shares their row. So the bar
 * is measured instead:
 *
 * - `frame` — the space the bar may take (its clientWidth is the room);
 * - `bar`   — the visible bar, including anything that never scrolls;
 * - `row`   — the scrolling row of items inside it.
 *
 * The width the bar needs with labels is only knowable while they show, so it
 * is recorded then and compared with the room on every change after. It is
 * one quantity on both sides of the comparison, so trimming a label (which
 * frees room) can never flip it straight back.
 *
 * Also reports which edges of the row are scrolled out of view, as a CSS mask
 * that fades them. Runs after every render (the checks are guarded, so it
 * settles); `refit` is for events React does not see — scroll, resize.
 */
export function useFitLabels({
  frameRef,
  barRef,
  rowRef,
  onLayout,
}: {
  frameRef: RefObject<HTMLElement | null>;
  barRef: RefObject<HTMLElement | null>;
  rowRef: RefObject<HTMLElement | null>;
  /** Runs after each fit — e.g. to re-measure a sliding indicator. */
  onLayout?: () => void;
}) {
  const [compact, setCompact] = useState(false);
  const [edges, setEdges] = useState({ start: false, end: false });
  const needed = useRef(0);
  const onLayoutRef = useRef(onLayout);

  useLayoutEffect(() => {
    onLayoutRef.current = onLayout;
  });

  const refit = useCallback(() => {
    const frame = frameRef.current;
    const bar = barRef.current;
    const row = rowRef.current;
    if (!frame || !bar || !row) return;
    const room = frame.clientWidth;
    if (!compact) {
      needed.current = row.scrollWidth + (bar.offsetWidth - row.clientWidth);
      if (needed.current > room + 1) setCompact(true);
    } else if (needed.current && needed.current <= room) {
      setCompact(false);
    }
    const start = row.scrollLeft > 2;
    const end = row.scrollLeft + row.clientWidth < row.scrollWidth - 2;
    setEdges((prev) =>
      prev.start === start && prev.end === end ? prev : { start, end },
    );
    onLayoutRef.current?.();
  }, [compact, frameRef, barRef, rowRef]);

  useLayoutEffect(() => {
    refit();
  });

  // Widths move when the web font lands and when the page column resizes.
  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => refit());
    if (frameRef.current) ro.observe(frameRef.current);
    if (rowRef.current) ro.observe(rowRef.current);
    return () => ro.disconnect();
  }, [refit, frameRef, rowRef]);

  const mask =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'} 0, #000 ${FADE}px, #000 calc(100% - ${FADE}px), ${edges.end ? 'transparent' : '#000'} 100%)`
      : undefined;

  return {
    compact,
    refit,
    maskStyle: { maskImage: mask, WebkitMaskImage: mask },
  };
}
