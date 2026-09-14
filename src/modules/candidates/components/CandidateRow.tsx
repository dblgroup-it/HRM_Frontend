import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';

const ApplyHistoryModal = lazy(() =>
  import('./ApplyHistoryModal').then((m) => ({ default: m.ApplyHistoryModal })),
);
import { useNavigate } from 'react-router-dom';
import {
  BadgeDollarSign,
  CalendarClock,
  Check,
  ChevronDown,
  FileText,
  Flag,
  Mail,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserCheck,
  X,
  Send,
} from 'lucide-react';

import { Avatar, BusyOverlay } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
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
import { resolveApiFileUrl } from '@shared/api';

const ACCEPT = '.pdf,application/pdf';
const MAX_PDF_BYTES = 5 * 1024 * 1024;

const STAGE_META: Record<CandidateStage, { label: string; tone: string; dot: string }> = {
  applied: { label: 'Applied', tone: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  ai_shortlisted: { label: 'AI Shortlisted', tone: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  shortlisted: { label: 'Shortlisted', tone: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  interview: { label: 'Interview', tone: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  final: { label: 'Final', tone: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  selected: { label: 'Selected', tone: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', tone: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
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

/**
 * Two-line row: identity + status on line 1, a centered row of labeled
 * action buttons on line 2 — always visible, icon + text, no hover reveal,
 * no menu, no drawer.
 */
export function CandidateRow({
  candidate,
  reqId,
  canManage,
  selected = false,
  isSelectMode = false,
  onSelect,
  onEmail,
  onInterviews,
  onSendForInterview,
  onSalaryFixation,
}: {
  candidate: Candidate;
  reqId: string;
  canManage: boolean;
  selected?: boolean;
  isSelectMode?: boolean;
  onSelect?: (c: Candidate, checked: boolean) => void;
  onEmail: (c: Candidate) => void;
  onInterviews: (c: Candidate) => void;
  onSendForInterview: (c: Candidate) => void;
  onSalaryFixation: (c: Candidate) => void;
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
  const isNew = !seenLocally;

  return (
    <div
      ref={rowRef}
      className={cn(
        'group/row relative flex flex-col gap-2 px-4 py-3 transition-colors duration-150 hover:bg-slate-50/60',
        selected && 'bg-brand-50/50',
        candidate.isRedFlagged && 'bg-rose-50/60 hover:bg-rose-50/80 border-l-[3px] border-rose-500 pl-[13px]',
      )}
    >
      {/* Line 1 — identity + status */}
      <div className="flex flex-wrap items-center gap-3">
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
                <span className="text-[0.625rem] font-bold tabular-nums" style={{ color: cfg.text }}>{s}%</span>
                {candidate.matchDetails && (
                  <span className="text-[0.5625rem] font-medium" style={{ color: cfg.text, opacity: 0.6 }}>{cfg.label}</span>
                )}
              </button>
            );
          })()}
          <span className="hidden shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-slate-400 sm:inline">
            {SOURCE_LABEL[candidate.source] ?? candidate.source}
          </span>
          {candidate.applyCount > 1 && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[0.625rem] font-semibold text-amber-600 transition-colors hover:bg-amber-100"
              title="View full application history"
            >
              Applied {candidate.applyCount}×
            </button>
          )}
          {candidate.isRedFlagged && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-rose-700">
              <Flag className="h-2.5 w-2.5" fill="currentColor" />
              Red flag
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-400">
          {contact || 'No contact details'}
          {candidate.proposedSalary != null ? (
            <span
              className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[0.625rem] font-semibold text-brand-700 border border-brand-100"
              title={candidate.salaryJobGrade ? `Job Grade ${candidate.salaryJobGrade}` : undefined}
            >
              <BadgeDollarSign className="h-2.5 w-2.5" />
              ৳ {candidate.proposedSalary.toLocaleString()} fixed
              {candidate.salaryJobGrade ? ` · ${candidate.salaryJobGrade}` : ''}
            </span>
          ) : (
            candidate.salaryExpectation != null && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.625rem] font-semibold text-emerald-700 border border-emerald-100">
                ৳ {candidate.salaryExpectation.toLocaleString()} expected
              </span>
            )
          )}
        </p>
        {candidate.isRedFlagged && candidate.redFlagReason && (
          <div className="mt-1.5 max-w-xs rounded-r-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-1.5">
            <p className="text-xs leading-snug text-amber-800">{candidate.redFlagReason}</p>
          </div>
        )}
        {/* Who turned this candidate down and why. A rejection at the first
            interview is a factory interviewer's call; one at CV stage is
            Head of Talent Acquisition's — the row has to say which, or "Rejected" is a dead
            end for whoever picks the pipeline up next. */}
        {candidate.stage === 'rejected' && candidate.rejectedAt && (
          <div className="mt-1.5 max-w-md rounded-r-lg border-l-4 border-rose-400 bg-rose-50 px-3 py-1.5">
            <p className="text-xs font-semibold leading-snug text-rose-800">
              Rejected
              {candidate.rejectionStage === 'first_interview'
                ? ' at the first interview'
                : ''}
              {candidate.rejectedByName ? ` by ${candidate.rejectedByName}` : ''}
              <span className="font-normal text-rose-500">
                {' '}· {formatDate(candidate.rejectedAt)}
              </span>
            </p>
            {candidate.rejectionReason && (
              <p className="mt-0.5 text-xs leading-snug text-rose-700/90">
                {candidate.rejectionReason}
              </p>
            )}
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
                className="mt-0.5 text-[0.6875rem] font-medium text-violet-700 hover:underline"
              >
                {showFullSummary ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <StageMenu
          value={candidate.stage}
          canManage={canManage}
          pending={update.isPending}
          onChange={(next) => update.mutate({ id: candidate.id, input: { stage: next } })}
        />
        {candidate.onboardingStatus === 'onboarded' && (
          <span
            title="Onboarding complete — hired and handed off to IT"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[0.6875rem] font-semibold text-white shadow-sm shadow-emerald-600/25"
          >
            <Check className="h-3 w-3" strokeWidth={3} /> Completed
          </span>
        )}
      </div>
      </div>

      {/* Line 2 — actions, always visible, icon + label, centered */}
      {canManage && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {candidate.cvUrl ? (
            <ActionBtn as="a" href={resolveApiFileUrl(candidate.cvUrl)} target="_blank" rel="noreferrer" title="View CV">
              <FileText className="h-3.5 w-3.5" /> CV
            </ActionBtn>
          ) : (
            <ActionBtn title="Upload CV" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              <Upload className="h-3.5 w-3.5" /> {upload.isPending ? 'Uploading…' : 'Upload CV'}
            </ActionBtn>
          )}

          {candidate.cvUrl && (
            <ActionBtn
              title={candidate.matchScore !== null ? 'Re-screen CV with AI' : 'Screen CV with AI'}
              onClick={() => screen.mutate(candidate.id)}
              disabled={screen.isPending}
              hoverColor="violet"
            >
              <Sparkles className={cn('h-3.5 w-3.5', screen.isPending && 'animate-pulse')} />
              {candidate.matchScore !== null ? 'Re-scan' : 'AI scan'}
            </ActionBtn>
          )}

          <ActionBtn
            title={candidate.email ? `Email ${candidate.email}` : 'No email on file'}
            onClick={() => onEmail(candidate)}
            disabled={!candidate.email}
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </ActionBtn>

          <ActionBtn title="Schedule / view interviews" onClick={() => onInterviews(candidate)}>
            <CalendarClock className="h-3.5 w-3.5" /> Interviews
          </ActionBtn>

          {/* Optional hand-off: Head of Talent Acquisition / the recruiter can pass a
              shortlisted CV to a factory or named people who then run the
              first interview. Shortlisted only — nothing earlier or later. */}
          {candidate.stage === 'shortlisted' && (
            <ActionBtn
              title="Send this CV to a factory or named interviewers"
              onClick={() => onSendForInterview(candidate)}
            >
              <Send className="h-3.5 w-3.5" /> Send for Interview
            </ActionBtn>
          )}

          {['interview', 'final', 'selected'].includes(candidate.stage) && (
            <ActionBtn title="Salary fixation" onClick={() => onSalaryFixation(candidate)}>
              <BadgeDollarSign className="h-3.5 w-3.5" /> Salary
            </ActionBtn>
          )}

          {candidate.stage === 'selected' && (
            <ActionBtn title="Documents, offer & onboarding" onClick={() => navigate(ROUTES.onboardingManage(candidate.id))} hoverColor="emerald">
              <UserCheck className="h-3.5 w-3.5" /> Onboard
            </ActionBtn>
          )}

          <ActionBtn
            title={candidate.talentPool ? 'Remove from Talent Bank' : 'Add to Talent Bank'}
            onClick={() => update.mutate({ id: candidate.id, input: { talentPool: !candidate.talentPool } })}
            hoverColor="amber"
            active={candidate.talentPool}
          >
            <Star className="h-3.5 w-3.5" fill={candidate.talentPool ? 'currentColor' : 'none'} />
            {candidate.talentPool ? 'In Talent Bank' : 'Talent Bank'}
          </ActionBtn>

          <ActionBtn
            title={candidate.isRedFlagged ? `Red-flagged: ${candidate.redFlagReason ?? ''}` : 'Mark as red flag'}
            onClick={() => candidate.isRedFlagged ? unflag.mutate(candidate.id) : setFlagModalOpen(true)}
            disabled={flag.isPending || unflag.isPending}
            hoverColor="rose"
            active={candidate.isRedFlagged}
          >
            <Flag className="h-3.5 w-3.5" fill={candidate.isRedFlagged ? 'currentColor' : 'none'} />
            {candidate.isRedFlagged ? 'Flagged' : 'Red-flag'}
          </ActionBtn>

          <ActionBtn
            title="Remove candidate"
            onClick={() => {
              if (window.confirm(`Remove ${candidate.name} from this pipeline?`)) {
                remove.mutate(candidate.id);
              }
            }}
            hoverColor="rose"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </ActionBtn>
        </div>
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

      <MatchPopover
        open={matchOpen}
        anchor={matchAnchor}
        onClose={() => setMatchOpen(false)}
        candidateName={candidate.name}
        matchScore={candidate.matchScore ?? 0}
        matchSummary={candidate.matchSummary}
        criteria={candidate.matchDetails ?? []}
      />
    </div>
  );
}

/** Small animated icon+label button shared by the always-visible action row. */
function ActionBtn({
  children,
  title,
  onClick,
  disabled,
  active,
  hoverColor = 'brand',
  as,
  href,
  target,
  rel,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  hoverColor?: 'brand' | 'violet' | 'amber' | 'rose' | 'emerald';
  as?: 'a';
  href?: string;
  target?: string;
  rel?: string;
}) {
  const hoverClass: Record<string, string> = {
    brand: 'hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
    violet: 'hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700',
    amber: 'hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700',
    rose: 'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
    emerald: 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
  };
  const activeClass: Record<string, string> = {
    brand: 'border-brand-200 bg-brand-50 text-brand-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };
  const cls = cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600',
    'transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-95',
    'disabled:pointer-events-none disabled:opacity-40',
    active ? activeClass[hoverColor] : hoverClass[hoverColor],
  );
  if (as === 'a') {
    return (
      <a href={href} target={target} rel={rel} title={title} className={cls} onClick={(e) => e.stopPropagation()}>
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      disabled={disabled}
      className={cls}
    >
      {children}
    </button>
  );
}

/** Custom animated status dropdown — a colored pill trigger + a smoothly
 * animated floating menu of stage dots, always visible (status is a scan
 * signal, not a hidden action). */
function StageMenu({
  value,
  canManage,
  pending,
  onChange,
}: {
  value: CandidateStage;
  canManage: boolean;
  pending: boolean;
  onChange: (next: CandidateStage) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const meta = STAGE_META[value];

  useEffect(() => {
    if (!open || !btnRef.current) {
      setReady(false);
      return;
    }
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W = 190;
    const GAP = 6;
    const left = Math.min(Math.max(8, rect.right - W), vw - W - 8);
    const spaceBelow = vh - rect.bottom - GAP;
    const flip = spaceBelow < 280 && rect.top > spaceBelow;
    const s: React.CSSProperties = { position: 'fixed', left, width: W, zIndex: 9999 };
    if (flip) { s.bottom = vh - rect.top + GAP; s.top = 'auto'; }
    else { s.top = rect.bottom + GAP; s.bottom = 'auto'; }
    setStyle(s);
    const t = setTimeout(() => setReady(true), 10);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!canManage) {
    return (
      <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', meta.tone)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
        {meta.label}
      </span>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
          'transition-all duration-150 ease-out hover:shadow-sm hover:brightness-95 active:scale-95 disabled:opacity-50',
          meta.tone,
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
        {meta.label}
        <ChevronDown className={cn('h-3 w-3 opacity-60 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              ...style,
              opacity: ready ? 1 : 0,
              transform: ready ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(-4px)',
              transition: 'opacity 0.14s cubic-bezier(0.16,1,0.3,1), transform 0.14s cubic-bezier(0.16,1,0.3,1)',
            }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18),0_2px_8px_-2px_rgba(0,0,0,0.06)]"
          >
            {STAGE_ORDER.map((s) => {
              const m = STAGE_META[s];
              const disabled = s === 'ai_shortlisted';
              const isCurrent = s === value;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange(s); setOpen(false); }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[0.8125rem] transition-colors',
                    'hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40',
                    isCurrent ? 'font-semibold text-slate-800' : 'text-slate-600',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', m.dot)} />
                  {m.label}
                  {disabled && <span className="text-[0.625rem] text-slate-400">(AI only)</span>}
                  {isCurrent && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-brand-600" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
