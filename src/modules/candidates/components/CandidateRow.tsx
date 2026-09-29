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
  MailX,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserCheck,
  X,
  Send,
  AlertTriangle,
  AtSign,
  Handshake,
  History,
  MoreHorizontal,
  Phone,
} from 'lucide-react';

import { Avatar, BusyOverlay } from '@shared/components/ui';
import { GenderBadge } from './GenderBadge';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { ROUTES } from '@app/router/paths';
// By path, not the barrel: the requisition barrel already imports this module.
import { cvSourceDisplay } from '@modules/requisition/cvSourceMeta';

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
import { GeneratedCvModal } from './GeneratedCvModal';
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

const SOURCE_LABEL: Record<string, string> = {
  application: 'Applied online',
  bdjobs: 'BDJobs',
  drive: 'Drive link',
  upload: 'Uploaded',
  manual: 'Added manually',
  email: 'Email',
};

/**
 * One candidate, as a card: who they are, where they came from and what needs
 * attention on the left; the AI match and the stage on the right; the
 * everyday actions in a quiet bar underneath, with the rare and destructive
 * ones (Talent Bank, red flag, remove) under More.
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
  onRegret,
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
  /** Send DBL's regret letter — offered on rejected candidates only. */
  onRegret?: (c: Candidate) => void;
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
  const [cvOpen, setCvOpen] = useState(false);
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

  const stage = STAGE_META[candidate.stage];
  const src = cvSourceDisplay(candidate.cvSource);
  const SrcIcon = src?.icon;
  const hold = candidate.firstInterviewHold;

  return (
    <div
      ref={rowRef}
      className={cn(
        'group/row relative overflow-hidden rounded-2xl border bg-white transition-all duration-200 motion-safe:animate-card-in',
        'hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.15)] motion-safe:hover:-translate-y-px',
        selected
          ? 'border-brand-300 ring-2 ring-brand-400/25'
          : candidate.isRedFlagged
            ? 'border-rose-200 bg-rose-50/30'
            : 'border-slate-200 hover:border-slate-300',
      )}
    >
      {/* The stage, as a colour down the edge — scannable across a long list. */}
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', candidate.isRedFlagged ? 'bg-rose-500' : stage.dot)} />

      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-3 px-4 pb-3 pt-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        {/* ── Who: select + avatar ── */}
        <div className="flex items-start gap-2.5 pt-0.5">
          {canManage && onSelect && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(candidate, !selected); }}
              title={selected ? 'Deselect' : 'Select'}
              className={cn(
                'relative mt-2.5 h-[18px] w-[18px] shrink-0 rounded-[5px] border-2 transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
                selected
                  ? 'scale-100 border-brand-600 opacity-100'
                  : isSelectMode
                    ? 'scale-100 border-slate-300 bg-white opacity-100 hover:border-brand-400'
                    : 'scale-75 border-slate-300 bg-white opacity-0 group-hover/row:scale-100 group-hover/row:opacity-100 group-hover/row:border-brand-400',
              )}
              style={selected ? { background: 'linear-gradient(135deg, #1877c0 0%, #1055a0 100%)', boxShadow: '0 1px 4px rgba(24,119,192,0.35)' } : undefined}
            >
              <svg viewBox="0 0 10 8" className="absolute inset-0 m-auto h-[10px] w-[10px]" fill="none">
                <polyline
                  points="1,4 3.5,6.5 9,1"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="14"
                  style={{ strokeDashoffset: selected ? 0 : 14, transition: 'stroke-dashoffset 0.22s cubic-bezier(0.65,0,0.35,1) 0.04s' }}
                />
              </svg>
            </button>
          )}
          <span className="relative">
            <span className={cn('block rounded-full p-[2px] ring-2', stageRing[candidate.stage])}>
              <Avatar name={candidate.name} size="md" />
            </span>
            {isNew && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3" title="Not yet viewed">
                <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
              </span>
            )}
          </span>
        </div>

        {/* ── What: identity, provenance, anything that needs attention ── */}
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="truncate text-[0.9375rem] font-semibold tracking-tight text-slate-900">
              {candidate.name}
            </h4>
            <GenderBadge gender={candidate.gender} />
            {candidate.applyCount > 1 && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                title="Where else this person applied"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.625rem] font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
              >
                <History className="h-2.5 w-2.5" />
                Applied {candidate.applyCount}×
              </button>
            )}
            {candidate.isRedFlagged && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-white">
                <Flag className="h-2.5 w-2.5" fill="currentColor" /> Red flag
              </span>
            )}
            {candidate.talentPool && (
              <span title="In the Talent Bank" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-[0.625rem] font-semibold text-yellow-700 ring-1 ring-yellow-200">
                <Star className="h-2.5 w-2.5" fill="currentColor" /> Talent Bank
              </span>
            )}
          </div>

          <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
            {candidate.phone && (
              <span className="inline-flex items-center gap-1 tabular-nums"><Phone className="h-3 w-3 text-slate-400" />{candidate.phone}</span>
            )}
            {candidate.email && (
              <span className="inline-flex min-w-0 items-center gap-1"><AtSign className="h-3 w-3 shrink-0 text-slate-400" /><span className="truncate">{candidate.email}</span></span>
            )}
            {!contact && <span className="text-slate-400">No contact details yet</span>}
            {candidate.proposedSalary != null ? (
              <span className="inline-flex items-center gap-1 font-semibold text-brand-700" title={candidate.salaryJobGrade ? `Job Grade ${candidate.salaryJobGrade}` : undefined}>
                <BadgeDollarSign className="h-3 w-3" />
                ৳ {candidate.proposedSalary.toLocaleString()} fixed{candidate.salaryJobGrade ? ` · ${candidate.salaryJobGrade}` : ''}
              </span>
            ) : candidate.salaryExpectation != null ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <BadgeDollarSign className="h-3 w-3" />৳ {candidate.salaryExpectation.toLocaleString()} expected
              </span>
            ) : null}
          </p>

          {/* Provenance — where they came from, and who put them forward. */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {src && SrcIcon && !candidate.referral && (
              <Chip className={src.tone} title={`Source: ${src.label}`}><SrcIcon className="h-3 w-3" />{src.label}</Chip>
            )}
            {candidate.referral && (
              <Chip
                className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                title={[candidate.referral.employeeCode, candidate.referral.name, candidate.referral.designation].filter(Boolean).join(' – ')}
              >
                <Handshake className="h-3 w-3" />Referred by {candidate.referral.name}
                <span className="font-normal opacity-70">· {candidate.referral.employeeCode}</span>
              </Chip>
            )}
            {candidate.addedBy && (
              <Chip className="border-teal-200 bg-teal-50 text-teal-700" title="Sent in from the job posting">
                <Send className="h-3 w-3" />
                {candidate.addedBy.role === 'factory_hr_head' ? 'Factory HR Head' : 'Factory HR'}
                {candidate.addedBy.name ? ` · ${candidate.addedBy.name}` : ''}
              </Chip>
            )}
            <Chip className="border-slate-200 bg-slate-50 text-slate-500">{SOURCE_LABEL[candidate.source] ?? candidate.source}</Chip>
          </div>

          {/* What needs attention — one callout each, in the order it matters. */}
          {hold && (
            <Callout tone="sky" icon={<span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60 motion-safe:animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" /></span>}>
              {hold.awaitingApproval
                ? 'Put through at the first interview — waiting on the Factory HR Head'
                : `Sent for the first interview · ${hold.delegates.map((d) => d.name).join(', ') || 'factory'}`}
            </Callout>
          )}
          {candidate.isRedFlagged && candidate.redFlagReason && (
            <Callout tone="amber" icon={<Flag className="h-3.5 w-3.5" />}>{candidate.redFlagReason}</Callout>
          )}
          {candidate.stage === 'rejected' && candidate.rejectedAt && (
            <Callout tone="rose" icon={<X className="h-3.5 w-3.5" />}>
              <span className="font-semibold">
                Rejected
                {candidate.rejectionStage === 'first_interview'
                  ? ' at the first interview'
                  : candidate.rejectionStage === 'factory_hr_head'
                    ? ' by the Factory HR Head'
                    : ''}
                {candidate.rejectedByName ? ` by ${candidate.rejectedByName}` : ''}
              </span>
              <span className="opacity-70"> · {formatDate(candidate.rejectedAt)}</span>
              {candidate.rejectionReason && <span className="block opacity-90">{candidate.rejectionReason}</span>}
            </Callout>
          )}
          {candidate.regretSentAt && (
            <Callout tone="emerald" icon={<MailX className="h-3.5 w-3.5" />}>
              Regret mail sent{candidate.regretSentByName ? ` by ${candidate.regretSentByName}` : ''} · {formatDate(candidate.regretSentAt)}
            </Callout>
          )}

          {candidate.matchSummary && (
            <div className="mt-2 rounded-xl bg-gradient-to-r from-violet-50/80 to-transparent px-3 py-2">
              <p className={cn('text-xs leading-relaxed text-slate-600', !showFullSummary && 'line-clamp-2')}>
                <Sparkles className="mr-1 inline h-3 w-3 align-[-1px] text-violet-500" />
                {candidate.matchSummary}
              </p>
              {candidate.matchSummary.length > 110 && (
                <button type="button" onClick={() => setShowFullSummary((v) => !v)} className="mt-0.5 text-[0.6875rem] font-medium text-violet-700 hover:underline">
                  {showFullSummary ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Where they stand: AI match + stage ── */}
        <div className="col-span-2 flex items-center gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start">
          {candidate.matchScore !== null && (
            <ScoreRing
              score={candidate.matchScore}
              clickable={Boolean(candidate.matchDetails)}
              title={candidate.matchDetails ? 'See the AI match breakdown' : candidate.matchSummary || 'AI match score'}
              onClick={(el) => { if (candidate.matchDetails) { setMatchAnchor(el); setMatchOpen(true); } }}
            />
          )}
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <StageMenu
              value={candidate.stage}
              canManage={canManage}
              pending={update.isPending}
              onChange={(next) => update.mutate({ id: candidate.id, input: { stage: next } })}
            />
            {/* A green "Completed" beside a red "Rejected" is a contradiction —
                an unwound hire says so instead. */}
            {candidate.onboardingStatus === 'onboarded' &&
              (candidate.stage === 'rejected' ? (
                <span title="Onboarding had completed before this candidate was rejected — the hire was unwound." className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[0.6875rem] font-semibold text-amber-700 ring-1 ring-amber-200">
                  <AlertTriangle className="h-3 w-3" /> Was onboarded
                </span>
              ) : (
                <span title="Onboarding complete — hired and handed off to IT" className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[0.6875rem] font-semibold text-white shadow-sm shadow-emerald-600/25">
                  <Check className="h-3 w-3" strokeWidth={3} /> Hired
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* ── Actions: the everyday ones in view, the rare ones under More ── */}
      {canManage && (
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 bg-slate-50/50 px-3 py-1.5">
          {candidate.cvUrl ? (
            <ActionBtn as="a" href={resolveApiFileUrl(candidate.cvUrl)} target="_blank" rel="noreferrer" title="View CV">
              <FileText className="h-3.5 w-3.5" /> CV
            </ActionBtn>
          ) : candidate.hasGeneratedCv ? (
            /* Applied through Bdjobs — fields, no document. */
            <ActionBtn title="View the CV built from this application" onClick={() => setCvOpen(true)}>
              <FileText className="h-3.5 w-3.5" /> CV
            </ActionBtn>
          ) : (
            <ActionBtn title="Upload CV" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              <Upload className="h-3.5 w-3.5" /> {upload.isPending ? 'Uploading…' : 'Upload CV'}
            </ActionBtn>
          )}
          {(candidate.cvUrl || candidate.hasGeneratedCv) && (
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
          <ActionBtn title={candidate.email ? `Email ${candidate.email}` : 'No email on file'} onClick={() => onEmail(candidate)} disabled={!candidate.email}>
            <Mail className="h-3.5 w-3.5" /> Email
          </ActionBtn>
          <ActionBtn title="Schedule / view interviews" onClick={() => onInterviews(candidate)}>
            <CalendarClock className="h-3.5 w-3.5" /> Interviews
          </ActionBtn>

          {/* Divider only when a stage step follows it. */}
          {(candidate.stage === 'shortlisted' ||
            ['interview', 'final', 'selected'].includes(candidate.stage) ||
            (candidate.stage === 'rejected' && onRegret && !candidate.regretSentAt)) && (
            <span aria-hidden className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />
          )}

          {/* The one step this stage is waiting on, set apart. */}
          {candidate.stage === 'shortlisted' &&
            (hold ? (
              <ActionBtn title="Sent for interview — send again or to someone else" onClick={() => onSendForInterview(candidate)} hoverColor="emerald" active>
                <Check className="h-3.5 w-3.5" /> Sent for interview
              </ActionBtn>
            ) : (
              <ActionBtn title="Send this CV to a factory or named interviewers" onClick={() => onSendForInterview(candidate)} primary>
                <Send className="h-3.5 w-3.5" /> Send for interview
              </ActionBtn>
            ))}
          {['interview', 'final', 'selected'].includes(candidate.stage) && (
            <ActionBtn title="Salary fixation" onClick={() => onSalaryFixation(candidate)} primary={candidate.stage === 'final'}>
              <BadgeDollarSign className="h-3.5 w-3.5" /> Salary
            </ActionBtn>
          )}
          {candidate.stage === 'selected' && (
            <ActionBtn title="Documents, offer & onboarding" onClick={() => navigate(ROUTES.onboardingManage(candidate.id))} primary>
              <UserCheck className="h-3.5 w-3.5" /> Onboard
            </ActionBtn>
          )}
          {candidate.stage === 'rejected' && onRegret && !candidate.regretSentAt && (
            <ActionBtn title={candidate.email ? 'Send DBL’s regret letter' : 'No email on file'} onClick={() => onRegret(candidate)} disabled={!candidate.email} hoverColor="rose">
              <MailX className="h-3.5 w-3.5" /> Regret mail
            </ActionBtn>
          )}

          <div className="ml-auto">
            <MoreMenu
              items={[
                {
                  key: 'talent',
                  icon: <Star className="h-4 w-4" fill={candidate.talentPool ? 'currentColor' : 'none'} />,
                  label: candidate.talentPool ? 'Remove from Talent Bank' : 'Add to Talent Bank',
                  onSelect: () => update.mutate({ id: candidate.id, input: { talentPool: !candidate.talentPool } }),
                },
                {
                  key: 'flag',
                  icon: <Flag className="h-4 w-4" fill={candidate.isRedFlagged ? 'currentColor' : 'none'} />,
                  label: candidate.isRedFlagged ? 'Remove red flag' : 'Red-flag candidate',
                  tone: 'rose',
                  disabled: flag.isPending || unflag.isPending,
                  onSelect: () => (candidate.isRedFlagged ? unflag.mutate(candidate.id) : setFlagModalOpen(true)),
                },
                {
                  key: 'remove',
                  icon: <Trash2 className="h-4 w-4" />,
                  label: 'Remove from pipeline',
                  tone: 'rose',
                  onSelect: () => {
                    if (window.confirm(`Remove ${candidate.name} from this pipeline?`)) remove.mutate(candidate.id);
                  },
                },
              ]}
            />
          </div>
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

      {/* Only mounted once opened — it fetches the document on mount, and a
          long candidate list must not fetch one CV per row. */}
      {cvOpen && (
        <GeneratedCvModal
          candidateId={candidate.id}
          candidateName={candidate.name}
          open={cvOpen}
          onClose={() => setCvOpen(false)}
        />
      )}

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

      {flagModalOpen && createPortal(
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
        </div>,
        document.body
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

/** The stage's colour as a ring round the avatar. */
const stageRing: Record<CandidateStage, string> = {
  applied: 'ring-slate-200',
  ai_shortlisted: 'ring-violet-300',
  shortlisted: 'ring-sky-300',
  interview: 'ring-amber-300',
  final: 'ring-indigo-300',
  selected: 'ring-emerald-400',
  rejected: 'ring-rose-300',
};

function Chip({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium', className)}>
      {children}
    </span>
  );
}

const CALLOUT_TONE = {
  sky: 'bg-sky-50 text-sky-800 ring-sky-100',
  amber: 'bg-amber-50 text-amber-800 ring-amber-100',
  rose: 'bg-rose-50 text-rose-800 ring-rose-100',
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
} as const;

/** One thing about this candidate that needs attention, said once. */
function Callout({ tone, icon, children }: { tone: keyof typeof CALLOUT_TONE; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn('mt-2 flex max-w-2xl items-start gap-2 rounded-xl px-3 py-1.5 text-xs leading-snug ring-1', CALLOUT_TONE[tone])}>
      <span className="mt-[3px] flex shrink-0 items-center">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * The AI match as a small ring gauge — a number with a sense of how full it
 * is, readable at a glance down a long list. It fills when it first appears.
 */
function ScoreRing({ score, clickable, title, onClick }: {
  score: number;
  clickable: boolean;
  title: string;
  onClick: (el: HTMLElement) => void;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(t);
  }, [score]);
  const tone = score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : '#94a3b8';
  const label = score >= 75 ? 'Strong' : score >= 55 ? 'Good' : 'Partial';
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(e.currentTarget); }}
      className={cn('group/ring flex items-center gap-2 rounded-xl px-1 py-0.5 text-left transition', clickable ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default')}
    >
      <span className="relative h-11 w-11">
        <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
          <circle cx="20" cy="20" r={r} fill="none" stroke="#eef2f7" strokeWidth="4" />
          <circle
            cx="20" cy="20" r={r} fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * shown) / 100}
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[0.6875rem] font-bold tabular-nums text-slate-800">{score}</span>
      </span>
      <span className="leading-tight">
        <span className="flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wider text-slate-400">
          <Sparkles className="h-2.5 w-2.5 text-violet-500" /> AI match
        </span>
        <span className="block text-xs font-semibold" style={{ color: tone }}>{label}</span>
      </span>
    </button>
  );
}

/** Rarely used or destructive actions, kept out of the everyday row. */
function MoreMenu({ items }: {
  items: { key: string; icon: React.ReactNode; label: string; tone?: 'rose'; disabled?: boolean; onSelect: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const W = 220;
    const below = window.innerHeight - rect.bottom;
    setStyle({
      position: 'fixed',
      left: Math.max(8, rect.right - W),
      width: W,
      zIndex: 9999,
      ...(below < 180 ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-800 hover:shadow-sm', open && 'bg-white text-slate-800 shadow-sm')}
      >
        <MoreHorizontal className="h-4 w-4" /> More
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={style}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] motion-safe:animate-loader-pop"
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => { setOpen(false); it.onSelect(); }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[0.8125rem] transition-colors disabled:opacity-40',
                it.tone === 'rose' ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50',
              )}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
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
  primary = false,
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
  /** The step this stage is waiting on — filled, so it reads first. */
  primary?: boolean;
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
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium',
    'transition-all duration-150 ease-out active:scale-95 disabled:pointer-events-none disabled:opacity-40',
    primary
      ? 'border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 hover:shadow-md'
      : active
        ? activeClass[hoverColor]
        : cn('border-transparent text-slate-600 hover:bg-white hover:shadow-sm', hoverClass[hoverColor]),
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
