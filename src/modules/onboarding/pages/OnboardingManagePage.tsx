import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgeCheck,
  BellRing,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardPen,
  Copy,
  ExternalLink,
  FileText,
  FileSignature,
  FolderArchive,
  Loader2,
  Sofa,
  Stamp,
  Lock,
  Mail,
  Paperclip,
  Printer,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  FullPageSpinner,
  Input,
  type BadgeTone,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatCurrency } from '@shared/utils';
import { ROUTES } from '@app/router/paths';
import { useUpdateCandidate } from '@modules/candidates';
import { useSetCandidatePackage } from '@modules/assessment';
import {
  boardStageState,
  isOnSheet,
  useBoardApprovalStatus,
  useHrBoardApprove,
  useSendBoardApproval,
} from '@modules/board';
import { useMyPermissions } from '@modules/rbac';
import { useAuthStore } from '@modules/auth';
import {
  canAccessRecruitment,
  isTalentAcquisitionHead,
} from '@modules/candidates';
import { EmployeePicker, FacilitiesPanel } from '@modules/requisition';
import type { PickedEmployee } from '@modules/requisition';
import { OfferLetterModal } from '../components/OfferLetterModal';
import { AppointmentLetterModal } from '../components/AppointmentLetterModal';
import { FacilityProvisioningPanel } from '../components/FacilityProvisioningPanel';
import { HrVerifyModal } from '../components/HrVerifyModal';
import { ReferenceChecksPanel } from '../components/ReferenceChecksPanel';
import { useReferenceChecks } from '../hooks/useReferenceChecks';
import { useSetPlacement } from '../hooks/useOnboarding';
import { useRequisition } from '@modules/requisition';

import { useFacilityProvisioning } from '../hooks/useFacilityProvisioning';
import { onboardingKeys } from '../hooks/useOnboarding';
import {
  useArchiveFiles,
  useArchiveOnboarding,
  useChaseDocs,
  useCrossCheck,
  useManualCrossCheck,
  useHrVerify,
  useSendCoc,
  useMarkOfferAcceptedManually,
  useAlertMedical,
  useCandidateTimeline,
  useMedicalExam,
  useNotifyIt,
  useReviewFacilities,
  useSetMedical,
  useOnboarding,
  useSendOnboardingLink,
  useSkipDocs,
  useSkipVerification,
  useStartOnboarding,
  useSummarizeDoc,
  useVerifyDoc,
} from '../hooks/useOnboarding';
import type {
  CrossCheckSeverity,
  DocSectionSpec,
  JoiningDocSpec,
  OnboardingCandidate,
  CrossCheckVerdict,
  DocStatus,
  OnboardingDoc,
  OnboardingResult,
  OnboardingView,
} from '../types/onboarding.types';
import { printMedicalReport } from '../utils/printMedicalReport';
import { MedicalLetterModal } from '../components/MedicalLetterModal';
import { MedicalRequestModal } from '../components/MedicalRequestModal';
import { printOnboardingSummary } from '../utils/printSummary';
import { printShortCandidateSummary } from '../utils/printShortSummary';
import { resolveApiFileUrl } from '@shared/api';

const DOC_TONE: Record<DocStatus, BadgeTone> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
};
const MED_TONE: Record<string, BadgeTone> = {
  pending: 'warning',
  cleared: 'success',
  rejected: 'danger',
};

/** 6 stages, header dots and Flow's detail panel are 1:1. */
const STAGES = [
  'Documents',
  'Facilities',
  'Medical',
  'Board Approval',
  'Offer & Provisioning',
  'Complete',
];

/**
 * Record a medical result that happened on paper.
 *
 * The structured exam form belongs to the medical team, but plenty of checks
 * are done at a clinic and come back as a signed sheet. Without this, HR could
 * see "Awaiting medical team" and have no way to move the candidate on.
 */
/**
 * Whether one side of the medical letter actually went out.
 *
 * Green with a date, or plainly "not sent" — never blank. A missing line reads
 * as "no information"; this has to read as "nobody told them".
 */
function SentFlag({ label, at }: { label: string; at?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          at ? 'bg-emerald-500' : 'bg-slate-300',
        )}
      />
      <span className="text-slate-500">{label}</span>
      <span className={at ? 'font-medium text-slate-700' : 'text-slate-400'}>
        {at
          ? new Date(at).toLocaleDateString('en-GB', { dateStyle: 'medium' })
          : 'not sent'}
      </span>
    </span>
  );
}

