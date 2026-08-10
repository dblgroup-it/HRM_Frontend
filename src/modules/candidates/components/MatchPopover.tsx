import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { MatchCriterion } from '../types/candidate.types';

const POP_W = 428;

interface Props {
  open: boolean;
  anchor: HTMLElement | null;
  onClose: () => void;
  candidateName: string;
  matchScore: number;
  matchSummary: string;
  criteria: MatchCriterion[];
}

function tone(s: number) {
  if (s >= 75) return { ring: '#10b981', ringMid: '#34d399', bg: 'rgba(16,185,129,0.06)', label: 'Strong Match' };
  if (s >= 55) return { ring: '#f59e0b', ringMid: '#fbbf24', bg: 'rgba(245,158,11,0.06)', label: 'Good Match' };
  return { ring: '#6b7280', ringMid: '#9ca3af', bg: 'rgba(107,114,128,0.05)', label: 'Partial Match' };
}

function barColor(pct: number) {
  if (pct >= 80) return { fill: '#10b981', track: '#d1fae5', text: '#065f46' };
  if (pct >= 55) return { fill: '#f59e0b', track: '#fef3c7', text: '#78350f' };
  return { fill: '#94a3b8', track: '#f1f5f9', text: '#475569' };
}

export function MatchPopover({ open, anchor, onClose, candidateName, matchScore, matchSummary, criteria }: Props) {
  const popRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [arrowLeft, setArrowLeft] = useState(20);
  const [above, setAbove] = useState(false);
  const [maxHeight, setMaxHeight] = useState(560);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open || !anchor) { setReady(false); return; }

    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 12;

    const w = Math.min(POP_W, vw - 16);
    const left = Math.min(Math.max(8, rect.left), vw - w - 8);
    setArrowLeft(Math.max(12, Math.min(rect.left + rect.width / 2 - left - 7, w - 24)));

    const spaceBelow = vh - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    // Flip above when above has more room OR below is too tight
    const flip = spaceAbove > spaceBelow + 60 || spaceBelow < 360;
    setAbove(flip);

    const availH = Math.min(flip ? spaceAbove : spaceBelow, 560);
    setMaxHeight(Math.max(availH, 180));

    const s: React.CSSProperties = { position: 'fixed', left, width: w, zIndex: 9999 };
    if (flip) { s.bottom = vh - rect.top + GAP; s.top = 'auto'; }
    else { s.top = rect.bottom + GAP; s.bottom = 'auto'; }
    setStyle(s);

    const t = setTimeout(() => setReady(true), 20);
    return () => clearTimeout(t);
  }, [open, anchor]);

  useEffect(() => {
    if (!open) { setReady(false); return; }
    const close = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return;
      if (anchor?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, anchor, onClose]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open) return null;

  const t = tone(matchScore);
  const r = 28; const C = 2 * Math.PI * r;

  return createPortal(
    <div
      ref={popRef}
      style={{
        ...style,
        maxHeight,
        opacity: ready ? 1 : 0,
        transform: ready
          ? 'scale(1) translateY(0)'
          : above ? 'scale(0.96) translateY(6px)' : 'scale(0.96) translateY(-6px)',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        transformOrigin: above ? 'bottom left' : 'top left',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_16px_48px_-8px_rgba(0,0,0,0.2),0_4px_16px_-4px_rgba(0,0,0,0.08)]"
    >
      {/* Arrow */}
      {!above && <div className="absolute -top-[7px] h-3.5 w-3.5 rotate-45 border-l border-t border-slate-200/70 bg-white" style={{ left: arrowLeft }} />}
      {above && <div className="absolute -bottom-[7px] h-3.5 w-3.5 rotate-45 border-b border-r border-slate-200/70 bg-white" style={{ left: arrowLeft }} />}

      {/* ── Header ── */}
      <div style={{ background: t.bg }} className="shrink-0 px-5 pt-4 pb-4">
        <div className="flex items-start gap-4">
          {/* Score ring */}
          <div className="relative shrink-0">
            <svg width="66" height="66" viewBox="0 0 66 66" className="-rotate-90">
              <circle cx="33" cy="33" r={r} fill="none" stroke={t.ring} strokeOpacity="0.12" strokeWidth="6" />
              <circle cx="33" cy="33" r={r} fill="none" stroke={t.ring} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - matchScore / 100)}
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.06s' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[17px] font-bold leading-none" style={{ color: t.ring }}>{matchScore}</span>
              <span className="text-[9px] font-medium leading-tight text-slate-400">/ 100</span>
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: `${t.ring}18`, color: t.ring }}>
              <Sparkles className="h-3 w-3" />
              {t.label}
            </span>
            <p className="mt-1 truncate text-[14px] font-bold text-slate-900">{candidateName}</p>
            {matchSummary && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 line-clamp-2">{matchSummary}</p>
            )}
          </div>

          <button type="button" onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Overall bar */}
        <div className="mt-3.5">
          <div className="h-[6px] w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div className="h-full rounded-full"
              style={{
                width: ready ? `${matchScore}%` : '0%',
                background: `linear-gradient(90deg, ${t.ring}, ${t.ringMid})`,
                transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.05s',
              }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px]">
            <span className="font-medium text-slate-400">Overall match score</span>
            <span className="font-bold tabular-nums" style={{ color: t.ring }}>{matchScore}%</span>
          </div>
        </div>
      </div>

      {/* ── Section label ── */}
      <div className="shrink-0 border-y border-slate-100 bg-slate-50/60 px-5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Criteria Breakdown</span>
      </div>

      {/* ── Criteria cards ── */}
      <div className="min-h-0 flex-1 divide-y divide-slate-50 overflow-y-auto">
        {criteria.map((c, i) => {
          const pct = c.weight > 0 ? Math.round((c.score / c.weight) * 100) : 0;
          const bc = barColor(pct);
          return (
            <div key={i} className="px-5 py-3 transition-colors hover:bg-slate-50/70">
              {/* Bar row */}
              <div className="flex items-center gap-3">
                <span className="w-[33%] shrink-0 text-[12px] font-semibold leading-tight text-slate-800">
                  {c.label}
                </span>
                <div className="relative h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: bc.track }}>
                  <div className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: ready ? `${pct}%` : '0%',
                      backgroundColor: bc.fill,
                      transition: `width 0.55s cubic-bezier(0.34,1.56,0.64,1) ${i * 65 + 200}ms`,
                    }} />
                </div>
                <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                  style={{ background: bc.track, color: bc.text, minWidth: 40, textAlign: 'center' }}>
                  {c.score}/{c.weight}
                </span>
              </div>

              {/* Role vs Applicant */}
              <div className="mt-1.5 grid grid-cols-2 gap-x-3 text-[10.5px] leading-snug">
                <div>
                  <span className="font-semibold" style={{ color: '#1877c0' }}>Role: </span>
                  <span className="text-slate-500">{c.requirement}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Applicant: </span>
                  <span className="text-slate-500">{c.applicant}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-5 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <Sparkles className="h-2.5 w-2.5 shrink-0" />
          Scored by AI against role requirements · Re-screen candidate to refresh
        </p>
      </div>
    </div>,
    document.body,
  );
}
