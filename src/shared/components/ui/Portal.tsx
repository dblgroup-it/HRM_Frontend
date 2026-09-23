import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders into `document.body`. A `fixed inset-0` overlay rendered in place is
 * positioned against the nearest ancestor with a transform, filter or
 * backdrop-filter — the page's animated / glass containers — so on a long page
 * it centred itself in the middle of the content, off screen. Anything meant
 * to cover the viewport goes through this.
 */
export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
