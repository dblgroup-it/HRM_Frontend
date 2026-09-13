import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

/**
 * Position a floating panel against a trigger, outside every clipping ancestor.
 *
 * Dropdowns rendered in place are cut off by any ancestor with
 * `overflow-hidden` — the approval-path accordion and the assessment panel both
 * need that for their rounded corners and internal scrolling. Panels using this
 * hook are portalled to <body> and positioned by hand instead.
 *
 * Three things it handles that a naive implementation misses:
 *  - the app scrolls an inner container, not the window, so it listens on every
 *    scrollable ancestor of the trigger rather than on `window` alone;
 *  - it flips above the trigger when there is more room there;
 *  - it closes when the trigger is scrolled out of sight, so a panel never
 *    floats beside unrelated content.
 *
 * Mark the rendered panel with `data-portal-panel="true"` so components with
 * their own outside-click handling can tell that a click inside it still
 * belongs to the field.
 */
export function useAnchoredPanel<
  T extends HTMLElement = HTMLElement,
>(open: boolean, onClose: () => void) {
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    above: boolean;
  } | null>(null);

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const GAP = 4;
    const below = window.innerHeight - r.bottom - GAP;
    const above = r.top - GAP;
    // Flip up only when there is meaningfully more room there.
    const flip = below < 220 && above > below;
    setBox({
      top: r.bottom + GAP,
      left: r.left,
      width: r.width,
      maxHeight: Math.max(160, Math.min(360, flip ? above : below)),
      above: flip,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    position();

    const scrollParents: (HTMLElement | Window)[] = [window];
    for (let el = triggerRef.current?.parentElement; el; el = el.parentElement) {
      const { overflowY, overflow } = getComputedStyle(el);
      if (/(auto|scroll|overlay)/.test(`${overflowY} ${overflow}`)) {
        scrollParents.push(el);
      }
    }

    const onScroll = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      if (r.bottom < 0 || r.top > window.innerHeight) {
        onClose();
        return;
      }
      position();
    };

    scrollParents.forEach((t) => t.addEventListener('scroll', onScroll));
    window.addEventListener('resize', position);
    return () => {
      scrollParents.forEach((t) => t.removeEventListener('scroll', onScroll));
      window.removeEventListener('resize', position);
    };
  }, [open, position, onClose]);

  // Close when attention moves elsewhere, treating the portalled panel as
  // inside — otherwise clicking an option would close before it registered.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        !triggerRef.current?.contains(target as Node) &&
        !panelRef.current?.contains(target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, onClose]);

  const panelStyle: CSSProperties | undefined = box
    ? {
        position: 'fixed',
        left: box.left,
        width: box.width,
        maxHeight: box.maxHeight,
        ...(box.above
          ? {
              bottom:
                window.innerHeight -
                (triggerRef.current?.getBoundingClientRect().top ?? 0) +
                4,
            }
          : { top: box.top }),
      }
    : undefined;

  return { triggerRef, panelRef, panelStyle, ready: Boolean(box) };
}
