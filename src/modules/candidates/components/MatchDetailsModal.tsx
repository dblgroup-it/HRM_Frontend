import { useEffect, useState } from 'react';
import { X, Sparkles, BrainCircuit } from 'lucide-react';
import type { MatchCriterion } from '../types/candidate.types';

interface Props {
  open: boolean;
  onClose: () => void;
  candidateName: string;
  matchScore: number;
  matchSummary: string;
  criteria: MatchCriterion[];
}

function scoreTone(score: number) {
  if (score >= 75) return { ring: '#10b981', bg: '#ecfdf5', label: 'Strong Match' };
  if (score >= 55) return { ring: '#f59e0b', bg: '#fffbeb', label: 'Good Match' };
  return { ring: '#6b7280', bg: '#f8fafc', label: 'Partial Match' };
}

function barColor(pct: number) {
  if (pct >= 80) return '#10b981';
  if (pct >= 55) return '#f59e0b';
  return '#94a3b8';
}

export function MatchDetailsModal({ open, onClose, candidateName, matchScore, matchSummary, criteria }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!open) { setAnimated(false); return; }
    const t = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const t = scoreTone(matchScore);
  const r = 32;
  const C = 2 * Math.PI * r;
  const offset = C * (1 - matchScore / 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div
        className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl"
        style={{ maxHeight: '90vh' }}
      >
        {/* Mobile drag handle */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" />

        {/* ── Header ── */}
        <div className="shrink-0 px-5 pt-4 pb-4 sm:px-6 sm:pt-5">
          <div className="flex items-start gap-4">
            {/* Score ring */}
            <div className="relative shrink-0">
              <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
                <circle cx="38" cy="38" r={r} fill="none" stroke={t.ring} strokeOpacity="0.12" strokeWidth="7" />
                <circle
                  cx="38" cy="38" r={r} fill="none"
                  stroke={t.ring} strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                  style={{ transition: 'stroke-dashoffset 0.85s cubic-bezier(0.34,1.56,0.64,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
                <span className="text-[18px] font-bold leading-none" style={{ color: t.ring }}>{matchScore}</span>
                <span className="text-[9px] font-medium text-slate-400 leading-tight">/ 100</span>
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 pt-0.5">
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: t.bg, color: t.ring }}
              >
                <Sparkles className="h-3 w-3" />
                {t.label}
              </span>
              <h2 className="mt-1.5 truncate text-[15px] font-bold text-slate-900">{candidateName}</h2>
              {matchSummary && (
                <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">{matchSummary}</p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Overall progress track */}
          <div className="mt-4">
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: animated ? `${matchScore}%` : '0%',
                  backgroundColor: t.ring,
                  transition: 'width 0.75s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-400">Overall match score</span>
              <span className="text-[10px] font-bold tabular-nums" style={{ color: t.ring }}>{matchScore}%</span>
            </div>
          </div>
        </div>

        {/* ── Section label ── */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-2 sm:px-6">
          <div className="flex items-center gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Criteria Breakdown</span>
          </div>
        </div>

        {/* ── Criteria cards ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-5">
          <div className="space-y-2 pb-4">
            {criteria.map((c, i) => {
              const pct = c.weight > 0 ? Math.round((c.score / c.weight) * 100) : 0;
              const color = barColor(pct);
              const delay = `${i * 70 + 120}ms`;
              return (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]"
                >
                  {/* Top: label + bar + score */}
                  <div className="flex items-center gap-3 px-4 pt-3 pb-2.5">
                    <span className="w-[36%] shrink-0 text-[12px] font-semibold text-slate-800 leading-tight">
                      {c.label}
                    </span>
                    <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: animated ? `${pct}%` : '0%',
                          backgroundColor: color,
                          transition: `width 0.65s cubic-bezier(0.34,1.56,0.64,1) ${delay}`,
                        }}
                      />
                    </div>
                    <span
                      className="w-[38px] shrink-0 text-right text-[11px] font-bold tabular-nums"
                      style={{ color }}
                    >
                      {c.score}/{c.weight}
                    </span>
                  </div>

                  {/* Bottom: role vs applicant */}
                  <div className="grid grid-cols-2 gap-px border-t border-slate-100">
                    <div className="bg-blue-50/40 px-4 py-2.5">
                      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#1877c0]/60">
                        Role Requirement
                      </p>
                      <p className="text-[11px] leading-snug text-slate-700">{c.requirement}</p>
                    </div>
                    <div className="bg-slate-50/70 px-4 py-2.5">
                      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        Applicant
                      </p>
                      <p className="text-[11px] leading-snug text-slate-600">{c.applicant}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 sm:px-6">
          <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Sparkles className="h-3 w-3" />
            Scored by AI against role requirements · Re-screen candidate to refresh scores
          </p>
        </div>
      </div>
    </div>
  );
}
