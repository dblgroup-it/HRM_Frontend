import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@shared/lib';

/**
 * A panel hanging off something in the header.
 *
 * Portalled to `<body>`, because the header sits inside the layout's
 * `overflow-hidden` column — a panel rendered in place is clipped at the
 * header's own edge, which is why the calendar lost its last row of days.
 * Being outside that column it is positioned by hand: anchored to the
 * trigger, right-aligned with it, and nudged back on screen if it would run
 * off the edge.
 *
 * It closes the three ways people expect: a click anywhere else, Escape, and
 * — where `autoCloseMs` is given — on its own, for a panel that is glanced at
 * rather than worked in.
 */
export function HeaderPopover({
  open,
  onClose,
  triggerRef,
  children,
  className,
  autoCloseMs,
  label,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  /** Close by itself after this long without interaction. */
  autoCloseMs?: number;
  label?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; right: number } | null>(null);

  /**
   * `onClose`, without its identity.
   *
   * Callers pass an inline arrow, so it is a different function on every
   * render — and the header re-renders every second, because it shows a
   * running clock. An effect that depended on it restarted its countdown
   * once a second and therefore never finished it. This is the fix for that
   * bug, not a style preference.
   */
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    setBox({
      top: r.bottom + 8,
      // Right-aligned with the trigger, held off the viewport edge.
      right: Math.max(8, window.innerWidth - r.right),
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open, position]);

  // Escape, and a click on anything that is neither the panel nor the
  // trigger — clicking the trigger again is its own toggle and must not be
  // handled twice.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, triggerRef]);

  /**
   * Close on a timer, restarted by any interaction inside the panel.
   *
   * A panel that vanishes while it is being read is worse than one that
   * stays: the countdown is for a glance that ended, not for somebody who
   * is still there. The listeners go on the document and ask whether the
   * event came from inside the panel — the panel is portalled and mounts a
   * frame after this runs, so anything bound to `panelRef.current` here
   * would bind to nothing.
   */
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    let timer = window.setTimeout(() => closeRef.current(), autoCloseMs);
    const restart = (e: Event) => {
      if (!panelRef.current?.contains(e.target as Node)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => closeRef.current(), autoCloseMs);
    };
    document.addEventListener('pointermove', restart, true);
    document.addEventListener('pointerdown', restart, true);
    document.addEventListener('keydown', restart, true);
    document.addEventListener('scroll', restart, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointermove', restart, true);
      document.removeEventListener('pointerdown', restart, true);
      document.removeEventListener('keydown', restart, true);
      document.removeEventListener('scroll', restart, true);
    };
  }, [open, autoCloseMs]);

  if (!open || !box) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      style={{
        top: box.top,
        right: box.right,
        // Never taller than what is left of the screen below the trigger.
        maxHeight: `calc(100dvh - ${box.top + 12}px)`,
      }}
      className={cn(
        'animate-fade-in fixed z-50 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,0.55)]',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
