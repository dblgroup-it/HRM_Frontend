import { useEffect, useRef, useState, lazy, Suspense } from 'react';

const ApplyHistoryModal = lazy(() =>
  import('./ApplyHistoryModal').then((m) => ({ default: m.ApplyHistoryModal })),
);
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  FileQuestion,
  FileText,
  Flag,
  Mail,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';

import { Avatar, BusyOverlay } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { ROUTES } from '@app/router/paths';

import {
  useFlagCandidate,
  useMarkViewed,
  useRemoveCandidate,
  useScreenCandidate,
  useUnflagCandidate,
  useUpdateCandidate,
  useUploadCv,
} from '../hooks/useCandidates';
import type { Candidate, CandidateStage } from '../types/candidate.types';
import { MatchPopover } from './MatchPopover';

const ACCEPT = '.pdf,application/pdf';
const MAX_PDF_BYTES = 5 * 1024 * 1024;

const STAGE_META: Record<CandidateStage, { label: string; tone: string }> = {
  applied: { label: 'Applied', tone: 'bg-slate-100 text-slate-600' },
  ai_shortlisted: {
    label: 'AI Shortlisted',
    tone: 'bg-violet-100 text-violet-700',
  },
  shortlisted: { label: 'Shortlisted', tone: 'bg-sky-100 text-sky-700' },
  interview: { label: 'Interview', tone: 'bg-amber-100 text-amber-700' },
  final: { label: 'Final', tone: 'bg-indigo-100 text-indigo-700' },
  selected: { label: 'Selected', tone: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', tone: 'bg-rose-100 text-rose-700' },
};

const STAGE_ORDER: CandidateStage[] = [
  'applied',
  'ai_shortlisted',
  'shortlisted',
  'interview',
  'final',
  'selected',
  'rejected',
];

function matchChip(score: number) {
  if (score >= 75) return { fill: '#bbf7d0', empty: '#f0fdf4', text: '#065f46', border: '#6ee7b760', icon: '#10b981', label: 'Strong' };
  if (score >= 55) return { fill: '#fde68a', empty: '#fffbeb', text: '#78350f', border: '#fcd34d60', icon: '#f59e0b', label: 'Good' };
  return { fill: '#e2e8f0', empty: '#f8fafc', text: '#475569', border: '#cbd5e160', icon: '#94a3b8', label: 'Partial' };
}

const SOURCE_LABEL: Record<string, string> = {
  application: 'Applied online',
  bdjobs: 'BDJobs',
  drive: 'Drive link',
  upload: 'Uploaded',
  manual: 'Added manually',
  email: 'Email',
};

export function CandidateRow({
  candidate,
  reqId,
  canManage,
  selected = false,
  isSelectMode = false,
  onSelect,
  onEmail,
  onInterviews,
  onExams,
}: {
  candidate: Candidate;
  reqId: string;
  canManage: boolean;
  selected?: boolean;
  isSelectMode?: boolean;
  onSelect?: (c: Candidate, checked: boolean) => void;
  onEmail: (c: Candidate) => void;
  onInterviews: (c: Candidate) => void;
  onExams: (c: Candidate) => void;
}) {
  const update = useUpdateCandidate(reqId);
  const upload = useUploadCv(reqId);
  const remove = useRemoveCandidate(reqId);
  const screen = useScreenCandidate(reqId);
  const flag = useFlagCandidate(reqId);
  const unflag = useUnflagCandidate(reqId);
  const markViewed = useMarkViewed();
  const navigate = useNavigate();
  const rowRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchAnchor, setMatchAnchor] = useState<HTMLElement | null>(null);
  const [flagReason, setFlagReason] = useState('');
  // Optimistic: treat as viewed once the row enters viewport (even before server confirms).
  const [seenLocally, setSeenLocally] = useState(Boolean(candidate.viewedAt));

  // Fire mark-viewed once when the row enters viewport for the first time.
  useEffect(() => {
    if (seenLocally) return;
    const el = rowRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeenLocally(true);
          markViewed.mutate(candidate.id);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [candidate.id, seenLocally]); // eslint-disable-line react-hooks/exhaustive-deps

  const contact = [candidate.email, candidate.phone].filter(Boolean).join(' · ');
  const meta = STAGE_META[candidate.stage];
  const isNew = !seenLocally;

  return (
    <div
      ref={rowRef}
      className={cn(
        'group/row relative flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-slate-50/60',
        selected && 'bg-brand-50/50',
        candidate.isRedFlagged && 'bg-rose-50/60 hover:bg-rose-50/80 border-l-[3px] border-rose-500 pl-[13px]',
      )}
    >
      {/* Custom animated checkbox — shown on hover or when selection mode is active */}
      {canManage && onSelect && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(candidate, !selected); }}
          title={selected ? 'Deselect' : 'Select'}
          className={cn(
            'relative h-[18px] w-[18px] shrink-0 rounded-[4px] border-2 transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
            selected
              ? 'scale-100 opacity-100'
              : isSelectMode
                ? 'scale-100 opacity-100 border-slate-300 bg-white hover:border-brand-400'
                : 'scale-75 opacity-0 group-hover/row:scale-100 group-hover/row:opacity-100 group-hover/row:border-brand-400',
            selected
              ? 'border-brand-600'
              : 'border-slate-300 bg-white',
          )}
          style={selected ? {
            background: 'linear-gradient(135deg, #1877c0 0%, #1055a0 100%)',
            boxShadow: '0 1px 4px rgba(24,119,192,0.35)',
          } : undefined}
        >
          <svg viewBox="0 0 10 8" className="absolute inset-0 m-auto h-[10px] w-[10px]" fill="none">
            <polyline
              points="1,4 3.5,6.5 9,1"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="14"
              style={{
                strokeDashoffset: selected ? 0 : 14,
                transition: 'stroke-dashoffset 0.22s cubic-bezier(0.65,0,0.35,1) 0.04s',
              }}
            />
          </svg>
        </button>
      )}
      <Avatar name={candidate.name} size="sm" />

      <div className="min-w-[140px] flex-1">
        <div className="flex items-center gap-2">
          {isNew && (
            <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" title="Not yet viewed" />
          )}
          <p className="truncate text-sm font-medium text-slate-800">
            {candidate.name}
          </p>
          {candidate.matchScore !== null && (() => {
            const s = candidate.matchScore!;
            const cfg = matchChip(s);
            const fillPct = Math.max(s, 8); // minimum 8% so icon always visible
            return (
              <button
                type="button"
                title={candidate.matchDetails ? 'Click to view AI match breakdown' : (candidate.matchSummary || 'AI match score')}
                onClick={(e) => { e.stopPropagation(); if (candidate.matchDetails) { setMatchAnchor(e.currentTarget); setMatchOpen(true); } }}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-[3px] transition-all duration-150',
                  candidate.matchDetails ? 'cursor-pointer hover:brightness-[0.97] active:scale-[0.97]' : 'cursor-default',
                )}
                style={{
                  background: `linear-gradient(to right, ${cfg.fill} ${fillPct}%, ${cfg.empty} ${fillPct}%)`,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                <Sparkles className="h-2.5 w-2.5 shrink-0" style={{ color: cfg.icon }} />
                <span className="text-[10px] font-bold tabular-nums" style={{ color: cfg.text }}>{s}%</span>
                {candidate.matchDetails && (
                  <span className="text-[9px] font-medium" style={{ color: cfg.text, opacity: 0.6 }}>{cfg.label}</span>
                )}
              </button>
            );
          })()}
          <span className="hidden shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
            {SOURCE_LABEL[candidate.source] ?? candidate.source}
          </span>
          {candidate.applyCount > 1 && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 hover:bg-amber-100 transition"
              title="View full application history"
            >
              Applied {candidate.applyCount}×
            </button>
          )}
          {candidate.isRedFlagged && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
              <Flag className="h-2.5 w-2.5" fill="currentColor" />
              Red flag
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-400">
          {contact || 'No contact details'}
          {candidate.salaryExpectation != null && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
              ৳ {candidate.salaryExpectation.toLocaleString()} expected
            </span>
          )}
        </p>
        {candidate.isRedFlagged && candidate.redFlagReason && (
          <div className="mt-1.5 max-w-xs rounded-r-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-1.5">
            <p className="text-xs leading-snug text-amber-800">{candidate.redFlagReason}</p>
          </div>
        )}
        {candidate.matchSummary && (
          <div className="mt-1">
            <p
              className={cn(
                'text-xs italic leading-snug text-violet-600/90',
                !showFullSummary && 'line-clamp-2',
              )}
            >
              <Sparkles className="mr-1 inline h-3 w-3 align-[-1px]" />
              {candidate.matchSummary}
            </p>
            {candidate.matchSummary.length > 110 && (
              <button
                type="button"
                onClick={() => setShowFullSummary((v) => !v)}
                className="mt-0.5 text-[11px] font-medium text-violet-700 hover:underline"
              >
                {showFullSummary ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* CV */}
      {candidate.cvUrl ? (
        <a
          href={candidate.cvUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
        >
          <FileText className="h-3.5 w-3.5" /> CV
        </a>
      ) : canManage ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {upload.isPending ? 'Uploading…' : 'CV'}
        </button>
      ) : (
        <span className="text-xs text-slate-300">No CV</span>
      )}

      {/* AI screen / re-screen */}
      {canManage && candidate.cvUrl && (
        <button
          type="button"
          onClick={() => screen.mutate(candidate.id)}
          disabled={screen.isPending}
          title={
            candidate.matchScore !== null
              ? 'Re-screen CV with AI'
              : 'Screen CV with AI'
          }
          className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
        >
          <Sparkles className={cn('h-3.5 w-3.5', screen.isPending && 'animate-pulse')} />
          {candidate.matchScore !== null ? 'Re-scan' : 'AI scan'}
        </button>
      )}

      {/* Email */}
      {canManage && (
        <button
          type="button"
          onClick={() => onEmail(candidate)}
          disabled={!candidate.email}
          title={candidate.email ? `Email ${candidate.email}` : 'No email on file'}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Mail className="h-3.5 w-3.5" /> Email
        </button>
      )}

      {/* Interviews */}
      {canManage && (
        <button
          type="button"
          onClick={() => onInterviews(candidate)}
          title="Schedule / view interviews"
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          <CalendarClock className="h-3.5 w-3.5" /> Interviews
        </button>
      )}

      {/* Exams */}
      {canManage && (
        <button
          type="button"
          onClick={() => onExams(candidate)}
          title="Send / view online exams"
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          <FileQuestion className="h-3.5 w-3.5" /> Exam
        </button>
      )}

      {/* Onboarding — only meaningful once selected */}
      {canManage && candidate.stage === 'selected' && (
        <button
          type="button"
          onClick={() => navigate(ROUTES.onboardingManage(candidate.id))}
          title="Documents, offer & onboarding"
          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
        >
          <UserCheck className="h-3.5 w-3.5" /> Onboard
        </button>
      )}

      {/* Stage */}
      {canManage ? (
        <select
          value={candidate.stage}
          disabled={update.isPending}
          onChange={(e) =>
            update.mutate({
              id: candidate.id,
              input: { stage: e.target.value as CandidateStage },
            })
          }
          className={cn(
            'h-8 rounded-md border-0 px-2 text-xs font-medium focus:ring-2 focus:ring-brand-500/40',
            meta.tone,
          )}
        >
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s} disabled={s === 'ai_shortlisted'}>
              {STAGE_META[s].label}
              {s === 'ai_shortlisted' ? ' (AI only)' : ''}
            </option>
          ))}
        </select>
      ) : (
        <span
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium',
            meta.tone,
          )}
        >
          {meta.label}
        </span>
      )}

      {canManage && (
        <button
          type="button"
          title={
            candidate.talentPool ? 'Remove from Talent Bank' : 'Add to Talent Bank'
          }
          onClick={() =>
            update.mutate({
              id: candidate.id,
              input: { talentPool: !candidate.talentPool },
            })
          }
          className={cn(
            'rounded-md p-1.5 hover:bg-amber-50',
            candidate.talentPool
              ? 'text-amber-500'
              : 'text-slate-300 hover:text-amber-500',
          )}
        >
          <Star
            className="h-4 w-4"
            fill={candidate.talentPool ? 'currentColor' : 'none'}
          />
        </button>
      )}

      {canManage && (
        <button
          type="button"
          title={candidate.isRedFlagged ? `Red-flagged: ${candidate.redFlagReason ?? ''}` : 'Mark as red flag'}
          onClick={() => candidate.isRedFlagged ? unflag.mutate(candidate.id) : setFlagModalOpen(true)}
          disabled={flag.isPending || unflag.isPending}
          className={cn(
            'rounded-md p-1.5 transition-colors disabled:opacity-50',
            candidate.isRedFlagged
              ? 'text-rose-500 hover:bg-rose-50'
              : 'text-slate-300 hover:bg-rose-50 hover:text-rose-400',
          )}
        >
          <Flag className="h-4 w-4" fill={candidate.isRedFlagged ? 'currentColor' : 'none'} />
        </button>
      )}

      {canManage && (
        <button
          type="button"
          title="Remove candidate"
          onClick={() => remove.mutate(candidate.id)}
          className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            if (file.type !== 'application/pdf') { alert('Only PDF files are accepted.'); e.target.value = ''; return; }
            if (file.size > MAX_PDF_BYTES) { alert('File must be under 5 MB.'); e.target.value = ''; return; }
            upload.mutate({ id: candidate.id, cv: file });
          }
          e.target.value = '';
        }}
      />

      <BusyOverlay
        show={screen.isPending}
        variant="ai"
        label={`AI is analysing ${candidate.name}'s CV…`}
        sublabel="Scoring the match and pulling contact details from the CV."
      />
      <BusyOverlay
        show={update.isPending && update.variables?.input?.stage !== undefined}
        label={`Moving ${candidate.name} to ${STAGE_META[update.variables?.input?.stage ?? candidate.stage]?.label ?? ''}…`}
        sublabel="Shifting the CV to the matching Drive folder."
      />

      {candidate.matchDetails && (
        <MatchPopover
          open={matchOpen}
          anchor={matchAnchor}
          onClose={() => setMatchOpen(false)}
          candidateName={candidate.name}
          matchScore={candidate.matchScore ?? 0}
          matchSummary={candidate.matchSummary}
          criteria={candidate.matchDetails}
        />
      )}

      {historyOpen && (
        <Suspense fallback={null}>
          <ApplyHistoryModal
            candidateId={candidate.id}
            candidateName={candidate.name}
            onClose={() => setHistoryOpen(false)}
          />
        </Suspense>
      )}

      {flagModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setFlagModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-rose-700">
                  <Flag className="h-4 w-4" fill="currentColor" />
                  Red-flag {candidate.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Future applications from this email / phone will be auto-flagged. You can remove the flag later.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFlagModalOpen(false)}
                className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Why is this candidate being red-flagged? (min. 5 characters)"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{flagReason.length}/1000</p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFlagModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={flagReason.trim().length < 5 || flag.isPending}
                onClick={() => {
                  flag.mutate(
                    { id: candidate.id, reason: flagReason.trim() },
                    {
                      onSuccess: () => {
                        setFlagModalOpen(false);
                        setFlagReason('');
                      },
                    },
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <Flag className="h-3.5 w-3.5" />
                {flag.isPending ? 'Flagging…' : 'Red-flag candidate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
