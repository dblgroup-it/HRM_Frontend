import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  FileQuestion,
  FileText,
  Mail,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react';

import { Avatar, BusyOverlay } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { ROUTES } from '@app/router/paths';

import {
  useRemoveCandidate,
  useScreenCandidate,
  useUpdateCandidate,
  useUploadCv,
} from '../hooks/useCandidates';
import type { Candidate, CandidateStage } from '../types/candidate.types';

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg';

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

/** Colour a match score: strong / fair / weak. */
function matchTone(score: number): string {
  if (score >= 75) return 'bg-emerald-100 text-emerald-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-500';
}

const SOURCE_LABEL: Record<string, string> = {
  application: 'Applied online',
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
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showFullSummary, setShowFullSummary] = useState(false);

  const contact = [candidate.email, candidate.phone].filter(Boolean).join(' · ');
  const meta = STAGE_META[candidate.stage];

  return (
    <div
      className={cn(
        'group/row flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-slate-50/60',
        selected && 'bg-brand-50/50',
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
          <p className="truncate text-sm font-medium text-slate-800">
            {candidate.name}
          </p>
          {candidate.matchScore !== null && (
            <span
              title={candidate.matchSummary || 'AI match score'}
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                matchTone(candidate.matchScore),
              )}
            >
              <Sparkles className="h-2.5 w-2.5" />
              {candidate.matchScore}%
            </span>
          )}
          <span className="hidden shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
            {SOURCE_LABEL[candidate.source] ?? candidate.source}
          </span>
        </div>
        <p className="truncate text-xs text-slate-400">
          {contact || 'No contact details'}
        </p>
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
            candidate.talentPool ? 'Remove from talent pool' : 'Add to talent pool'
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
          if (file) upload.mutate({ id: candidate.id, cv: file });
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
    </div>
  );
}