function ManualMedicalRecorder({
  onboardingId,
  alerted,
}: {
  onboardingId: string;
  alerted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<'cleared' | 'rejected'>('cleared');
  const [note, setNote] = useState('');
  const setMedical = useSetMedical();
  const alertMedical = useAlertMedical();

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          isLoading={alertMedical.isPending}
          onClick={() => alertMedical.mutate(onboardingId)}
        >
          <BellRing className="mr-1.5 h-3.5 w-3.5" />
          {alerted ? 'Remind medical team' : 'Alert medical team'}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <ClipboardPen className="h-3.5 w-3.5" />
          Record by hand
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-700">
        Record a check done on paper
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(['cleared', 'rejected'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVerdict(v)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-medium ring-1 transition-colors',
              verdict === v
                ? v === 'cleared'
                  ? 'bg-emerald-600 text-white ring-emerald-600'
                  : 'bg-rose-600 text-white ring-rose-600'
                : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-100',
            )}
          >
            {v === 'cleared' ? 'Medically fit' : 'Not fit'}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What was checked, by whom and where — this note is the whole record"
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={verdict === 'cleared' ? 'primary' : 'danger'}
          isLoading={setMedical.isPending}
          // The note is the only record of an exam the system never saw.
          disabled={!note.trim()}
          onClick={() =>
            setMedical.mutate(
              { onboardingId, status: verdict, note: note.trim(), manual: true },
              {
                onSuccess: () => {
                  setOpen(false);
                  setNote('');
                },
              },
            )
          }
        >
          Record {verdict === 'cleared' ? 'clearance' : 'rejection'}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function OnboardingManagePage() {
  const { candidateId = '' } = useParams();
  const { data, isLoading, isError } = useOnboarding(candidateId);
  const { data: perms } = useMyPermissions();
  const myUserId = useAuthStore((s) => s.user?.id);
  const { data: boardApproval } = useBoardApprovalStatus(candidateId, Boolean(candidateId));
  const isBoardApproved = boardApproval?.status === 'approved';
  const { data: provisioning } = useFacilityProvisioning(candidateId);
  // "Done" once HR has notified someone for every facility that needs
  // arranging — the recipient's own confirmation isn't required to move on;
  // HR can always come back and resend if no one's confirmed yet.
  const provisioningDone =
    !provisioning ||
    provisioning.items.length === 0 ||
    provisioning.items.every((i) => i.recipients.length > 0);
  const start = useStartOnboarding(candidateId);

  // Flow-stage state (done/current/locked/open) — lifted up here so the
  // header stepper and the single detail panel below share one source of
  // navigation truth ("part by part" — only the selected stage is shown).
  const ob = data?.onboarding ?? null;
  const allVerified = Boolean(
    ob &&
      ((ob.docs.length > 0 && ob.docs.every((d) => d.status === 'verified')) ||
        ob.verificationSkippedAt),
  );
  const docsCollected = Boolean(ob && (ob.docs.length > 0 || ob.docsSkippedAt));
  // 6 stages: (0) Documents, (1) Facility requirements, (2) Medical,
  // (3) Board approval, (4) Offer letter & facility provisioning,
  // (5) Final verification, appointment letter and completion.
  //
  // The chain reads: verify → medical → board signs off → offer goes out →
  // facilities are arranged → candidate accepts → final verification →
  // appointment letter. Provisioning sits with the offer because the offer is
  // what commits the company to those facilities; step 4 therefore only counts
  // as done once the candidate has accepted AND every facility has been passed
  // to somebody. It cannot gate the step it lives in, so the offer unlocks on
  // board approval alone — otherwise the provisioning panel would be locked
  // behind the very thing it is waiting for.
  const facilitiesReviewed = Boolean(ob?.facilitiesReviewedAt);
  const doneFlags = ob
    ? [
        docsCollected && allVerified,
        // Facility requirements have no completion event of their own, so
        // somebody says so. They used to settle alongside the documents,
        // which meant a hire entitled to nothing skipped straight past the
        // panel into medical — precisely the case worth confirming.
        facilitiesReviewed,
        ob.medicalStatus === 'cleared',
        isBoardApproved,
        Boolean(ob.offerAcceptedAt) && provisioningDone,
        Boolean(ob.itNotifiedAt),
      ]
    : [false, false, false, false, false, false];
  const lockedFlags = ob
    ? [
        false,
        false,
        !(docsCollected && allVerified) || !facilitiesReviewed,
        ob.medicalStatus !== 'cleared',
        !isBoardApproved,
        !ob.offerAcceptedAt,
      ]
    : [false, false, false, false, false, false];
  const currentIdx = doneFlags.findIndex((d, i) => !d && !lockedFlags[i]);
  const stateOf = (i: number): StageState =>
    doneFlags[i] ? 'done' : lockedFlags[i] ? 'locked' : i === currentIdx ? 'current' : 'open';

  const [activeStage, setActiveStage] = useState(
    currentIdx >= 0 ? currentIdx : STAGES.length - 1,
  );
  const lastCurrentIdx = useRef(currentIdx);
  useEffect(() => {
    if (currentIdx !== lastCurrentIdx.current) {
      lastCurrentIdx.current = currentIdx;
      setActiveStage(currentIdx >= 0 ? currentIdx : STAGES.length - 1);
    }
  }, [currentIdx]);

  if (isLoading) return <FullPageSpinner label="Loading onboarding…" />;

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <BackLink to={ROUTES.candidates} label="Candidates" />
        <Card>
          <CardBody className="py-10 text-center text-sm text-slate-500">
            This candidate&rsquo;s onboarding isn&rsquo;t available.
          </CardBody>
        </Card>
      </div>
    );
  }

  const c = data.candidate;
  const done = currentIdx >= 0 ? currentIdx : STAGES.length;
  // Head of Talent Acquisition / CHRO / super, plus the Corporate Recruiter assigned to this
  // requisition — they own the requisition after approval, and the API already
  // lets them through, so hiding the control only stranded facilities at
  // "Not notified" with nobody able to send them.
  const canEditFacilities = canAccessRecruitment(perms, c.unit, {
    recruiterId: c.recruiterId,
    coverRecruiterId: c.coverRecruiterId,
    myUserId,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <BackLink
        to={ROUTES.requisitionDetail(c.requisitionId)}
        label="requisition"
      />

      {/* Header: name + journey stepper */}
      <div
        className="animate-rise-in relative overflow-hidden rounded-2xl border border-slate-200 bg-[length:200%_200%] bg-gradient-to-r from-brand-700 via-brand-500 to-emerald-500 p-6 text-white shadow-lg animate-gradient-pan"
      >
        {/* Ambient glow accents */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <span className="relative shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/25 [animation-duration:2.5s]" />
              <Avatar
                name={c.name}
                src={c.photoUrl}
                size="lg"
                className="relative bg-white/20 text-white ring-2 ring-white/40"
              />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                {c.code} · Onboarding
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold">{c.name}</h1>
              <p className="mt-1 text-sm text-white/90">
                {c.designation} · {c.unit}
                {c.department ? ` · ${c.department}` : ''}
              </p>
            </div>
          </div>
          {c.matchScore != null && (
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm">
              AI match {c.matchScore}%
            </span>
          )}
        </div>

        {/* Horizontal stepper — click any reached/current dot to jump the panel below to it */}
        <div className="relative mt-6 flex items-center">
          {STAGES.map((label, i) => {
            const reached = i < done;
            const current = i === done && Boolean(ob);
            const clickable = Boolean(ob) && stateOf(i) !== 'locked';
            return (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => setActiveStage(i)}
                  className={cn('group relative flex flex-col items-center', clickable && 'cursor-pointer')}
                >
                  {current && (
                    <span className="absolute -inset-1 animate-ping rounded-full bg-white/40 [animation-duration:1.8s]" />
                  )}
                  <div
                    className={cn(
                      'relative flex h-7 w-7 items-center justify-center rounded-full border text-[0.6875rem] font-semibold transition-all duration-300',
                      reached
                        ? 'border-white bg-white text-brand-700'
                        : current
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/40 text-white/60',
                      clickable && 'group-hover:scale-110',
                      activeStage === i && 'ring-2 ring-white/70 ring-offset-2 ring-offset-brand-600',
                    )}
                  >
                    {reached ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      'mt-1 hidden text-[0.625rem] transition-colors sm:block',
                      activeStage === i ? 'font-semibold text-white' : 'text-white/80',
                    )}
                  >
                    {label}
                  </span>
                </button>
                {i < STAGES.length - 1 && (
                  <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-700 ease-out"
                      style={{ width: i < done ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!ob ? (
        <Card className="mx-auto max-w-2xl">
          <CardBody className="space-y-4 py-10 text-center">
            <UserCheck className="mx-auto h-10 w-10 text-brand-500" />
            <div>
              <p className="font-semibold text-slate-800">
                Begin {c.name}&rsquo;s onboarding
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Collect &amp; verify joining documents, confirm facilities and
                send the offer, then complete medical clearance, board
                approval and IT provisioning.
              </p>
            </div>
            <Button
              size="lg"
              isLoading={start.isPending}
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() => start.mutate(undefined)}
            >
              Start onboarding
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <Flow
            candidateId={candidateId}
            ob={ob}
            email={c.email}
            aiOn={data.aiConfigured}
            mailOn={data.mailConfigured}
            itWebhook={data.itWebhook}
            result={data}
            isBoardApproved={isBoardApproved}
            canEditFacilities={canEditFacilities}
            activeStage={activeStage}
            stateOf={stateOf}
          />
          <Sidebar result={data} ob={ob} />
        </div>
      )}
    </div>
  );
}

/** Reference cards (candidate, salary, key dates) beside the stage detail panel. */
function Sidebar({
  result,
  ob,
}: {
  result: OnboardingResult;
  ob: OnboardingView;
}) {
  const c = result.candidate;
  // Fetched with the page so Print stays a single user gesture — opening the
  // print window after an await loses it, and popup blockers stop it.
  const { data: timeline } = useCandidateTimeline(c.id);
  // Same reason as the timeline above: Print must stay a single gesture, and
  // the summary opens with the requisition this hire was approved against.
  const { data: printReq } = useRequisition(c.requisitionId);
  const { data: refChecks } = useReferenceChecks(c.id);

  const copyLink = async () => {
    await navigator.clipboard.writeText(ob.submissionLink);
    toast.success('Link copied');
  };

  return (
    <aside className="space-y-4 self-start lg:sticky lg:top-6">
      {/* Quick actions */}
      <Card className="animate-fade-in" style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}>
        <CardBody className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Quick actions
          </p>
          <Button
            variant="outline"
            className="w-full justify-center"
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={() =>
              printOnboardingSummary(
                result,
                timeline ?? [],
                printReq ?? null,
                refChecks?.items ?? [],
              )
            }
          >
            Print full record
          </Button>
          {/* The one-pager. Separate from the full record rather than a mode
              of it: the record is the personnel file and runs to pages, while
              this is the sheet somebody carries into a meeting. */}
          <Button
            variant="outline"
            className="w-full justify-center"
            leftIcon={<FileText className="h-4 w-4" />}
            onClick={() => void printShortCandidateSummary(result)}
          >
            Print 1-page summary
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-center"
            leftIcon={<Copy className="h-4 w-4" />}
            onClick={copyLink}
          >
            Copy submission link
          </Button>
          {/* No link to the Drive folder: it is private to the recruitment
              account, so for everyone else it opens a request-access page.
              The archived documents are read in the final-verification step,
              through signed links this API serves. */}
        </CardBody>
      </Card>

      {/* Candidate */}
      <Card className="animate-fade-in" style={{ animationDelay: '140ms', animationFillMode: 'backwards' }}>
        <CardBody className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Candidate
          </p>
          <ContactBlock
            candidateId={c.id}
            reqId={c.requisitionId}
            email={c.email}
            phone={c.phone}
          />
          <dl className="space-y-1.5 text-sm">
            <SideRow label="Requisition" value={c.code} />
            <SideRow label="Position" value={c.designation} />
            <SideRow label="Unit" value={c.unit} />
            {c.department && <SideRow label="Department" value={c.department} />}
            <SideRow label="CV source" value={c.source} />
            {c.matchScore != null && (
              <SideRow label="AI match" value={`${c.matchScore}/100`} />
            )}
          </dl>
        </CardBody>
      </Card>

      {/* Salary Fixation */}
      {c.proposedSalary != null && (
        <Card className="animate-fade-in" style={{ animationDelay: '180ms', animationFillMode: 'backwards' }}>
          <CardBody className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Salary Fixation
            </p>
            <dl className="space-y-1.5 text-sm">
              {c.salaryJobGrade && (
                <SideRow label="Job Grade" value={c.salaryJobGrade} />
              )}
              <SideRow label="Fixed Salary" value={formatCurrency(c.proposedSalary)} />
            </dl>
          </CardBody>
        </Card>
      )}

      {/* Key dates */}
      <Card className="animate-fade-in" style={{ animationDelay: '220ms', animationFillMode: 'backwards' }}>
        <CardBody className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Key dates
          </p>
          <DateRow label="Documents started" value={ob.createdAt} />
          <DateRow label="Offer sent" value={ob.offerSentAt} />
          <DateRow label="Offer accepted" value={ob.offerAcceptedAt} />
          <DateRow label="Medical cleared" value={ob.medicalClearedAt} />
          <DateRow label="HR verified" value={ob.hrVerifiedAt} />
          <DateRow label="Archived" value={ob.archivedAt} />
          <DateRow label="Onboarded" value={ob.itNotifiedAt} />
        </CardBody>
      </Card>
    </aside>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-slate-400">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-slate-700">
        {value}
      </dd>
    </div>
  );
}

function DateRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-slate-500">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            value ? 'bg-emerald-500' : 'bg-slate-200',
          )}
        />
        {label}
      </span>
      <span
        className={cn(
          'text-xs font-medium',
          value ? 'text-slate-700' : 'text-slate-300',
        )}
      >
        {value ? fmt(value) : '—'}
      </span>
    </div>
  );
}

const STATE_ACCENT: Record<StageState, string> = {
  current: 'border-t-brand-500',
  done: 'border-t-emerald-500',
  open: 'border-t-slate-200',
  locked: 'border-t-slate-200',
};
const STATE_BADGE: Record<StageState, string> = {
  current: 'bg-brand-50 text-brand-600',
  done: 'bg-emerald-50 text-emerald-600',
  open: 'bg-slate-100 text-slate-500',
  locked: 'bg-slate-100 text-slate-300',
};

function Flow({
  candidateId,
  ob,
  email,
  aiOn,
  mailOn,
  itWebhook,
  result,
  isBoardApproved,
  canEditFacilities,
  activeStage,
  stateOf,
}: {
  candidateId: string;
  ob: OnboardingView;
  email: string;
  aiOn: boolean;
  mailOn: boolean;
  itWebhook: boolean;
  result: OnboardingResult;
  isBoardApproved: boolean;
  canEditFacilities: boolean;
  /** Which of the 5 stages the detail panel below shows — driven by the header stepper. */
  activeStage: number;
  stateOf: (i: number) => StageState;
}) {
  const sendLink = useSendOnboardingLink(candidateId);
  const markOfferAccepted = useMarkOfferAcceptedManually(candidateId);
  const { data: medicalExam } = useMedicalExam(ob.id, true);
  const hrVerify = useHrVerify(candidateId);
  const sendCoc = useSendCoc(candidateId);
  const archive = useArchiveOnboarding(candidateId);
  const chaseDocs = useChaseDocs(candidateId);
  const { data: flowRefChecks } = useReferenceChecks(candidateId);
  // Both are gates the server enforces at final verification, so the modal
  // lists them among the reasons it is about to refuse.
  const refCount = flowRefChecks?.items.length ?? 0;
  const nidComplete = Boolean(
    ob.nid.name && ob.nid.address && ob.nid.dateOfBirth && ob.nid.number,
  );
  const notifyIt = useNotifyIt(candidateId);
  const skipDocs = useSkipDocs(candidateId);
  const skipVerification = useSkipVerification(candidateId);
  const reviewFacilities = useReviewFacilities(candidateId);
  // The candidate's own package — reused here for one field only: the
  // transport pick-up point, which factory HR takes in the interview and
  // whoever arranges the run corrects on the facility requirements.
  const setPackage = useSetCandidatePackage(candidateId);

  const [itEmail, setItEmail] = useState(ob.itEmail);
  const [offerLetterOpen, setOfferLetterOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [verifyConfirmOpen, setVerifyConfirmOpen] = useState(false);

  // ── Board Approval (moved in here from the sidebar — now step 4) ──
  const { data: boardApproval } = useBoardApprovalStatus(candidateId, true);
  const hrApprove = useHrBoardApprove(candidateId);
  // No picker: Head of Talent Acquisition chooses the CHRO and the board on
  // the Hiring Approval Sheet, so the recruiter only hands the candidate over.
  const sendBoard = useSendBoardApproval(candidateId);
  const boardOnSheet = isOnSheet(boardApproval);
  /** The medical test letter dialog — HR raises it from the Medical step. */
  const [medicalLetterOpen, setMedicalLetterOpen] = useState(false);
  /** The recruiter's request — HoTA schedules and sends. */
  const [medicalRequestOpen, setMedicalRequestOpen] = useState(false);
  // Only Head of Talent Acquisition sends the letter itself; the recruiter
  // asks for it and the request waits in HoTA's Medical Requests inbox.
  const { data: flowPerms } = useMyPermissions();
  const isTalentHead = isTalentAcquisitionHead(flowPerms);
  const [showHrForm, setShowHrForm] = useState(false);
  const [hrNote, setHrNote] = useState('');
  const [hrFile, setHrFile] = useState<File | null>(null);
  const isApproved = boardApproval?.status === 'approved';
  const approvedVotes = boardApproval?.votes.filter((v) => v.status === 'approved') ?? [];
  const confirmHrApprove = () => {
    if (!hrFile) return;
    hrApprove.mutate(
      { file: hrFile, note: hrNote.trim() || undefined },
      { onSuccess: () => { setShowHrForm(false); setHrNote(''); setHrFile(null); } },
    );
  };
  const { data: provisioning } = useFacilityProvisioning(candidateId);
  // Fetched with the page so Print stays a single user gesture.
  const { data: timeline } = useCandidateTimeline(candidateId);

  const allVerified =
    (ob.docs.length > 0 && ob.docs.every((d) => d.status === 'verified')) ||
    Boolean(ob.verificationSkippedAt);
  const docsCollected = ob.docs.length > 0 || Boolean(ob.docsSkippedAt);
  // The server works the same thing out in hr-verify.ts and refuses on it, so
  // this reads its answer rather than reimplementing the rule here.
  const docsSettled = ob.missingDocs.length === 0 && ob.pendingDocs.length === 0;
  // Unified "Checked by Manual on hand" — HR physically verified the
  // documents, so skip both the online collection link and per-doc
  // verification in one action instead of two separate skip buttons.
  const checkedManually = () => {
    if (!ob.docsSkippedAt) skipDocs.mutate(undefined);
    if (!allVerified) skipVerification.mutate(undefined);
  };

  // Worst cross-check severity per document label, for the row chips.
  const severityRank: Record<CrossCheckSeverity, number> = {
    info: 0,
    warning: 1,
    critical: 2,
  };
  const docFlags = new Map<string, CrossCheckSeverity>();
  for (const f of ob.crossCheck?.findings ?? []) {
    const doc = ob.docs.find(
      (d) => d.label === f.doc || f.doc.includes(d.label),
    );
    if (!doc) continue;
    const prev = docFlags.get(doc.label);
    if (!prev || severityRank[f.severity] > severityRank[prev]) {
      docFlags.set(doc.label, f.severity);
    }
  }
  const noEmail = !mailOn || !email;
  const emailHint = !mailOn
    ? 'Email is not configured on the server.'
    : !email
      ? 'This candidate has no email — add one on the Recruitment tab.'
      : undefined;

  const copyLink = async () => {
    await navigator.clipboard.writeText(ob.submissionLink);
    toast.success('Link copied');
  };

  const medicalReportDoc = ob.docs.find(
    (d) => d.label === 'Medical Fitness Report',
  );

  const stages: {
    title: string;
    icon: React.ElementType;
    lockReason?: string;
    content: React.ReactNode;
  }[] = [
    {
      // Step 1 — document collection & verification, combined. HR can skip
      // both at once with "Checked by Manual on hand" if they've already
      // physically reviewed the candidate's documents.
      title: `Document collection & verification (${ob.docs.length})`,
      icon: FileText,
      content: (() => {
        const bothSkipped =
          Boolean(ob.docsSkippedAt) &&
          Boolean(ob.verificationSkippedAt) &&
          ob.docs.length === 0;
        // Reference checks are the recruiter's own work, not the candidate's
        // uploads: they belong on this step whether or not the online
        // collection flow was skipped.
        const referenceChecks = (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Reference checks
            </p>
            <ReferenceChecksPanel
              candidateId={candidateId}
              canEdit={canEditFacilities}
            />
          </div>
        );
        if (bothSkipped) {
          return (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                <Check className="h-4 w-4 shrink-0 text-slate-400" />
                Checked by Manual on hand — HR verified the documents in person;
                no online submission was needed.
              </div>
              {referenceChecks}
            </>
          );
        }
        const stepDone = docsCollected && allVerified;
        return (
          <>
            {!stepDone && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Already checked these documents in person?
                  </p>
                  <p className="text-xs text-slate-500">
                    Skip the online collection &amp; verification flow below —
                    this whole step is fully skippable.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={skipDocs.isPending || skipVerification.isPending}
                  onClick={checkedManually}
                >
                  Checked by Manual on hand
                </Button>
              </div>
            )}
            {!ob.docsSkippedAt ? (
              <>
                <p className="mb-3 text-sm text-slate-500">
                  Share this secure link with the candidate to upload their
                  joining documents.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {ob.submissionLink}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Copy className="h-3.5 w-3.5" />}
                    onClick={copyLink}
                  >
                    Copy
                  </Button>
                  <a href={ob.submissionLink} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                      Open
                    </Button>
                  </a>
                  <Button
                    size="sm"
                    leftIcon={<Mail className="h-3.5 w-3.5" />}
                    isLoading={sendLink.isPending}
                    disabled={noEmail}
                    title={emailHint}
                    onClick={() => sendLink.mutate(undefined)}
                  >
                    Email link
                  </Button>
                </div>
                {noEmail && <Hint>{emailHint}</Hint>}
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Check className="h-4 w-4 shrink-0 text-slate-400" />
                Online collection skipped by HR.
              </p>
            )}

            <div className="mt-4 border-t border-slate-100 pt-4">
              {ob.docs.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No documents yet — the candidate uploads them through the
                  link above.
                </p>
              ) : (
                /* Grouped the way the candidate sent them. A flat list of
                   twenty-odd rows gives no sense of whether the academic set
                   is complete or the identity papers are missing — which is
                   the question HR is actually asking when they open this. */
                <div className="space-y-4">
                  {groupDocsBySection(ob.docs, result.docSections, result.docCatalogue).map(
                    (group) => (
                      <div key={group.key}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                            {group.label}
                          </p>
                          <span className="text-[0.625rem] font-semibold text-slate-400">
                            {group.docs.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {group.docs.map((d) => (
                            <DocRow
                              key={d.id}
                              candidateId={candidateId}
                              doc={d}
                              aiOn={aiOn}
                              flag={docFlags.get(d.label)}
                            />
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
              {ob.docs.length > 0 && (
                <CrossCheckPanel candidateId={candidateId} ob={ob} aiOn={aiOn} />
              )}
            </div>
            {referenceChecks}
          </>
        );
      })(),
    },
    {
      // Step 2 — facility requirements confirmation.
      title: 'Facility Requirements',
      icon: Sofa,
      content: (
        <div className="space-y-5">
          {result.candidate.facilities && (
            <FacilitiesPanel
              requisition={{
                id: result.candidate.requisitionId,
                facilities: result.candidate.facilities,
                specialNotes: result.candidate.specialNotes,
              }}
              canEdit={canEditFacilities}
              // Where this person is picked up from — taken in the interview
              // room, settled here by whoever has to arrange the run.
              pickup={{
                value: result.candidate.transportPickup ?? null,
                saving: setPackage.isPending,
                onSave: (transportPickup) =>
                  setPackage.mutate({ transportPickup }),
              }}
            />
          )}

          {/* The step's own sign-off. Nothing here completes by itself: a
              hire entitled to no facilities has an empty panel above, and
              that used to carry them straight into medical with the step
              never opened — the one case where somebody really should look.
              Medical stays locked until this is stamped. */}
          {ob.facilitiesReviewedAt ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">
                Facility requirements reviewed
                {ob.facilitiesReviewedByName
                  ? ` by ${ob.facilitiesReviewedByName}`
                  : ''}{' '}
                · {fmt(ob.facilitiesReviewedAt)}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Confirm you have been through this hire&rsquo;s facilities.
                </p>
                <p className="text-xs text-slate-500">
                  Mark it reviewed even when nothing is required — medical
                  clearance stays locked until you do.
                </p>
              </div>
              <Button
                size="sm"
                isLoading={reviewFacilities.isPending}
                disabled={!canEditFacilities}
                onClick={() => reviewFacilities.mutate(undefined)}
              >
                Mark as Reviewed
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      // Step 3 — medical clearance.
      title: 'Medical clearance',
      icon: Stethoscope,
      lockReason:
        'Unlocks once documents are verified and facility requirements are reviewed.',
      content: (
        <>
          <div className="flex items-center gap-2">
            <Badge tone={MED_TONE[ob.medicalStatus] ?? 'warning'}>
              {ob.medicalStatus === 'cleared'
                ? `Cleared ${fmt(ob.medicalClearedAt)}`
                : ob.medicalStatus === 'rejected'
                  ? 'Not cleared'
                  : 'Awaiting medical team'}
            </Badge>
            {/* A clearance without the structured report behind it should say
                so — the note is then the whole record of what was examined. */}
            {ob.medicalStatus === 'cleared' && ob.medicalManual && (
              <Badge tone="info">
                Checked by hand
                {ob.medicalClearedByName ? ` · ${ob.medicalClearedByName}` : ''}
              </Badge>
            )}
            {ob.medicalNote && (
              <span className="text-xs text-slate-500">“{ob.medicalNote}”</span>
            )}
          </div>

          {/* Whether the request actually reached the medical team. Without
              this, "Awaiting medical team" is indistinguishable from nobody
              having been told. */}
          {ob.medicalStatus === 'pending' && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              {ob.medicalNotifiedAt ? (
                <>
                  <BellRing className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  Medical team alerted {fmt(ob.medicalNotifiedAt)} — it is on
                  their clearance queue.
                </>
              ) : (
                <>
                  <BellRing className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  The medical team has not been alerted yet — that happens once
                  the documents are settled.
                </>
              )}
            </p>
          )}

          {medicalExam && (
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs sm:grid-cols-3">
              <MedicalStat label="Blood Pressure" value={medicalExam.bloodPressure} />
              <MedicalStat label="Pulse" value={medicalExam.pulse} />
              <MedicalStat label="Blood Group" value={medicalExam.bloodGroup} />
              <MedicalStat
                label="Fit to join"
                value={
                  medicalExam.fitToJoin === true
                    ? 'Fit'
                    : medicalExam.fitToJoin === false
                      ? 'Not fit'
                      : ''
                }
              />
              <MedicalStat label="Consultant" value={medicalExam.consultantName} />
              <MedicalStat
                label="Exam date"
                value={medicalExam.examDate ? fmt(medicalExam.examDate) : ''}
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {medicalReportDoc && (
              <a
                href={resolveApiFileUrl(medicalReportDoc.url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                View Medical Report
              </a>
            )}
            {medicalExam && (
              <button
                type="button"
                onClick={() => printMedicalReport(result.candidate, medicalExam)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Medical Fitness Report
              </button>
            )}

          </div>

          {/*
            The medical test letter.
            Nothing sends this automatically — HR raises it, and until they do
            the candidate has no appointment and the clinic expects nobody. So
            it is a filled button before it has gone out, not a quiet link
            among the others, and it states plainly who has been told.
          */}
          <div
            className={cn(
              'mt-4 rounded-xl border px-4 py-3.5',
              ob.medicalRequestPending
                ? 'border-sky-200 bg-sky-50/70'
                : ob.medicalLetterSentAt
                  ? 'border-slate-200 bg-white'
                  : 'border-amber-300 bg-amber-50',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  Pre-employment medical test letter
                </p>
                {ob.medicalRequestPending ? (
                  <p className="mt-0.5 text-xs font-medium text-sky-800">
                    Requested
                    {ob.medicalRequestedAt ? ` ${fmt(ob.medicalRequestedAt)}` : ''}.
                    Waiting on Head of Talent Acquisition to set the date and
                    venue and send it.
                  </p>
                ) : ob.medicalLetterSentAt ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {ob.medicalRefNo ? `${ob.medicalRefNo} · ` : ''}
                    {ob.medicalExamAt
                      ? `appointment ${new Date(ob.medicalExamAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`
                      : 'no appointment recorded'}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs font-medium text-amber-800">
                    Not requested yet. The candidate has no appointment and
                    the medical team is not expecting them.
                  </p>
                )}

                {/* Each side separately: "was the candidate actually told?" is
                    the question asked when somebody does not turn up. */}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <SentFlag
                    label="Medical team"
                    at={ob.medicalLetterTeamSentAt}
                  />
                  <SentFlag
                    label="Candidate"
                    at={ob.medicalLetterCandidateSentAt}
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant={
                    ob.medicalLetterSentAt || ob.medicalRequestPending
                      ? 'outline'
                      : 'primary'
                  }
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                  onClick={() => setMedicalRequestOpen(true)}
                >
                  {ob.medicalRequestPending
                    ? 'Edit request'
                    : ob.medicalLetterSentAt
                      ? 'Request again'
                      : 'Request medical test'}
                </Button>
                {/* HoTA may still send one from here; everybody else asks. */}
                {isTalentHead && (
                  <Button
                    size="sm"
                    variant={ob.medicalRequestPending ? 'primary' : 'outline'}
                    leftIcon={<CalendarClock className="h-3.5 w-3.5" />}
                    onClick={() => setMedicalLetterOpen(true)}
                  >
                    Schedule &amp; send
                  </Button>
                )}
              </div>
            </div>
          </div>

          {medicalRequestOpen && (
            <MedicalRequestModal
              onboardingId={ob.id}
              open={medicalRequestOpen}
              onClose={() => setMedicalRequestOpen(false)}
            />
          )}

          {medicalLetterOpen && (
            <MedicalLetterModal
              onboardingId={ob.id}
              open={medicalLetterOpen}
              onClose={() => setMedicalLetterOpen(false)}
            />
          )}

          {ob.medicalStatus === 'pending' && (
            <ManualMedicalRecorder
              onboardingId={ob.id}
              alerted={Boolean(ob.medicalNotifiedAt)}
            />
          )}

          <Hint>
            Normally recorded by the Medical Officer / Team on their clearance
            queue. Use “Record by hand” when the check was done on paper.
          </Hint>
        </>
      ),
    },
    {
      // Step 4 — board approval.
      title: 'Board Approval',
      icon: BadgeCheck,
      lockReason: 'Unlocks after medical clearance.',
      content: (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Board Approval
            </p>
            {isApproved ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-[0.75rem] font-semibold text-emerald-700">Board Approved</p>
                    <p className="text-[0.6875rem] text-emerald-600">
                      {boardApproval?.hrApprovedBy
                        ? `By HR · ${boardApproval.hrApprovedBy.name}`
                        : approvedVotes[0]
                          ? `${approvedVotes[0].member.name}`
                          : 'Approved'}
                    </p>
                  </div>
                </div>
                {boardApproval?.hrApprovedBy && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    {boardApproval.hrApprovalNote && (
                      <p className="text-[0.6875rem] italic leading-relaxed text-slate-600">
                        "{boardApproval.hrApprovalNote}"
                      </p>
                    )}
                    {boardApproval.hrApprovalAttachmentUrl && (
                      <a
                        href={resolveApiFileUrl(boardApproval.hrApprovalAttachmentUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-medium text-brand-600 hover:underline"
                      >
                        <Paperclip className="h-3 w-3" />
                        {boardApproval.hrApprovalAttachmentName ?? 'View attachment'}
                      </a>
                    )}
                    <p className="mt-0.5 text-[0.625rem] text-slate-400">
                      — {boardApproval.hrApprovedBy.name}
                    </p>
                  </div>
                )}
                {!boardApproval?.hrApprovedBy && approvedVotes[0]?.notes && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[0.6875rem] italic leading-relaxed text-slate-600">
                      "{approvedVotes[0].notes}"
                    </p>
                    <p className="mt-0.5 text-[0.625rem] text-slate-400">
                      — {approvedVotes[0].member.name}
                    </p>
                  </div>
                )}
              </div>
            ) : showHrForm ? (
              <div className="mx-auto max-w-md space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-[0.75rem] font-medium transition-colors',
                    hrFile
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-brand-300 hover:bg-brand-50/40',
                  )}
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {hrFile ? hrFile.name : 'Attach approval document (required)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => setHrFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <textarea
                  value={hrNote}
                  onChange={(e) => setHrNote(e.target.value)}
                  rows={2}
                  placeholder="Remarks (optional)…"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowHrForm(false); setHrNote(''); setHrFile(null); }}
                    className="flex-1 rounded-xl border border-slate-200 py-2 text-[0.75rem] font-medium text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={hrApprove.isPending || !hrFile}
                    onClick={confirmHrApprove}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-[0.75rem] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {hrApprove.isPending ? 'Saving…' : 'Confirm'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-md space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center">
                {boardApproval && (
                  <>
                    {/* Where the request actually is. A bare vote tally read as
                        "sent to the board" even while it sat with Head of Talent Acquisition. */}
                    <div className="space-y-1.5 text-left">
                      {(['corporate_hr', 'chro', 'board'] as const).map((stage, i) => {
                        const votes = boardApproval.votes.filter(
                          (v) => v.stage === stage,
                        );
                        const state = boardStageState(boardApproval, stage);
                        const who =
                          stage === 'corporate_hr'
                            ? (boardApproval.corporateHr?.name ?? 'Head of Talent Acquisition')
                            : stage === 'chro'
                              ? (boardApproval.chro?.name ?? 'CHRO')
                              : `${boardApproval.boardMemberCount ?? votes.length} board member(s)`;
                        const title =
                          stage === 'corporate_hr'
                            ? 'Head of Talent Acquisition'
                            : stage === 'chro'
                              ? 'CHRO'
                              : 'Board';
                        return (
                          <div key={stage} className="flex items-center gap-2">
                            <span
                              className={cn(
                                'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[0.5625rem] font-bold',
                                state === 'approved' && 'bg-emerald-500 text-white',
                                state === 'rejected' && 'bg-rose-500 text-white',
                                state === 'waiting' && 'bg-amber-400 text-white',
                                state === 'upcoming' && 'bg-slate-200 text-slate-500',
                              )}
                            >
                              {state === 'approved' ? '✓' : state === 'rejected' ? '✕' : i + 1}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[0.6875rem] text-slate-600">
                              <span className="font-medium text-slate-700">{title}</span>
                              <span className="text-slate-400"> · {who}</span>
                            </span>
                            <span
                              className={cn(
                                'shrink-0 text-[0.625rem] font-medium',
                                state === 'approved' && 'text-emerald-600',
                                state === 'rejected' && 'text-rose-600',
                                state === 'waiting' && 'text-amber-600',
                                state === 'upcoming' && 'text-slate-400',
                              )}
                            >
                              {state === 'approved'
                                ? 'Approved'
                                : state === 'rejected'
                                  ? 'Rejected'
                                  : state === 'waiting'
                                    ? 'Awaiting'
                                    : 'Not yet sent'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {boardApproval.status === 'rejected' &&
                      boardApproval.rejectedReason && (
                        <p className="rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-left text-[0.625rem] leading-4 text-rose-700">
                          <strong>Rejected:</strong> {boardApproval.rejectedReason}
                        </p>
                      )}
                  </>
                )}
                {!boardApproval && (
                  <p className="text-[0.6875rem] text-slate-400">
                    Board approval is required before final verification.
                  </p>
                )}
                {boardOnSheet && (
                  <p className="rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-1.5 text-left text-[0.6875rem] leading-4 text-sky-700">
                    On a Hiring Approval Sheet with the{' '}
                    {boardApproval?.currentStage === 'chro' ? 'CHRO' : 'board'} — Head of
                    Talent Acquisition follows it up from here.
                  </p>
                )}
                <div className="flex gap-2">
                  {!boardOnSheet && (
                    <button
                      type="button"
                      onClick={() => sendBoard.mutate()}
                      disabled={sendBoard.isPending}
                      title="Goes to Head of Talent Acquisition, who puts it on a Hiring Approval Sheet and chooses the CHRO and board"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Send className="h-3.5 w-3.5 text-brand-500" />
                      {sendBoard.isPending
                        ? 'Sending…'
                        : !boardApproval
                          ? 'Send for Board Approval'
                          : boardApproval.status === 'rejected'
                            ? 'Send again'
                            : 'Remind HoTA'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowHrForm(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-[0.75rem] font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    HR Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      // Step 5 — the offer letter, once the board has approved the hire, and
      // then the facilities that letter commits the company to.
      title: 'Offer Letter & Facility Provisioning',
      icon: FileSignature,
      lockReason: 'Unlocks after Board Approval.',
      content: (
        <div className="space-y-5">
          <div
            className={
              result.candidate.facilities
                ? 'border-t border-slate-100 pt-5'
                : undefined
            }
          >
            {!ob.offerAcceptedAt && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Candidate already confirmed by hand?
                  </p>
                  <p className="text-xs text-slate-500">
                    If they accepted in person or by phone, mark it here
                    instead of waiting on the online link.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={markOfferAccepted.isPending}
                  onClick={() => markOfferAccepted.mutate(undefined)}
                >
                  Checked by Manual on hand
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                {ob.offerAcceptedAt ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="success">Accepted {fmt(ob.offerAcceptedAt)}</Badge>
                    {ob.offerJoiningTentative && (
                      <Badge tone="info">
                        Joining ~ {fmt(ob.offerJoiningTentative)}
                      </Badge>
                    )}
                  </span>
                ) : ob.offerDeclinedAt ? (
                  <Badge tone="danger">Declined {fmt(ob.offerDeclinedAt)}</Badge>
                ) : ob.offerSentAt ? (
                  <Badge tone="info">
                    Sent {fmt(ob.offerSentAt)} · awaiting candidate
                  </Badge>
                ) : (
                  <span className="text-slate-500">
                    Preview and send the offer letter to the candidate.
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {ob.offerFormat && (
                  <Badge tone="neutral">
                    {ob.offerFormat === 'senior' ? 'Senior' : 'Junior / Mid'} format
                  </Badge>
                )}
                {/* Composing and sending are one action: the format changes
                    which terms the letter carries, so there is nothing to
                    send until those are chosen. */}
                <Button
                  disabled={noEmail}
                  title={emailHint}
                  leftIcon={<FileText className="h-4 w-4" />}
                  onClick={() => setOfferLetterOpen(true)}
                >
                  {ob.offerSentAt ? 'Review / resend letter' : 'Prepare offer letter'}
                </Button>
              </div>
            </div>
            {!result.pdfReady && !ob.offerSentAt && (
              <Hint tone="amber">
                Letters cannot be rendered as PDFs on this server right now, so
                the offer will be sent in the body of the email instead of
                attached. It still reaches the candidate — ask IT to install the
                PDF browser to restore the attachment.
              </Hint>
            )}
            {/* The candidate's answer, written out. A decline has always shown
                its reason here; an acceptance showed only a badge, so the two
                halves of the same decision read as different kinds of event —
                and the signed copies sat in the database unreferenced. */}
            {ob.offerAcceptedAt && (
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-emerald-700">
                  Candidate accepted this offer
                </p>
                <p className="mt-1 text-sm text-emerald-900">
                  Accepted {fmt(ob.offerAcceptedAt)}
                  {ob.offerJoiningTentative
                    ? `, expecting to join on ${fmt(ob.offerJoiningTentative)}.`
                    : '. No joining date was given.'}
                </p>
                {/* Two different documents, so both are offered by name: one
                    this system counter-signed at the moment they accepted,
                    one they scanned and posted back. */}
                <div className="mt-2 flex flex-wrap gap-3">
                  {ob.offerAcceptedUrl && (
                    <a
                      href={resolveApiFileUrl(ob.offerAcceptedUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      <FileSignature className="h-3.5 w-3.5" />
                      Accepted offer (signed online)
                    </a>
                  )}
                  {ob.offerSignedUrl && (
                    <a
                      href={resolveApiFileUrl(ob.offerSignedUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Signed copy returned by the candidate
                    </a>
                  )}
                </div>
                {!ob.offerAcceptedUrl && !ob.offerSignedUrl && (
                  <p className="mt-1.5 text-[0.6875rem] text-emerald-600">
                    No signed document on file — they accepted without a
                    signature, or HR recorded the acceptance by hand.
                  </p>
                )}
              </div>
            )}
            {ob.offerDeclinedAt && !ob.offerAcceptedAt && (
              <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-rose-700">
                  Candidate declined this offer
                </p>
                <p className="mt-1 text-sm text-rose-800">
                  {ob.offerDeclineReason
                    ? `“${ob.offerDeclineReason}”`
                    : 'No reason was recorded.'}
                </p>
                <p className="mt-1.5 text-[0.6875rem] text-rose-500">
                  Sending a revised offer clears this and puts the decision back
                  to them.
                </p>
              </div>
            )}
            {noEmail ? (
              <Hint>{emailHint}</Hint>
            ) : (
              !allVerified &&
              !ob.offerSentAt &&
              ob.docs.length > 0 && (
                <Hint tone="amber">
                  Tip: verify all documents before sending the offer.
                </Hint>
              )
            )}
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Facility Provisioning
            </p>
            <FacilityProvisioningPanel
              candidateId={candidateId}
              canEdit={canEditFacilities}
            />
          </div>
        </div>
      ),
    },
    {
      // Step 5 — final verification then IT provisioning/completion.
      title: 'Final Verification & Complete Onboarding',
      icon: FolderArchive,
      lockReason: 'Unlocks once the candidate accepts the offer.',
      content: (
        <div className="space-y-6">
          {/* The placement. Its own section because it is not a document or a
              decision — it is where this person lands: the number the rest of
              the file is filed under, and who they report to. */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Placement
            </p>
            <PlacementPanel
              candidateId={candidateId}
              candidate={result.candidate}
              canEdit={canEditFacilities}
            />
          </div>

          {/* The Code of Conduct sits with final verification: it is the last
              thing the candidate signs, and HR wants it in the file before the
              hire is closed. */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Code of Conduct
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                {ob.cocSignedAt ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="success">Signed {fmt(ob.cocSignedAt)}</Badge>
                    {ob.cocUrl && (
                      <a
                        href={resolveApiFileUrl(ob.cocUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open signed form
                      </a>
                    )}
                  </div>
                ) : ob.cocSentAt ? (
                  <Badge tone="info">
                    Sent {fmt(ob.cocSentAt)} · awaiting signature
                  </Badge>
                ) : (
                  <span className="text-slate-500">
                    Send the acknowledgement for the candidate to read and sign.
                  </span>
                )}
              </div>
              {!ob.cocSignedAt && (
                <Button
                  variant={ob.cocSentAt ? 'outline' : 'primary'}
                  disabled={noEmail}
                  title={emailHint}
                  isLoading={sendCoc.isPending}
                  leftIcon={<FileSignature className="h-4 w-4" />}
                  onClick={() => sendCoc.mutate(undefined)}
                >
                  {ob.cocSentAt ? 'Resend CoC' : 'Send CoC'}
                </Button>
              )}
            </div>
            {!result.pdfReady && (
              <Hint tone="amber">
                The signed form cannot be produced as a PDF on this server right
                now. The candidate&rsquo;s acknowledgement is still recorded —
                the form can be filed once the PDF browser is installed.
              </Hint>
            )}
            {ob.cocSentAt && !ob.cocSignedAt && (
              <Hint>
                The candidate signs it on their own onboarding page by uploading
                a picture of their signature. It is filed with their joining
                documents once they do.
              </Hint>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Final verification
            </p>
            {!ob.hrVerifiedAt ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-slate-500">
                  Confirm all records are in order and sign off this hire.
                </span>
                <Button
                  leftIcon={<UserCheck className="h-4 w-4" />}
                  onClick={() => setVerifyConfirmOpen(true)}
                >
                  HR verify
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                    <Check className="h-4 w-4" strokeWidth={3} />
                    Verified {fmt(ob.hrVerifiedAt)}
                  </span>
                  {ob.archivedAt && (
                    <Badge tone="info">Archived {fmt(ob.archivedAt)}</Badge>
                  )}
                </div>

                {/* The archived file, to read.
                    The Drive folder is private to the recruitment account —
                    it holds national IDs, certificates and photographs, and
                    publishing it would give every one of them a permanent
                    unauthenticated URL. So HR reads the file here instead:
                    every document, view only, nothing to replace or delete. */}
                {ob.archivedAt && <ArchivedFileList candidateId={candidateId} />}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    leftIcon={<Printer className="h-4 w-4" />}
                    onClick={() => printOnboardingSummary(result, timeline ?? [])}
                  >
                    Print full record
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<FileText className="h-4 w-4" />}
                    onClick={() => void printShortCandidateSummary(result)}
                  >
                    1-page summary
                  </Button>
                  {!ob.archivedAt && (
                    <Button
                      isLoading={archive.isPending}
                      title="Moves the joining documents to the Drive archive"
                      leftIcon={<FolderArchive className="h-4 w-4" />}
                      onClick={() => archive.mutate(undefined)}
                    >
                      Archive docs
                    </Button>
                  )}
                </div>
                {!ob.archivedAt && (
                  <Hint>
                    Print the summary for the hard-copy personnel file, then
                    archive — the joining documents move into “00 Archive” on
                    Drive.
                  </Hint>
                )}
              </div>
            )}
          </div>

          {/* The appointment letter closes out what the offer promised, and it
              belongs with verification rather than in a step of its own —
              nobody is provisioned before their appointment is confirmed. */}
          <div className="border-t border-slate-100 pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Appointment letter
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                {ob.appointmentSentAt ? (
                  <Badge tone="success">
                    Issued {fmt(ob.appointmentSentAt)}
                    {ob.appointmentRef ? ` · ${ob.appointmentRef}` : ''}
                  </Badge>
                ) : !ob.hrVerifiedAt ? (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Lock className="h-4 w-4 shrink-0" /> Complete final
                    verification above first.
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Confirm the appointment in writing, as the offer letter
                    promised.
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                disabled={noEmail || !ob.hrVerifiedAt}
                title={
                  noEmail
                    ? emailHint
                    : !ob.hrVerifiedAt
                      ? 'Complete the final verification first'
                      : undefined
                }
                leftIcon={<Stamp className="h-4 w-4" />}
                onClick={() => setAppointmentOpen(true)}
              >
                {ob.appointmentSentAt
                  ? 'Review / reissue letter'
                  : 'Prepare appointment letter'}
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              IT provisioning &amp; completion
            </p>
            {!ob.hrVerifiedAt ? (
              <p className="flex items-center gap-1.5 text-sm text-slate-400">
                <Lock className="h-4 w-4 shrink-0" /> Complete final verification above first.
              </p>
            ) : ob.itNotifiedAt ? (
              <div className="space-y-3">
                <Badge tone="success">Onboarded {fmt(ob.itNotifiedAt)}</Badge>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <Mail className="h-4 w-4 shrink-0 text-brand-500" />
                  <div className="min-w-0">
                    <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-400">Work email</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{ob.itEmail || '—'}</p>
                  </div>
                </div>
                {/* Provisioning checklist */}
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {[
                    { key: 'email', label: 'Work email account created', done: Boolean(ob.itEmail) },
                  ].map(({ key, label, done: d }) => (
                    <div key={key} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          d
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 text-transparent',
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className={cn('flex-1', d ? 'text-slate-700' : 'text-slate-500')}>{label}</span>
                      {d && <span className="text-[0.6875rem] font-medium text-emerald-600">Completed</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  {itWebhook
                    ? "Fires the IT webhook with the new hire's details; the issued email is written back automatically."
                    : 'Enter the work email issued by the IT team.'}
                </p>
                {/* Provisioning items visual checklist */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 divide-y divide-slate-100">
                  {[
                    { label: 'Work email account', icon: Mail, field: 'email' },
                    { label: 'Access card', icon: ShieldCheck, field: null },
                  ].map(({ label, icon: Icon, field }) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="flex-1 text-sm text-slate-600">{label}</span>
                      {field === 'email' ? (
                        <input
                          type="email"
                          placeholder="name@dbl-group.com"
                          value={itEmail}
                          onChange={(e) => setItEmail(e.target.value)}
                          className="w-48 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        />
                      ) : (
                        <span className="text-[0.6875rem] text-slate-400">Handled by IT team</span>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  isLoading={notifyIt.isPending}
                  disabled={!ob.hrVerifiedAt || !isBoardApproved}
                  title={
                    !isBoardApproved
                      ? 'Board Approval is required before onboarding can be completed'
                      : !ob.hrVerifiedAt
                        ? 'Complete HR verification first'
                        : undefined
                  }
                  leftIcon={<Mail className="h-4 w-4" />}
                  onClick={() =>
                    notifyIt.mutate({
                      email: itEmail || undefined,
                    })
                  }
                >
                  Notify IT &amp; complete onboarding
                </Button>
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  const active = stages[activeStage];
  const activeState = stateOf(activeStage);
  const activeLocked = activeState === 'locked';
  const ActiveIcon = active.icon;

  return (
    <div>
      {/* Offer letter modal */}
      <OfferLetterModal
        candidate={result.candidate}
        onboarding={ob}
        open={offerLetterOpen}
        onClose={() => setOfferLetterOpen(false)}
      />
      <AppointmentLetterModal
        candidate={result.candidate}
        onboarding={ob}
        open={appointmentOpen}
        onClose={() => setAppointmentOpen(false)}
      />

      {/* HR verify — summary + confirmation before the final, hard-to-undo sign-off
          (it also auto-rejects every other applicant still in this requisition's pipeline). */}
      <HrVerifyModal
        open={verifyConfirmOpen}
        onClose={() => setVerifyConfirmOpen(false)}
        candidateName={result.candidate.name}
        docsSettled={docsSettled}
        missingDocs={ob.missingDocs}
        pendingDocs={ob.pendingDocs}
        notify={{
          onClick: () => chaseDocs.mutate(),
          isPending: chaseDocs.isPending,
          unavailable: noEmail ? emailHint : undefined,
        }}
        skip={{
          isPending: skipDocs.isPending || skipVerification.isPending,
          // Two waivers, because there are two ways a file can be short:
          // documents never collected, and documents collected but not
          // ticked off. Whichever is outstanding is what gets recorded.
          onClick: () => {
            if (ob.missingDocs.length > 0) skipDocs.mutate(undefined);
            if (ob.pendingDocs.length > 0) skipVerification.mutate(undefined);
          },
        }}
        confirm={{
          isPending: hrVerify.isPending,
          onClick: () =>
            hrVerify.mutate(undefined, {
              onSuccess: () => setVerifyConfirmOpen(false),
            }),
        }}
        checks={[
          {
            label: 'Documents',
            ok: docsSettled,
            detail:
              ob.docsSkippedAt || ob.verificationSkippedAt
                ? 'Checked manually on hand'
                : docsSettled
                  ? `${ob.docs.length} verified`
                  : ob.missingDocs.length > 0
                    ? `${ob.missingDocs.length} not collected`
                    : `${ob.pendingDocs.length} not verified`,
          },
          // The server refuses without one, so it belongs on the list of
          // reasons the button is about to say no.
          {
            label: 'Reference checks',
            ok: refCount > 0 || Boolean(ob.docsSkippedAt),
            detail: ob.docsSkippedAt
              ? 'Checked manually on hand'
              : refCount > 0
                ? `${refCount} recorded`
                : 'None recorded',
          },
          {
            label: 'NID details',
            ok: nidComplete || Boolean(ob.docsSkippedAt),
            detail: ob.docsSkippedAt
              ? 'Checked manually on hand'
              : nidComplete
                ? 'All four supplied'
                : 'Incomplete',
          },
          {
            label: 'Offer',
            ok: Boolean(ob.offerAcceptedAt),
            detail: ob.offerAcceptedAt
              ? `Accepted ${fmt(ob.offerAcceptedAt)}`
              : 'Not accepted yet',
          },
          {
            label: 'Medical',
            ok: ob.medicalStatus === 'cleared',
            detail:
              ob.medicalStatus === 'cleared'
                ? `Cleared ${fmt(ob.medicalClearedAt)}${ob.medicalManual ? ' · by hand' : ''}`
                : 'Not cleared',
          },
          {
            label: 'Code of Conduct',
            ok: Boolean(ob.cocSignedAt),
            detail: ob.cocSignedAt
              ? `Signed ${fmt(ob.cocSignedAt)}`
              : ob.cocSentAt
                ? 'Sent · not signed yet'
                : 'Not sent',
          },
          {
            label: 'Board approval',
            ok: isApproved,
            detail: isApproved ? 'Approved' : 'Not approved',
          },
          {
            label: 'Facility provisioning',
            ok:
              !provisioning ||
              provisioning.items.every((i) => i.recipients.length > 0),
            detail:
              !provisioning || provisioning.items.length === 0
                ? 'Nothing to arrange'
                : `${provisioning.items.filter((i) => Boolean(i.confirmedAt)).length}/${provisioning.items.length} arranged`,
          },
        ]}
      />

      {/* Detail panel — only the stage selected in the header stepper above ("part
          by part" instead of all 5 stages at once). Keyed by activeStage so
          switching stages remounts it and replays the entrance animation. */}
      <div
        key={activeStage}
        className={cn(
          'animate-rise-in min-w-0 overflow-hidden rounded-2xl border border-slate-200 border-t-4 bg-white shadow-sm',
          STATE_ACCENT[activeState],
        )}
      >
        <div className="flex flex-wrap items-start gap-3 p-5 sm:p-6">
          <span
            className={cn(
              'animate-fade-in flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform',
              STATE_BADGE[activeState],
            )}
          >
            <ActiveIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-400">
              Step {activeStage + 1} of {stages.length}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h2
                className={cn(
                  'text-lg font-semibold',
                  activeLocked ? 'text-slate-400' : 'text-slate-800',
                )}
              >
                {active.title}
              </h2>
              {activeState === 'current' && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-brand-700">
                  In progress
                </span>
              )}
              {activeState === 'done' && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-emerald-700">
                  Done
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
          {activeLocked ? (
            <p className="flex items-center gap-1.5 text-sm text-slate-400">
              <Lock className="h-4 w-4 shrink-0" /> {active.lockReason}
            </p>
          ) : (
            active.content
          )}
        </div>
      </div>
    </div>
  );
}

function ContactBlock({
  candidateId,
  reqId,
  email,
  phone,
}: {
  candidateId: string;
  reqId: string;
  email: string;
  phone: string;
}) {
  const qc = useQueryClient();
  const update = useUpdateCandidate(reqId);
  const [editing, setEditing] = useState(!email);
  const [draft, setDraft] = useState(email);

  const save = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.trim())) {
      toast.error('Enter a valid email address');
      return;
    }
    update.mutate(
      { id: candidateId, input: { email: draft.trim() } },
      {
        onSuccess: () => {
          qc.invalidateQueries({
            queryKey: onboardingKeys.candidate(candidateId),
          });
          setEditing(false);
        },
      },
    );
  };

  return (
    <div className="space-y-1 text-sm">
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="email"
            value={draft}
            placeholder="name@example.com"
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={save}
            disabled={update.isPending}
            className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(email);
            setEditing(true);
          }}
          className="flex items-center gap-1.5 font-medium text-brand-600 hover:underline"
          title="Edit email"
        >
          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{email}</span>
        </button>
      )}
      {phone && <p className="text-slate-500">{phone}</p>}
      {!email && !editing && (
        <p className="text-xs text-amber-600">
          Add an email to send the offer
        </p>
      )}
    </div>
  );
}

type StageState = 'done' | 'current' | 'open' | 'locked';

const CC_TONE: Record<CrossCheckVerdict, BadgeTone> = {
  consistent: 'success',
  minor_issues: 'warning',
  discrepancies: 'danger',
};
const CC_LABEL: Record<CrossCheckVerdict, string> = {
  consistent: 'Consistent',
  minor_issues: 'Minor issues',
  discrepancies: 'Discrepancies found',
};
const SEV_DOT: Record<CrossCheckSeverity, string> = {
  info: 'bg-sky-400',
  warning: 'bg-amber-400',
  critical: 'bg-rose-500',
};

const VERDICT_OPTIONS: { value: CrossCheckVerdict; label: string }[] = [
  { value: 'consistent', label: 'Consistent' },
  { value: 'minor_issues', label: 'Minor issues' },
  { value: 'discrepancies', label: 'Discrepancies' },
];

/** Cross-verification of all documents vs the candidate's profile — AI-assisted when configured, or a manual HR verdict either way. */
function CrossCheckPanel({
  candidateId,
  ob,
  aiOn,
}: {
  candidateId: string;
  ob: OnboardingView;
  aiOn: boolean;
}) {
  const check = useCrossCheck(candidateId);
  const manualCheck = useManualCrossCheck(candidateId);
  const cc = ob.crossCheck;
  const isManual = cc?.source === 'manual';
  const extracted = ob.docs.filter((d) => d.aiExtract).length;

  const [reviewing, setReviewing] = useState(false);
  const [verdict, setVerdict] = useState<CrossCheckVerdict>('minor_issues');
  const [note, setNote] = useState('');

  const skip = () => manualCheck.mutate({ verdict: 'consistent' });

  const saveManual = () => {
    manualCheck.mutate(
      { verdict, note: note.trim() || undefined },
      { onSuccess: () => { setReviewing(false); setNote(''); } },
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {cc?.verdict === 'discrepancies' ? (
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500" />
        ) : (
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
        )}
        <span className="flex-1 text-sm font-semibold text-slate-700">
          Document verification
        </span>
        {cc && (
          <Badge tone={CC_TONE[cc.verdict] ?? 'warning'}>
            {CC_LABEL[cc.verdict] ?? cc.verdict}
          </Badge>
        )}
        {aiOn && (
          <Button
            size="sm"
            variant="outline"
            isLoading={check.isPending}
            disabled={extracted === 0}
            title={
              extracted === 0
                ? 'Run AI scan on at least one document first'
                : undefined
            }
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            onClick={() => check.mutate(undefined)}
          >
            {cc && !isManual ? 'Re-check' : 'AI cross-check'}
          </Button>
        )}
        {!cc && (
          <Button
            size="sm"
            variant="outline"
            isLoading={manualCheck.isPending && !reviewing}
            leftIcon={<Check className="h-3.5 w-3.5" />}
            onClick={skip}
          >
            Skip — verify manually
          </Button>
        )}
      </div>

      {!reviewing && (
        <button
          type="button"
          onClick={() => setReviewing(true)}
          className="mt-1.5 text-xs font-medium text-brand-600 hover:underline"
        >
          {isManual ? 'Edit manual review' : cc ? 'Add a manual note' : 'Report an issue instead'}
        </button>
      )}

      {reviewing && (
        <div className="mt-3 space-y-2.5 rounded-lg border border-brand-100 bg-white p-3">
          <div className="flex flex-wrap gap-1.5">
            {VERDICT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setVerdict(o.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  verdict === o.value
                    ? CC_TONE[o.value] === 'success'
                      ? 'bg-emerald-600 text-white'
                      : CC_TONE[o.value] === 'warning'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Notes (optional)…"
            className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="text-xs font-medium text-slate-500 hover:underline"
            >
              Cancel
            </button>
            <Button size="sm" isLoading={manualCheck.isPending} onClick={saveManual}>
              Save review
            </Button>
          </div>
        </div>
      )}

      {!cc ? (
        <p className="mt-2 text-xs text-slate-400">
          Checks every document against the candidate&rsquo;s profile and
          against each other — names, dates and credentials.
          {aiOn
            ? extracted === 0 && ' Run an AI scan on the documents first, or skip and verify manually.'
            : ' Not configured for AI — use "Skip — verify manually" above.'}
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {cc.overview && (
            <p className="text-xs text-slate-600">{cc.overview}</p>
          )}
          {cc.findings.length > 0 && (
            <ul className="space-y-1.5">
              {cc.findings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span
                    className={cn(
                      'mt-1 h-2 w-2 shrink-0 rounded-full',
                      SEV_DOT[f.severity] ?? 'bg-amber-400',
                    )}
                  />
                  <span className="text-slate-600">
                    <span className="font-medium text-slate-700">{f.doc}:</span>{' '}
                    {f.detail}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {ob.crossCheckedAt && (
            <p className="text-[0.6875rem] text-slate-400">
              {isManual
                ? `Manually reviewed by ${cc.reviewedBy} · ${fmt(ob.crossCheckedAt)}`
                : `Checked ${fmt(ob.crossCheckedAt)} — advisory only; verify originals before final sign-off.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DocRow({
  candidateId,
  doc,
  aiOn,
  flag,
}: {
  candidateId: string;
  doc: OnboardingDoc;
  aiOn: boolean;
  flag?: CrossCheckSeverity;
}) {
  // Each row owns its mutations so several can scan/verify at the same time.
  const summarize = useSummarizeDoc(candidateId);
  const verify = useVerifyDoc(candidateId);
  const summarizing = summarize.isPending;
  const verifying = verify.isPending;
  const onSummarize = () => summarize.mutate(doc.id);
  const onVerify = (status: string) => verify.mutate({ docId: doc.id, status });

  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={resolveApiFileUrl(doc.url)}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-slate-800 hover:text-brand-600"
        >
          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{doc.label}</span>
        </a>
        {flag && flag !== 'info' && (
          <Badge tone={flag === 'critical' ? 'danger' : 'warning'}>
            <ShieldAlert className="mr-1 h-3 w-3" />
            {flag === 'critical' ? 'Discrepancy' : 'Check'}
          </Badge>
        )}
        <Badge tone={DOC_TONE[doc.status]}>{doc.status}</Badge>
        {aiOn && (
          <Button
            size="sm"
            variant="ghost"
            isLoading={summarizing}
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            onClick={onSummarize}
          >
            {doc.aiExtract ? 'Re-scan' : 'AI scan'}
          </Button>
        )}
        <button
          type="button"
          title="Mark verified"
          disabled={verifying}
          onClick={() => onVerify('verified')}
          className="rounded p-1.5 text-emerald-500 hover:bg-emerald-50 disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Reject"
          disabled={verifying}
          onClick={() => onVerify('rejected')}
          className="rounded p-1.5 text-rose-400 hover:bg-rose-50 disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {doc.aiExtract && (doc.aiExtract.summary || doc.aiExtract.fields) && (
        <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
          {doc.aiExtract.summary && (
            <p className="text-xs italic text-slate-500">{doc.aiExtract.summary}</p>
          )}
          {doc.aiExtract.fields &&
            Object.keys(doc.aiExtract.fields).length > 0 && (
              <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                {Object.entries(doc.aiExtract.fields).map(([k, v]) => (
                  <div key={k} className="flex gap-1.5 text-xs">
                    <span className="shrink-0 text-slate-400">{k}:</span>
                    <span className="truncate font-medium text-slate-600">{v}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function Hint({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'amber';
}) {
  return (
    <p
      className={cn(
        'mt-2 text-xs',
        tone === 'amber' ? 'text-amber-600' : 'text-slate-400',
      )}
    >
      {children}
    </p>
  );
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
    >
      <ArrowLeft className="h-4 w-4" /> Back to {label}
    </Link>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function MedicalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.625rem] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate font-medium text-slate-700">{value || '—'}</p>
    </div>
  );
}

/**
 * Assign the DBL employee ID.
 *
 * Saved explicitly rather than on blur: it is an identifier that will be
 * printed on forms and used to file a personnel record, so a stray keystroke
 * should not be able to commit one.
 */
/**
 * The placement: the number this hire is filed under, and who they report to.
 *
 * One panel with one save, because the two are decided in the same
 * conversation and a file with an ID and no reporting line is a file somebody
 * has to come back to. The manager is picked from the synced directory rather
 * than typed — "Kamal Hosen" spelled three ways across three hires is not a
 * reporting line anyone can report on — and is stored as a name/code snapshot
 * so a manager leaving does not rewrite who this person was placed under.
 */
function PlacementPanel({
  candidateId,
  candidate,
  canEdit,
}: {
  candidateId: string;
  candidate: OnboardingCandidate;
  canEdit: boolean;
}) {
  const save = useSetPlacement(candidateId);
  const [employeeId, setEmployeeId] = useState(candidate.employeeId ?? '');
  const [manager, setManager] = useState<PickedEmployee | null>(
    candidate.lineManagerName
      ? {
          name: candidate.lineManagerName,
          employeeCode: candidate.lineManagerCode ?? '',
          jobTitle: candidate.lineManagerTitle ?? '',
        }
      : null,
  );

  useEffect(() => {
    setEmployeeId(candidate.employeeId ?? '');
    setManager(
      candidate.lineManagerName
        ? {
            name: candidate.lineManagerName,
            employeeCode: candidate.lineManagerCode ?? '',
            jobTitle: candidate.lineManagerTitle ?? '',
          }
        : null,
    );
  }, [candidate.employeeId, candidate.lineManagerName, candidate.lineManagerCode, candidate.lineManagerTitle]);

  if (!canEdit) {
    return (
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <PlacementReadRow label="Employee ID" value={candidate.employeeId} />
        <PlacementReadRow
          label="Line manager"
          value={
            candidate.lineManagerName
              ? [candidate.lineManagerName, candidate.lineManagerCode]
                  .filter(Boolean)
                  .join(' · ')
              : null
          }
        />
      </dl>
    );
  }

  const dirty =
    employeeId.trim() !== (candidate.employeeId ?? '') ||
    (manager?.name ?? '') !== (candidate.lineManagerName ?? '');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Employee ID
          </label>
          <Input
            value={employeeId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmployeeId(e.target.value)
            }
            placeholder="e.g. 15107556"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Printed on the Code of Conduct and used across this file.
          </p>
        </div>
        <div>
          <EmployeePicker
            label="Line manager"
            value={manager?.name ?? ''}
            onPick={setManager}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            {manager?.employeeCode || manager?.jobTitle
              ? [manager.employeeCode, manager.jobTitle]
                  .filter(Boolean)
                  .join(' · ')
              : 'Who this hire reports to. Searched from the employee directory.'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-400">
          Saved together and carried onto the printed hiring record.
        </p>
        <Button
          size="sm"
          disabled={!dirty || !employeeId.trim()}
          isLoading={save.isPending}
          onClick={() =>
            save.mutate({
              employeeId: employeeId.trim(),
              // An empty name clears the snapshot server-side, which is how
              // a manager picked by mistake is removed.
              lineManagerName: manager?.name ?? '',
              lineManagerCode: manager?.employeeCode || undefined,
              lineManagerTitle: manager?.jobTitle || undefined,
            })
          }
        >
          {candidate.employeeId ? 'Update placement' : 'Save placement'}
        </Button>
      </div>
    </div>
  );
}

function PlacementReadRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-700">
        {value || <span className="text-slate-400">Not set yet</span>}
      </dd>
    </div>
  );
}

/**
 * Documents grouped into the checklist sections they belong to.
 *
 * Section order follows the catalogue, so HR reads them in the same order
 * the candidate was asked for them. Anything with no key — filed before the
 * catalogue existed, or restored from an old backup — lands in "Other" at
 * the end rather than disappearing.
 */
function groupDocsBySection(
  docs: OnboardingDoc[],
  sections: DocSectionSpec[],
  catalogue: JoiningDocSpec[],
): { key: string; label: string; docs: OnboardingDoc[] }[] {
  const sectionOf = new Map(catalogue.map((d) => [d.key, d.section]));
  const out = sections.map((sec) => ({
    key: sec.key as string,
    label: sec.label,
    docs: docs.filter((d) => d.docKey && sectionOf.get(d.docKey) === sec.key),
  }));
  const placed = new Set(out.flatMap((g) => g.docs.map((d) => d.id)));
  const rest = docs.filter((d) => !placed.has(d.id));
  if (rest.length) out.push({ key: 'other', label: 'Other documents', docs: rest });
  return out.filter((g) => g.docs.length > 0);
}

/**
 * The archived joining file, to read.
 *
 * Archiving moves the candidate's folder into "00 Archive" on Drive, and that
 * folder is private to the recruitment Google account — it holds national
 * IDs, certificates and photographs, and sharing it "anyone with the link"
 * would give each of those a permanent unauthenticated URL. So the file is
 * read here: everything in it, no restriction on who among the people the API
 * already lets through may look, and nothing to replace or delete. An archive
 * that can be edited is not an archive.
 */
function ArchivedFileList({ candidateId }: { candidateId: string }) {
  const { data, isLoading } = useArchiveFiles(candidateId, true);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening the archived
        file…
      </p>
    );
  }
  if (!data?.archived) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <FolderArchive className="h-4 w-4 shrink-0 text-slate-400" />
          Archived documents
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
          <Lock className="h-3 w-3" />
          View only
        </span>
      </div>

      {data.files.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Nothing was filed on Drive — this hire was archived as a record only.
        </p>
      ) : (
        <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
          {data.files.map((f) => (
            <li key={f.id}>
              <a
                href={f.url ? resolveApiFileUrl(f.url) : undefined}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {f.name}
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
