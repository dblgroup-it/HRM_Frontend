import { useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@shared/lib';
import { useAnchoredPanel } from '@shared/hooks';

export interface ToolbarMenuItem {
  key: string;
  icon: ReactNode;
  /** Tailwind classes for the icon's badge, e.g. "bg-brand-600". */
  tone: string;
  title: string;
  hint: string;
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * A dropdown hung off a glass-toolbar button — "Add candidate", "Tools".
 *
 * Portalled, because the glass toolbar clips anything that overflows it, and
 * right-aligned under its button, kept on screen.
 */
export function ToolbarMenu({
  trigger,
  items,
  width = 288,
  label,
}: {
  /** The button; given the open state and the toggle to call. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: ToolbarMenuItem[];
  width?: number;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, panelStyle, ready } =
    useAnchoredPanel<HTMLSpanElement>(open, close);

  const style = panelStyle
    ? {
        ...panelStyle,
        width,
        left: Math.max(
          8,
          Math.min(
            window.innerWidth - width - 8,
            Number(panelStyle.left) + Number(panelStyle.width) - width,
          ),
        ),
      }
    : undefined;

  return (
    <>
      <span ref={triggerRef} className="inline-flex">
        {trigger({ open, toggle: () => setOpen((v) => !v) })}
      </span>
      {open &&
        ready &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={label}
            data-portal-panel="true"
            style={style}
            className="z-[60] animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white [&>svg]:h-4 [&>svg]:w-4',
                    item.tone,
                  )}
                >
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">
                    {item.title}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {item.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
