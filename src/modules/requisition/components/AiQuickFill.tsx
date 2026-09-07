import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Info, Sparkles, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button, BusyOverlay } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { requisitionApi } from '../api/requisition.api';
import type { RequisitionDraft } from '../types/requisition.types';

// Written against the fixed vocabulary so each one actually resolves:
// department -> section -> sub-section, a real designation, and a zone.
const EXAMPLES = [
  'Officer for Corporate HR, HR Operations payroll, Dhaka Zone',
  '2 senior officers for Quality Control knitting at JTML, urgent',
  'Assistant Manager for Maintenance electrical, Kashimpur Zone',
];

/**
 * AI-draft entry point — a colorful tab docked to the right edge of the
 * viewport; clicking it opens a light glass panel with an animated gradient
 * border. Describe the vacancy → the form is drafted. The user reviews and
 * edits every field; nothing is submitted automatically. Portal-rendered to
 * `document.body` so the fixed positioning holds regardless of animated
 * ancestors elsewhere on the page (e.g. the wizard card's rise-in transform).
 */
export function AiQuickFill({
  onDrafted,
}: {
  onDrafted: (draft: RequisitionDraft) => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [notes, setNotes] = useState('');
  const [filled, setFilled] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !filled) setTimeout(() => boxRef.current?.focus(), 250);
  }, [open, filled]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const draft = useMutation({
    mutationFn: (text: string) => requisitionApi.draft(text),
    onSuccess: (result) => {
      onDrafted(result);
      setNotes(result.notes ?? '');
      setFilled(true);
      toast.success('Form filled — review every field before submitting');
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Could not draft the requisition';
      toast.error(message);
    },
  });

  const run = () => {
    const text = prompt.trim();
    if (text.length < 5) {
      toast.error('Describe the vacancy in a few more words');
      return;
    }
    draft.mutate(text);
  };

  const openPanel = () => {
    // Reopen on the description step, not a stale success screen — the
    // previous prompt stays put so it can be tweaked, not retyped.
    setFilled(false);
    setOpen(true);
  };

  return (
    <>
      {/* Docked tab — colorful + animated, sits flush against the right edge.
          Outer div owns the fixed position/centering transform; the inner
          button owns the float animation, so the two transforms don't fight. */}
      {!open && (
        <div className="fixed right-0 top-1/2 z-40 -translate-y-1/2">
          <button
            type="button"
            onClick={openPanel}
            title="Let AI draft this requisition"
            className={cn(
              'group relative flex animate-float flex-col items-center gap-2.5 overflow-hidden rounded-l-2xl',
              'py-4 pl-3 pr-2.5 text-white shadow-lg ring-1 ring-inset ring-white/15',
              'transition-[padding,box-shadow] duration-200 hover:pl-4',
              'bg-[length:200%_200%] bg-gradient-to-br',
              filled
                ? 'from-emerald-500 via-emerald-400 to-teal-400 shadow-emerald-900/25'
                : 'animate-gradient-pan from-brand-600 via-brand-500 to-emerald-500 shadow-brand-900/30',
            )}
          >
            {/* Hover sheen sweep */}
            {!filled && (
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            )}
            <span className="relative flex h-9 w-9 items-center justify-center">
              <span
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm',
                  filled ? 'text-emerald-600' : 'text-brand-600',
                )}
              >
                {filled ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4 animate-spin-slow" />
                )}
              </span>
            </span>
            <span
              className="relative text-[11px] font-bold uppercase tracking-wider"
              style={{ writingMode: 'vertical-rl' }}
            >
              {filled ? 'AI drafted' : 'AI Assist'}
            </span>
          </button>
        </div>
      )}

      {open &&
        createPortal(
          <>
            {/* Invisible click-away catcher — light touch, no dark backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            {/* Slowly-animating gradient border frame around a light glass panel */}
            <div
              className={cn(
                'fixed right-4 top-1/2 z-50 max-h-[min(35rem,85vh)] w-[min(24rem,calc(100vw-2rem))] -translate-y-1/2 rounded-[1.35rem]',
                'animate-rise-in bg-[length:200%_200%] p-[1.5px] shadow-2xl shadow-brand-900/20',
                filled
                  ? 'bg-gradient-to-br from-emerald-300 via-teal-200 to-brand-300'
                  : 'animate-gradient-pan bg-gradient-to-br from-brand-400 via-emerald-300 to-brand-300',
              )}
            >
              <div className="relative flex h-full max-h-[inherit] flex-col overflow-hidden rounded-[1.25rem] bg-white/90 backdrop-blur-xl">
                {/* Ambient colour wash — quiet depth, not a hard line */}
                <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />

                <div className="relative flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-400 text-white shadow-md shadow-brand-900/20">
                    <span className="absolute inset-0 rounded-xl bg-brand-400/60 animate-ping" />
                    <Sparkles className="relative h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Describe the vacancy
                    </h2>
                    <p className="text-xs text-slate-500">
                      One sentence in — a drafted form out.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative flex-1 overflow-y-auto px-5 py-4">
                  {!filled ? (
                    <>
                      <textarea
                        ref={boxRef}
                        rows={4}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run();
                        }}
                        placeholder="e.g. Need 2 officers for Production sewing at JTML, Kashimpur Zone, urgent"
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-shadow duration-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                      />

                      <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Try an example
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {EXAMPLES.map((ex, i) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => setPrompt(ex)}
                            style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
                            className="animate-fade-in rounded-lg border border-dashed border-slate-200 px-2.5 py-1.5 text-left text-xs text-slate-500 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-emerald-800">
                        <CheckCircle2 className="h-5 w-5 shrink-0 animate-loader-pop" />
                        <p className="text-sm font-medium">
                          Form filled — review every field, starting at Section A.
                        </p>
                      </div>
                      {notes && (
                        <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 animate-fade-in">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{notes}</span>
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setFilled(false)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700"
                      >
                        Try a different description
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
                  <span className="text-[11px] text-slate-400">⌘/Ctrl + Enter</span>
                  {filled ? (
                    <Button type="button" onClick={() => setOpen(false)}>
                      Review the form
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      isLoading={draft.isPending}
                      leftIcon={<Wand2 className="h-4 w-4" />}
                      onClick={run}
                    >
                      {draft.isPending ? 'Drafting…' : 'Draft form'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      <BusyOverlay
        show={draft.isPending}
        variant="ai"
        label="Drafting the requisition…"
        sublabel="Matching your request to the unit's departments and roles."
      />
    </>
  );
}
