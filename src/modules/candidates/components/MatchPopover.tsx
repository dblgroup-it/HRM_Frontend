import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDot, Sparkles, X } from 'lucide-react';

import { cn } from '@shared/lib';

import type { MatchCriterion } from '../types/candidate.types';

interface Props {
  open: boolean;
  /** Kept for the callers; the breakdown is a centred dialog, not pinned to it. */
  anchor?: HTMLElement | null;
  onClose: () => void;
  candidateName: string;
  matchScore: number;
  matchSummary: string;
  criteria: MatchCriterion[];
}

function band(s: number) {
  if (s >= 75) return { label: 'Strong match', ring: '#10b981', text: 'text-emerald-700', soft: 'bg-emerald-50' };
  if (s >= 55) return { label: 'Good match', ring: '#f59e0b', text: 'text-amber-700', soft: 'bg-amber-50' };
  return { label: 'Partial match', ring: '#64748b', text: 'text-slate-600', soft: 'bg-slate-100' };
}

/** How well one requirement is met, in words as well as a bar. */
function verdict(pct: number) {
  if (pct >= 80) return { word: 'Met', Icon: CheckCircle2, chip: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' };
  if (pct >= 45) return { word: 'Partly met', Icon: CircleDot, chip: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' };
  return { word: 'Gap', Icon: AlertTriangle, chip: 'bg-rose-50 text-rose-700', bar: 'bg-rose-400' };
}

/**
 * Why the AI scored a CV the way it did.
 *
 * A centred dialog rather than a popover pinned to the score: pinned, it only
 * got the room left above or below the button, the summary ate most of that,
 * and the criteria — the reason to open it — were a two-line strip. Here the
 * summary folds away and the criteria have the rest of the window to scroll.
 */
export function MatchPopover({ open, onClose, candidateName, matchScore, matchSummary, criteria }: Props) {
  const [shown, setShown] = useState(false);
  const [fullSummary, setFullSummary] = useState(false);

  useEffect(() => {
    if (!open) {
      setShown(false);
      setFullSummary(false);
      return;
    }
    const t = requestAnimationFrame(() => setShown(true));
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const b = band(matchScore);
  const r = 30;
  const C = 2 * Math.PI * r;
  const rows = criteria.map((c) => ({
    ...c,
    pct: c.weight > 0 ? Math.round((c.score / c.weight) * 100) : 0,
  }));
  const met = rows.filter((c) => c.pct >= 80).length;
  const gaps = rows.filter((c) => c.pct < 45).length;

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-6">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-safe:animate-fade-in" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`AI match breakdown — ${candidateName}`}
        className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 motion-safe:animate-rise-in"
      >
        {/* ── The score, and the AI's own summary ── */}
        <div className="shrink-0 px-6 pb-4 pt-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
                <circle cx="38" cy="38" r={r} fill="none" stroke={b.ring} strokeOpacity="0.14" strokeWidth="7" />
                <circle
                  cx="38" cy="38" r={r} fill="none" stroke={b.ring} strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - (shown ? matchScore : 0) / 100)}
                  style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold leading-none tabular-nums text-slate-900">{matchScore}</span>
                <span className="text-[0.625rem] font-medium text-slate-500">/ 100</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-500">
                <Sparkles className="h-3 w-3 text-violet-500" /> AI match
              </p>
              <h2 className="mt-0.5 truncate text-lg font-semibold text-slate-900">{candidateName}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className={cn('rounded-md px-2 py-0.5 font-semibold', b.soft, b.text)}>{b.label}</span>
                {rows.length > 0 && (
                  <>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{met} met</span>
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 font-medium text-rose-700">{gaps} gap{gaps === 1 ? '' : 's'}</span>
                    <span className="text-slate-500">of {rows.length} criteria</span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {matchSummary && (
            <div className="mt-4 rounded-2xl bg-violet-50/70 px-4 py-3">
              <p className={cn('text-[0.8125rem] leading-relaxed text-slate-700', !fullSummary && 'line-clamp-2')}>
                {matchSummary}
              </p>
              {matchSummary.length > 180 && (
                <button
                  type="button"
                  onClick={() => setFullSummary((v) => !v)}
                  className="mt-1 text-xs font-medium text-violet-700 hover:underline"
                >
                  {fullSummary ? 'Show less' : 'Read the whole summary'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── The criteria: this part scrolls ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 px-6 py-4">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No criteria were recorded for this score. Re-scan the CV to get a breakdown.</p>
          ) : (
            <ol className="grid gap-2.5">
              {rows.map((c, i) => {
                const v = verdict(c.pct);
                return (
                  <li
                    key={i}
                    style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 motion-safe:animate-card-in"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{c.label}</p>
                      <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', v.chip)}>
                        <v.Icon className="h-3.5 w-3.5" /> {v.word}
                      </span>
                      <span className="w-16 text-right text-sm font-bold tabular-nums text-slate-900">
                        {c.score}<span className="font-medium text-slate-400">/{c.weight}</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn('h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none', v.bar)}
                        style={{ width: shown ? `${c.pct}%` : '0%', transitionDelay: `${i * 60 + 150}ms` }}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 text-[0.8125rem] leading-relaxed sm:grid-cols-2">
                      <div>
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-brand-700">What the role asks</p>
                        <p className="mt-0.5 text-slate-700">{c.requirement || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">What the CV shows</p>
                        <p className="mt-0.5 text-slate-700">{c.applicant || '—'}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-6 py-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Sparkles className="h-3 w-3 shrink-0 text-violet-500" />
            Scored by AI against the role profile. A person makes the decision; Re-scan refreshes it.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.97]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
