import { useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Files, Plus, UserPlus } from 'lucide-react';

import { GlassToolbarPrimary } from '@shared/components/ui';
import { useAnchoredPanel } from '@shared/hooks';

const PANEL_WIDTH = 288;

/**
 * "Add candidate" as a menu: one person, or a stack of CVs at once.
 *
 * Bulk upload used to be its own button further along the toolbar, where it
 * read as a different kind of action rather than another way of doing this
 * one. Portalled, because the glass toolbar clips anything that overflows it.
 */
export function AddCandidateMenu({
  onSingle,
  onBulk,
}: {
  onSingle: () => void;
  onBulk: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, panelStyle, ready } =
    useAnchoredPanel<HTMLSpanElement>(open, close);

  // Right-aligned under the button, wider than it, and kept on screen.
  const style = panelStyle
    ? {
        ...panelStyle,
        width: PANEL_WIDTH,
        left: Math.max(
          8,
          Math.min(
            window.innerWidth - PANEL_WIDTH - 8,
            Number(panelStyle.left) + Number(panelStyle.width) - PANEL_WIDTH,
          ),
        ),
      }
    : undefined;

  const choose = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <span ref={triggerRef} className="inline-flex">
        <GlassToolbarPrimary
          icon={<Plus />}
          compactLabel="Add"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Add candidate
        </GlassToolbarPrimary>
      </span>
      {open &&
        ready &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            data-portal-panel="true"
            style={style}
            className="z-[60] animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
          >
            <MenuItem
              icon={<UserPlus className="h-4 w-4" />}
              tone="bg-brand-600"
              title="Single candidate"
              hint="One person — CV, source and referral"
              onClick={choose(onSingle)}
            />
            <MenuItem
              icon={<Files className="h-4 w-4" />}
              tone="bg-emerald-600"
              title="Bulk CV upload"
              hint="Up to 30 PDFs at once, one source"
              onClick={choose(onBulk)}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

/** Kept here, not exported: the menu's own rows. */
function MenuItem({
  icon,
  tone,
  title,
  hint,
  onClick,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${tone}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-800">{title}</span>
        <span className="block truncate text-xs text-slate-500">{hint}</span>
      </span>
    </button>
  );
}
