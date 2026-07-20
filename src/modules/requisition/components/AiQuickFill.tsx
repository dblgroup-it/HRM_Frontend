import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Info, Sparkles, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button, BusyOverlay } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { requisitionApi } from '../api/requisition.api';
import type { RequisitionDraft } from '../types/requisition.types';

const EXAMPLES = [
  'One executive for production at JTML, urgent',
  '2 senior officers for quality control, permanent',
  'Assistant manager for maintenance, 5 years experience',
];

/**
 * Floating AI assistant: a pill button that opens a compact prompt panel.
 * Describe the vacancy → the form is drafted. The user reviews and edits every
 * field; nothing is submitted automatically.
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
    if (open) boxRef.current?.focus();
  }, [open]);

  // Esc closes the panel.
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
    setFilled(false);
    draft.mutate(text);
  };

  return (
    <>
      {/* Floating pill */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fixed bottom-16 right-8 z-40 inline-flex items-center gap-2.5 rounded-full py-4 pl-6 pr-7',
          'bg-gradient-to-r from-violet-600 to-brand-600 text-white shadow-xl shadow-violet-500/40',
          'transition hover:shadow-2xl hover:shadow-violet-500/50 active:scale-95',
          open && 'ring-4 ring-violet-200',
        )}
        title="Describe the vacancy — the assistant drafts the form"
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-base font-semibold">AI Assist</span>
      </button>

      {/* Prompt panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className={cn(
              'fixed bottom-36 right-8 z-50 w-[min(26rem,calc(100vw-3rem))]',
              'rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl',
              'animate-fade-in',
            )}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  Describe the vacancy
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  The assistant drafts the form — you can edit everything after.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              ref={boxRef}
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run();
              }}
              placeholder="e.g. Need one executive for the production department at JTML, urgent"
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />

            {!filled && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] text-slate-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {filled && (
              <div className="mt-2 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Form filled — review each field below.
                </p>
                {notes && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>
                      <span className="font-semibold">Assumed:</span> {notes}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">⌘/Ctrl + Enter</span>
              <div className="flex gap-2">
                {filled && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                  >
                    Done
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  isLoading={draft.isPending}
                  leftIcon={<Wand2 className="h-3.5 w-3.5" />}
                  onClick={run}
                >
                  {draft.isPending
                    ? 'Drafting…'
                    : filled
                      ? 'Redraft'
                      : 'Draft form'}
                </Button>
              </div>
            </div>
          </div>
        </>
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
