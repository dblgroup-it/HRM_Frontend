import {
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const ApplyHistoryModal = lazy(() =>
  import('./ApplyHistoryModal').then((m) => ({ default: m.ApplyHistoryModal })),
);
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  Check,
  ChevronDown,
  FileText,
  Flag,
  History,
  Loader2,
  Mail,
  MailX,
  Send,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';

import { Avatar, BusyOverlay } from '@shared/components/ui';
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
import { GenderBadge } from './GenderBadge';
import { MatchPopover } from './MatchPopover';
import { GeneratedCvModal } from './GeneratedCvModal';
import { resolveApiFileUrl } from '@shared/api';

const ACCEPT = '.pdf,application/pdf';
const MAX_PDF_BYTES = 5 * 1024 * 1024;

/**
 * `tone` is the read-only pill; `control` is the stage selector, which is the
 * most-used control on the card and is drawn to look like one — outlined in
 * the stage's colour, with its arrow in a well of its own.
 */
const STAGE_META: Record<CandidateStage, { label: string; tone: string; dot: string; control: string; well: string }> = {
  applied: { label: 'Applied', tone: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', control: 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400', well: 'border-slate-300 bg-slate-100' },
  ai_shortlisted: { label: 'AI Shortlisted', tone: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500', control: 'border-violet-300 bg-violet-50 text-violet-800 hover:border-violet-400', well: 'border-violet-200 bg-violet-100' },
  shortlisted: { label: 'Shortlisted', tone: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500', control: 'border-sky-300 bg-sky-50 text-sky-800 hover:border-sky-400', well: 'border-sky-200 bg-sky-100' },
  interview: { label: 'Interview', tone: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', control: 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400', well: 'border-amber-200 bg-amber-100' },
  final: { label: 'Final', tone: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', control: 'border-indigo-300 bg-indigo-50 text-indigo-800 hover:border-indigo-400', well: 'border-indigo-200 bg-indigo-100' },
  selected: { label: 'Selected', tone: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', control: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400', well: 'border-emerald-200 bg-emerald-100' },
  rejected: { label: 'Rejected', tone: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', control: 'border-rose-300 bg-rose-50 text-rose-800 hover:border-rose-400', well: 'border-rose-200 bg-rose-100' },
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

/** How the record reached the system — used only when no CV source was recorded. */
const SOURCE_LABEL: Record<string, string> = {
  application: 'Applied online',
  bdjobs: 'BDJobs',
  drive: 'Drive link',
  upload: 'Uploaded',
  manual: 'Added manually',
  email: 'Email',
};

/** "6 yrs", "4.5 yrs", "8 mos" — half-year steps; more is false precision. */
function yearsLabel(years: number): string {
  if (years < 1) return `${Math.max(1, Math.round(years * 12))} mos`;
  const r = Math.round(years * 2) / 2;
  return `${Number.isInteger(r) ? r : r.toFixed(1)} yrs`;
}

type Primary = 'send' | 'interviews' | 'salary' | 'onboard' | 'scan' | null;

/**
 * One candidate, as a card: who they are and what needs attention on the
 * left, the AI match and the stage on the right, and every action labelled
 * underneath — the step this stage is waiting on first, in blue; Red-flag and
 * Remove set apart at the far end.
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

  const isNew = !seenLocally;
  const hold = candidate.firstInterviewHold;
  const hasCv = Boolean(candidate.cvUrl || candidate.hasGeneratedCv);
  const src = cvSourceDisplay(candidate.cvSource);
  const headline = candidate.headline;

  /** The step this stage is waiting on — one, in blue. */
  const primary: Primary =
    candidate.stage === 'selected'
      ? 'onboard'
      : candidate.stage === 'final' && candidate.proposedSalary == null
        ? 'salary'
        : candidate.stage === 'interview'
          ? 'interviews'
          : candidate.stage === 'shortlisted' && !hold
            ? 'send'
            : (candidate.stage === 'applied' || candidate.stage === 'ai_shortlisted') &&
                hasCv &&
                candidate.matchScore === null
              ? 'scan'
              : null;
  const showSalary = ['interview', 'final', 'selected'].includes(candidate.stage);
  const openMatch = (el: HTMLElement) => {
    if (!candidate.matchDetails) return;
    setMatchAnchor(el);
    setMatchOpen(true);
  };

  const rejectedLine = (() => {
    if (candidate.stage !== 'rejected' || !candidate.rejectedAt) return null;
    const who = candidate.rejectedByName;
    const head =
      candidate.rejectionStage === 'factory_hr_head'
        ? `Rejected by the Factory HR Head${who ? ` (${who})` : ''}`
        : `Rejected${candidate.rejectionStage === 'first_interview' ? ' at the first interview' : ''}${who ? ` by ${who}` : ''}`;
    return `${head} · ${formatDate(candidate.rejectedAt)}`;
  })();

  const scanBtn = hasCv && (
    <ActionBtn
      key="scan"
      icon={Sparkles}
      motion="spin"
      tone={primary === 'scan' ? 'primary' : 'violet'}
      busy={screen.isPending}
      title={candidate.matchScore !== null ? 'Re-screen the CV with AI' : 'Screen the CV with AI'}
      onClick={() => screen.mutate(candidate.id)}
    >
      {candidate.matchScore !== null ? 'Re-scan' : 'AI scan'}
    </ActionBtn>
  );
  const interviewsBtn = (
    <ActionBtn
      key="interviews"
      icon={CalendarClock}
      motion="pop"
      tone={primary === 'interviews' ? 'primary' : 'neutral'}
      title="Schedule or view interviews"
      onClick={() => onInterviews(candidate)}
    >
      Interviews
    </ActionBtn>
  );
  const salaryBtn = showSalary && (
    <ActionBtn
      key="salary"
      icon={BadgeDollarSign}
      motion="pop"
      tone={primary === 'salary' ? 'primary' : 'neutral'}
      title="Salary fixation"
      onClick={() => onSalaryFixation(candidate)}
    >
      Salary
    </ActionBtn>
  );

  return (
    <div
      ref={rowRef}
      className={cn(
        'group/row relative rounded-2xl border bg-white p-4 transition-[border-color,box-shadow,background-color] duration-200',
        'hover:shadow-[0_6px_22px_-12px_rgba(15,23,42,0.28)]',
        selected
          ? 'border-brand-300 bg-brand-50/30 ring-2 ring-brand-400/20'
          : candidate.isRedFlagged
            ? 'border-rose-200 bg-rose-50/30 hover:border-rose-300'
            : 'border-slate-200 hover:border-slate-300',
      )}
    >
      <div className="grid grid-cols-[24px_40px_minmax(0,1fr)] gap-x-3.5 gap-y-3 sm:grid-cols-[24px_40px_minmax(0,1fr)_auto]">
        {/* ── Select ── */}
        <div className="col-start-1 row-start-1 pt-2">
          {canManage && onSelect && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(candidate, !selected); }}
              title={selected ? 'Deselect' : 'Select'}
              aria-pressed={selected}
              className="group/sel flex h-6 w-6 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
            >
              <span
                className={cn(
                  'relative h-4 w-4 rounded-[5px] border-[1.5px] transition-all duration-200',
                  selected
                    ? 'scale-100 border-brand-600'
                    : isSelectMode
                      ? 'border-slate-400 bg-white group-hover/sel:border-brand-500'
                      : 'border-slate-300 bg-white group-hover/sel:border-brand-400',
                )}
                style={
                  selected
                    ? { background: 'linear-gradient(135deg, #1877c0 0%, #1055a0 100%)', boxShadow: '0 1px 4px rgba(24,119,192,0.35)' }
                    : undefined
                }
              >
                <svg viewBox="0 0 10 8" className="absolute inset-0 m-auto h-[9px] w-[9px]" fill="none">
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
              </span>
            </button>
          )}
        </div>

        {/* ── Avatar ── */}
        <div className="relative col-start-2 row-start-1">
          <Avatar name={candidate.name} size="md" />
          {isNew && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3" title="Not yet viewed">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
            </span>
          )}
        </div>

        {/* ── Who they are, and what needs attention ── */}
        <div className="col-start-3 row-start-1 grid min-w-0 content-start gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="truncate text-[0.9375rem] font-semibold tracking-tight text-slate-900">
              {candidate.name}
            </h4>
            <GenderBadge gender={candidate.gender} />
            {candidate.applyCount > 1 && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                title="Where else this person applied"
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[0.6875rem] font-medium leading-none text-amber-700 transition hover:bg-amber-100"
              >
                <History className="h-3 w-3" />
                Applied {candidate.applyCount}×
              </button>
            )}
            {candidate.isRedFlagged && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none text-rose-700">
                <Flag className="h-3 w-3" fill="currentColor" /> Red flag
              </span>
            )}
          </div>

          {headline && (headline.title || headline.company || headline.years) && (
            <p className="truncate text-[0.8125rem] text-slate-700">
              {headline.title && <span className="font-semibold text-slate-800">{headline.title}</span>}
              {[headline.company, headline.years ? yearsLabel(headline.years) : null]
                .filter(Boolean)
                .map((part, i) => (
                  <span key={i}>
                    {headline.title || i > 0 ? ' · ' : ''}
                    {part}
                  </span>
                ))}
            </p>
          )}

          <p className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-0.5 text-[0.8125rem] text-slate-500">
            {candidate.referral ? (
              <span
                className="whitespace-nowrap"
                title={[candidate.referral.employeeCode, candidate.referral.name, candidate.referral.designation].filter(Boolean).join(' – ')}
              >
                <span className="font-medium text-slate-700">Referred by {candidate.referral.name}</span>{' '}
                ({candidate.referral.employeeCode})
              </span>
            ) : (
              <span className="whitespace-nowrap font-medium text-slate-700">
                {src?.label ?? SOURCE_LABEL[candidate.source] ?? candidate.source}
              </span>
            )}
            {candidate.addedBy && (
              <span className="whitespace-nowrap">
                Sent by {candidate.addedBy.role === 'factory_hr_head' ? 'Factory HR Head' : 'Factory HR'}
                {candidate.addedBy.name ? ` · ${candidate.addedBy.name}` : ''}
              </span>
            )}
            {candidate.email && <span className="min-w-0 truncate">{candidate.email}</span>}
            {candidate.phone && <span className="whitespace-nowrap tabular-nums">{candidate.phone}</span>}
            {!candidate.email && !candidate.phone && <span>No contact details yet</span>}
            {candidate.proposedSalary != null ? (
              <span
                className="whitespace-nowrap font-medium text-brand-700"
                title={candidate.salaryJobGrade ? `Job grade ${candidate.salaryJobGrade}` : undefined}
              >
                ৳ {candidate.proposedSalary.toLocaleString()} fixed
                {candidate.salaryJobGrade ? ` · ${candidate.salaryJobGrade}` : ''}
              </span>
            ) : candidate.salaryExpectation != null ? (
              <span className="whitespace-nowrap">৳ {candidate.salaryExpectation.toLocaleString()} expected</span>
            ) : null}
          </p>

          {/* What needs attention — said once each, tinted, no stripes. */}
          {(hold || rejectedLine || (candidate.isRedFlagged && candidate.redFlagReason) || candidate.regretSentAt) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {hold && (
                <Status tone="sky" pulse>
                  {hold.awaitingApproval
                    ? 'Put through at the first interview — waiting on the Factory HR Head'
                    : `Sent for the first interview · ${hold.delegates.map((d) => d.name).join(', ') || 'factory'}`}
                </Status>
              )}
              {candidate.isRedFlagged && candidate.redFlagReason && (
                <Status tone="rose">Red-flagged: {candidate.redFlagReason}</Status>
              )}
              {rejectedLine && (
                <Status tone="rose">
                  {rejectedLine}
                  {candidate.rejectionReason && <> · “{candidate.rejectionReason}”</>}
                </Status>
              )}
              {candidate.regretSentAt && (
                <Status tone="emerald">
                  Regret mail sent{candidate.regretSentByName ? ` by ${candidate.regretSentByName}` : ''} · {formatDate(candidate.regretSentAt)}
                </Status>
              )}
            </div>
          )}

          {candidate.matchSummary && (
            <div className="mt-0.5 flex min-w-0 items-start gap-1.5 text-[0.8125rem] text-slate-600">
              <Sparkles className="mt-[3px] h-3.5 w-3.5 shrink-0 text-violet-500" />
              <button
                type="button"
                onClick={() => setShowFullSummary((v) => !v)}
                title={showFullSummary ? 'Show less' : 'Show the whole summary'}
                className={cn(
                  'block min-w-0 flex-1 text-left transition-colors hover:text-slate-800',
                  showFullSummary ? 'whitespace-normal' : 'truncate',
                )}
              >
                {candidate.matchSummary}
              </button>
              {candidate.matchDetails && candidate.matchScore !== null && (
                <button
                  type="button"
                  onClick={(e) => openMatch(e.currentTarget)}
                  className="shrink-0 font-medium text-brand-700 hover:underline"
                >
                  Why {candidate.matchScore}?
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Where they stand ── */}
        <div className="col-start-3 row-start-2 flex flex-wrap items-center gap-3 sm:col-start-4 sm:row-start-1 sm:grid sm:content-start sm:justify-items-end sm:gap-2.5">
          {candidate.matchScore !== null && (
            <MatchScore
              score={candidate.matchScore}
              clickable={Boolean(candidate.matchDetails)}
              title={candidate.matchDetails ? 'See the AI match breakdown' : candidate.matchSummary || 'AI match score'}
              onOpen={openMatch}
            />
          )}
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <StageMenu
              value={candidate.stage}
              canManage={canManage}
              pending={update.isPending}
              onChange={(next) => update.mutate({ id: candidate.id, input: { stage: next } })}
            />
            {/* A green tick beside "Rejected" would contradict itself; an
                unwound hire says so instead. */}
            {candidate.onboardingStatus === 'onboarded' &&
              (candidate.stage === 'rejected' ? (
                <span
                  title="Onboarding had completed before this candidate was rejected — the hire was unwound."
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[0.6875rem] font-semibold text-amber-700 ring-1 ring-amber-200"
                >
                  <AlertTriangle className="h-3 w-3" /> Was onboarded
                </span>
              ) : (
                <span
                  title="Onboarding complete — hired and handed off to IT"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[0.6875rem] font-semibold text-white shadow-sm shadow-emerald-600/25"
                >
                  <Check className="h-3 w-3" strokeWidth={3} /> Completed
                </span>
              ))}
          </div>
        </div>

        {/* ── Every action, labelled ── */}
        {canManage && (
          <div className="col-span-3 flex flex-wrap items-center gap-1.5 sm:col-span-2 sm:col-start-3">
            {primary === 'send' && (
              <ActionBtn icon={Send} motion="fly" tone="primary" title="Send this CV to a factory or named interviewers" onClick={() => onSendForInterview(candidate)}>
                Send for interview
              </ActionBtn>
            )}
            {primary === 'onboard' && (
              <ActionBtn icon={UserCheck} motion="pop" tone="primary" title="Documents, offer & onboarding" onClick={() => navigate(ROUTES.onboardingManage(candidate.id))}>
                Onboard
              </ActionBtn>
            )}
            {primary === 'interviews' && interviewsBtn}
            {primary === 'salary' && salaryBtn}
            {primary === 'scan' && scanBtn}

            {candidate.cvUrl ? (
              <ActionBtn as="a" href={resolveApiFileUrl(candidate.cvUrl)} icon={FileText} motion="lift" title="View the CV">
                CV
              </ActionBtn>
            ) : candidate.hasGeneratedCv ? (
              /* Applied through Bdjobs — fields, no document. The CV is built
                 from what they submitted rather than leaving nothing to read. */
              <ActionBtn icon={FileText} motion="lift" title="View the CV built from this application" onClick={() => setCvOpen(true)}>
                CV
              </ActionBtn>
            ) : (
              <ActionBtn icon={Upload} motion="lift" busy={upload.isPending} title="Upload a CV" onClick={() => fileRef.current?.click()}>
                {upload.isPending ? 'Uploading…' : 'Upload CV'}
              </ActionBtn>
            )}
            {primary !== 'scan' && scanBtn}
            <ActionBtn
              icon={Mail}
              motion="tilt"
              title={candidate.email ? `Email ${candidate.email}` : 'No email on file'}
              disabled={!candidate.email}
              onClick={() => onEmail(candidate)}
            >
              Email
            </ActionBtn>
            {primary !== 'interviews' && interviewsBtn}
            {primary !== 'salary' && salaryBtn}
            {/* Already out with the factory: says so, and can be sent again. */}
            {candidate.stage === 'shortlisted' && hold && (
              <ActionBtn icon={Check} motion="pop" tone="emerald" active title="Sent for interview — send again or to someone else" onClick={() => onSendForInterview(candidate)}>
                Sent for interview
              </ActionBtn>
            )}
            {candidate.stage === 'rejected' && onRegret && !candidate.regretSentAt && (
              <ActionBtn
                icon={MailX}
                motion="tilt"
                tone="rose"
                title={candidate.email ? 'Send DBL’s regret letter' : 'No email on file'}
                disabled={!candidate.email}
                onClick={() => onRegret(candidate)}
              >
                Regret mail
              </ActionBtn>
            )}
            <ActionBtn
              icon={Star}
              motion="star"
              tone="amber"
              active={candidate.talentPool}
              iconFill={candidate.talentPool}
              title={candidate.talentPool ? 'Remove from the Talent Bank' : 'Add to the Talent Bank'}
              onClick={() => update.mutate({ id: candidate.id, input: { talentPool: !candidate.talentPool } })}
            >
              {candidate.talentPool ? 'In Talent Bank' : 'Talent Bank'}
            </ActionBtn>

            <span aria-hidden className="min-w-[0.5rem] flex-1" />

            <ActionBtn
              icon={Flag}
              motion="wave"
              tone={candidate.isRedFlagged ? 'rose' : 'quiet'}
              active={candidate.isRedFlagged}
              iconFill={candidate.isRedFlagged}
              disabled={flag.isPending || unflag.isPending}
              title={candidate.isRedFlagged ? `Red-flagged: ${candidate.redFlagReason ?? ''} — click to remove the flag` : 'Mark as red flag'}
              onClick={() => (candidate.isRedFlagged ? unflag.mutate(candidate.id) : setFlagModalOpen(true))}
            >
              {candidate.isRedFlagged ? 'Flagged' : 'Red-flag'}
            </ActionBtn>
            <ActionBtn
              icon={Trash2}
              motion="wiggle"
              tone="danger"
              title="Remove from this pipeline"
              onClick={() => {
                if (window.confirm(`Remove ${candidate.name} from this pipeline?`)) {
                  remove.mutate(candidate.id);
                }
              }}
            >
              Remove
            </ActionBtn>
          </div>
        )}
      </div>

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
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
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

/** One thing that needs attention, as a tinted line — never a stripe. */
function Status({
  tone,
  pulse = false,
  children,
}: {
  tone: 'sky' | 'rose' | 'emerald';
  pulse?: boolean;
  children: ReactNode;
}) {
  const look = {
    sky: { box: 'bg-sky-50 text-sky-800', dot: 'bg-sky-500', ring: 'bg-sky-400' },
    rose: { box: 'bg-rose-50 text-rose-800', dot: 'bg-rose-500', ring: 'bg-rose-400' },
    emerald: { box: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500', ring: 'bg-emerald-400' },
  }[tone];
  return (
    <span className={cn('inline-flex max-w-full items-start gap-2 rounded-lg px-2.5 py-1 text-[0.8125rem] leading-snug', look.box)}>
      <span className="relative mt-[6px] flex h-1.5 w-1.5 shrink-0">
        {pulse && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping', look.ring)} />}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', look.dot)} />
      </span>
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/**
 * The AI match: the number, what it means in words, and a bar that fills
 * when the card appears. Opens the breakdown when there is one.
 */
function MatchScore({
  score,
  clickable,
  title,
  onOpen,
}: {
  score: number;
  clickable: boolean;
  title: string;
  onOpen: (el: HTMLElement) => void;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(t);
  }, [score]);
  const band =
    score >= 75
      ? { label: 'Strong match', text: 'text-emerald-700', bar: 'bg-emerald-500' }
      : score >= 55
        ? { label: 'Good match', text: 'text-amber-700', bar: 'bg-amber-500' }
        : { label: 'Partial match', text: 'text-slate-600', bar: 'bg-slate-400' };
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onOpen(e.currentTarget); }}
      className={cn(
        'grid justify-items-start gap-1 rounded-lg px-1.5 py-1 text-left transition-colors sm:justify-items-end sm:text-right',
        clickable ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default',
      )}
    >
      <span className="text-xl font-bold leading-none tabular-nums text-slate-900">
        {score}
        <span className="ml-0.5 text-[0.6875rem] font-medium text-slate-500">/100</span>
      </span>
      <span className={cn('flex items-center gap-1 text-[0.6875rem] font-semibold', band.text)}>
        <Sparkles className="h-3 w-3" />
        {band.label}
      </span>
      <span className="h-1 w-24 overflow-hidden rounded-full bg-slate-100">
        <span
          className={cn('block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none', band.bar)}
          style={{ width: `${shown}%` }}
        />
      </span>
    </button>
  );
}

type Tone = 'neutral' | 'primary' | 'violet' | 'amber' | 'emerald' | 'rose' | 'quiet' | 'danger';
type Motion = 'lift' | 'spin' | 'tilt' | 'pop' | 'fly' | 'star' | 'wave' | 'wiggle';

/** Each icon moves in its own way on hover — the button says what it does twice. */
const MOTION: Record<Motion, string> = {
  lift: 'motion-safe:group-hover/btn:-translate-y-0.5',
  spin: 'motion-safe:group-hover/btn:rotate-[18deg] motion-safe:group-hover/btn:scale-110',
  tilt: 'motion-safe:group-hover/btn:-rotate-12',
  pop: 'motion-safe:group-hover/btn:scale-[1.18]',
  fly: 'motion-safe:group-hover/btn:translate-x-0.5 motion-safe:group-hover/btn:-translate-y-0.5',
  star: 'motion-safe:group-hover/btn:rotate-[72deg] motion-safe:group-hover/btn:scale-110',
  wave: 'motion-safe:group-hover/btn:-rotate-12 motion-safe:group-hover/btn:-translate-y-px',
  wiggle: 'motion-safe:group-hover/btn:animate-btn-wiggle',
};

const TONE: Record<Tone, { rest: string; active: string; ripple: string }> = {
  neutral: {
    rest: 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/70 hover:text-brand-700',
    active: 'border-brand-200 bg-brand-50 text-brand-700',
    ripple: 'bg-brand-500',
  },
  primary: {
    rest: 'border-brand-600 bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_1px_2px_rgba(24,119,192,0.3),0_6px_14px_-8px_rgba(24,119,192,0.7)] hover:from-brand-500 hover:to-brand-700 hover:shadow-[0_10px_20px_-10px_rgba(24,119,192,0.85)]',
    active: 'border-brand-600 bg-brand-600 text-white',
    ripple: 'bg-white',
  },
  violet: {
    rest: 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/70 hover:text-violet-700',
    active: 'border-violet-200 bg-violet-50 text-violet-700',
    ripple: 'bg-violet-500',
  },
  amber: {
    rest: 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/70 hover:text-amber-700',
    active: 'border-amber-200 bg-amber-50 text-amber-700',
    ripple: 'bg-amber-500',
  },
  emerald: {
    rest: 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/70 hover:text-emerald-700',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300',
    ripple: 'bg-emerald-500',
  },
  rose: {
    rest: 'border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50/70 hover:text-rose-700',
    active: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300',
    ripple: 'bg-rose-500',
  },
  quiet: {
    rest: 'border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-800',
    active: 'border-rose-200 bg-rose-50 text-rose-700',
    ripple: 'bg-slate-500',
  },
  danger: {
    rest: 'border-transparent bg-transparent text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700',
    active: 'border-rose-200 bg-rose-50 text-rose-700',
    ripple: 'bg-rose-500',
  },
};

/**
 * An action button that feels like one: it lifts on hover, sinks when
 * pressed, ripples from where it was clicked, and its icon moves in a way
 * that matches what it does. The primary one catches a sweep of light.
 * All of it stays still for people who ask their system for less motion.
 */
function ActionBtn({
  children,
  title,
  icon: Icon,
  motion = 'pop',
  tone = 'neutral',
  active = false,
  iconFill = false,
  busy = false,
  disabled,
  onClick,
  as,
  href,
}: {
  children: ReactNode;
  title: string;
  icon: LucideIcon;
  motion?: Motion;
  tone?: Tone;
  active?: boolean;
  iconFill?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  as?: 'a';
  href?: string;
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const t = TONE[tone];

  const addRipple = (e: ReactPointerEvent<HTMLElement>) => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size }]);
  };

  const cls = cn(
    'group/btn relative isolate inline-flex h-8 shrink-0 select-none items-center gap-1.5 overflow-hidden rounded-lg border px-3 text-[0.8125rem] font-medium',
    'transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
    'hover:shadow-[0_6px_14px_-8px_rgba(15,23,42,0.35)] motion-safe:hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-1',
    'disabled:pointer-events-none disabled:opacity-45',
    active ? t.active : t.rest,
  );

  const inner = (
    <>
      {tone === 'primary' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 -z-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 motion-safe:group-hover/btn:animate-btn-sheen"
        />
      )}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          onAnimationEnd={() => setRipples((all) => all.filter((x) => x.id !== r.id))}
          className={cn('pointer-events-none absolute rounded-full opacity-0 animate-btn-ripple', t.ripple)}
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
      <span className={cn('relative inline-flex transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]', !busy && MOTION[motion])}>
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5" fill={iconFill ? 'currentColor' : 'none'} />
        )}
      </span>
      <span className="relative">{children}</span>
    </>
  );

  if (as === 'a') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={title}
        className={cls}
        onPointerDown={addRipple}
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      title={title}
      disabled={disabled || busy}
      className={cls}
      onPointerDown={addRipple}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      {inner}
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
    const W = 210;
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
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change stage"
        className={cn(
          'group/stage inline-flex h-8 shrink-0 items-stretch overflow-hidden rounded-lg border text-[0.8125rem] font-semibold shadow-sm',
          'transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:shadow-md motion-safe:hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-1 disabled:opacity-50',
          open && 'ring-2 ring-brand-400/40',
          meta.control,
        )}
      >
        <span className="flex items-center gap-2 pl-3 pr-2.5">
          <span className="relative flex h-2 w-2">
            <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-50 motion-safe:group-hover/stage:animate-ping', meta.dot)} />
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', meta.dot)} />
          </span>
          {meta.label}
        </span>
        <span className={cn('flex items-center border-l px-1.5', meta.well)}>
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
        </span>
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
            role="listbox"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18),0_2px_8px_-2px_rgba(0,0,0,0.06)]"
          >
            <p className="px-3.5 pb-1 pt-1 text-[0.625rem] font-semibold uppercase tracking-widest text-slate-400">Move to stage</p>
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
                  role="option"
                  aria-selected={isCurrent}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[0.8125rem] transition-colors',
                    'hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40',
                    isCurrent ? cn('font-semibold', m.tone) : 'text-slate-700',
                  )}
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', m.dot)} />
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
