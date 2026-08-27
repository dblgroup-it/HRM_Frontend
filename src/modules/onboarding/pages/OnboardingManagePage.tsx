import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  ExternalLink,
  FileText,
  FolderArchive,
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
  Modal,
  type BadgeTone,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatCurrency } from '@shared/utils';
import { ROUTES } from '@app/router/paths';
import { useUpdateCandidate } from '@modules/candidates';
import {
  SendApprovalModal,
  useBoardApprovalStatus,
  useHrBoardApprove,
} from '@modules/board';
import { useMyPermissions } from '@modules/rbac';
import { FacilitiesPanel } from '@modules/requisition';
import { OfferLetterModal } from '../components/OfferLetterModal';
import { FacilityProvisioningPanel } from '../components/FacilityProvisioningPanel';

import { useFacilityProvisioning } from '../hooks/useFacilityProvisioning';
import { onboardingKeys } from '../hooks/useOnboarding';
import {
  useArchiveOnboarding,
  useCrossCheck,
  useManualCrossCheck,
  useHrVerify,
  useMarkOfferAcceptedManually,
  useMedicalExam,
  useNotifyIt,
  useOnboarding,
  useSendOffer,
  useSendOnboardingLink,
  useSkipDocs,
  useSkipVerification,
  useStartOnboarding,
  useSummarizeDoc,
  useVerifyDoc,
} from '../hooks/useOnboarding';
import type {
  CrossCheckSeverity,
  CrossCheckVerdict,
  DocStatus,
  OnboardingDoc,
  OnboardingResult,
  OnboardingView,
} from '../types/onboarding.types';
import { printMedicalReport } from '../utils/printMedicalReport';
import { printOnboardingSummary } from '../utils/printSummary';

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

/** 5 stages, header dots and Flow's detail panel are now 1:1. */
const STAGES = [
  'Documents',
  'Facilities & Offer',
  'Medical',
  'Board & Provisioning',
  'Complete',
];

export default function OnboardingManagePage() {
  const { candidateId = '' } = useParams();
  const { data, isLoading, isError } = useOnboarding(candidateId);
  const { data: perms } = useMyPermissions();
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
  // 5 stages: (0) Documents — collection & verification, (1) Facility
  // Requirements & Offer letter, (2) Medical, (3) Board Approval & Facility
  // Provisioning, (4) Final verification & complete onboarding. Step 3 only
  // counts as done once BOTH board approval and facility provisioning are
  // settled — approval alone used to jump the flow straight to "Complete"
  // before provisioning was even looked at.
  const doneFlags = ob
    ? [
        docsCollected && allVerified,
        Boolean(ob.offerAcceptedAt),
        ob.medicalStatus === 'cleared',
        isBoardApproved && provisioningDone,
        Boolean(ob.itNotifiedAt),
      ]
    : [false, false, false, false, false];
  const lockedFlags = ob
    ? [
        false,
        false,
        !ob.offerAcceptedAt,
        ob.medicalStatus !== 'cleared',
        !isBoardApproved || !provisioningDone,
      ]
    : [false, false, false, false, false];
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
  const unitLower = c.unit.toLowerCase();
  const canEditFacilities =
    !!perms?.isSuperUser ||
    (perms?.roles ?? []).some(
      (r) =>
        (r.key === 'corporate_hr' || r.key === 'chro') &&
        (r.unitId === null || (r.unitName ?? '').toLowerCase() === unitLower),
    );

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
                      'relative flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-all duration-300',
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
                      'mt-1 hidden text-[10px] transition-colors sm:block',
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
            onClick={() => printOnboardingSummary(result)}
          >
            Print summary
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-center"
            leftIcon={<Copy className="h-4 w-4" />}
            onClick={copyLink}
          >
            Copy submission link
          </Button>
          {ob.archiveFolderUrl && (
            <a
              href={ob.archiveFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              <ExternalLink className="h-4 w-4" /> Open archive folder
            </a>
          )}
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

function SummaryRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-slate-600">
        <span
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
            ok ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400',
          )}
        >
          {ok ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={3} />}
        </span>
        {label}
      </span>
      <span className={cn('text-xs font-medium', ok ? 'text-slate-700' : 'text-amber-600')}>
        {detail}
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
  const sendOffer = useSendOffer(candidateId);
  const markOfferAccepted = useMarkOfferAcceptedManually(candidateId);
  const { data: medicalExam } = useMedicalExam(ob.id, true);
  const hrVerify = useHrVerify(candidateId);
  const archive = useArchiveOnboarding(candidateId);
  const notifyIt = useNotifyIt(candidateId);
  const skipDocs = useSkipDocs(candidateId);
  const skipVerification = useSkipVerification(candidateId);

  const [itEmail, setItEmail] = useState(ob.itEmail);
  const [offerLetterOpen, setOfferLetterOpen] = useState(false);
  const [verifyConfirmOpen, setVerifyConfirmOpen] = useState(false);

  // ── Board Approval (moved in here from the sidebar — now step 4) ──
  const { data: boardApproval } = useBoardApprovalStatus(candidateId, true);
  const hrApprove = useHrBoardApprove(candidateId);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showHrForm, setShowHrForm] = useState(false);
  const [hrNote, setHrNote] = useState('');
  const [hrFile, setHrFile] = useState<File | null>(null);
  const isApproved = boardApproval?.status === 'approved';
  const approvedVotes = boardApproval?.votes.filter((v) => v.status === 'approved') ?? [];
  const pendingCount = boardApproval?.votes.filter((v) => v.status === 'pending').length ?? 0;
  const confirmHrApprove = () => {
    if (!hrFile) return;
    hrApprove.mutate(
      { file: hrFile, note: hrNote.trim() || undefined },
      { onSuccess: () => { setShowHrForm(false); setHrNote(''); setHrFile(null); } },
    );
  };
  const { data: provisioning } = useFacilityProvisioning(candidateId);

  const allVerified =
    (ob.docs.length > 0 && ob.docs.every((d) => d.status === 'verified')) ||
    Boolean(ob.verificationSkippedAt);
  const docsCollected = ob.docs.length > 0 || Boolean(ob.docsSkippedAt);
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
        if (bothSkipped) {
          return (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              <Check className="h-4 w-4 shrink-0 text-slate-400" />
              Checked by Manual on hand — HR verified the documents in person;
              no online submission was needed.
            </div>
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
                <div className="space-y-2">
                  {ob.docs.map((d) => (
                    <DocRow
                      key={d.id}
                      candidateId={candidateId}
                      doc={d}
                      aiOn={aiOn}
                      flag={docFlags.get(d.label)}
                    />
                  ))}
                </div>
              )}
              {ob.docs.length > 0 && (
                <CrossCheckPanel candidateId={candidateId} ob={ob} aiOn={aiOn} />
              )}
            </div>
          </>
        );
      })(),
    },
    {
      // Step 2 — facility requirements confirmation + offer letter.
      title: 'Facility Requirements & Offer Letter',
      icon: Send,
      content: (
        <div className="space-y-5">
          {result.candidate.facilities && (
            <FacilitiesPanel
              requisition={{
                id: result.candidate.requisitionId,
                facilities: result.candidate.facilities,
              }}
              canEdit={canEditFacilities}
            />
          )}
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
                  <Badge tone="success">Accepted {fmt(ob.offerAcceptedAt)}</Badge>
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
                <Button
                  variant="outline"
                  leftIcon={<FileText className="h-4 w-4" />}
                  onClick={() => setOfferLetterOpen(true)}
                >
                  Preview offer letter
                </Button>
                <Button
                  isLoading={sendOffer.isPending}
                  disabled={noEmail}
                  title={emailHint}
                  leftIcon={<Mail className="h-4 w-4" />}
                  onClick={() => sendOffer.mutate(undefined)}
                >
                  {ob.offerSentAt ? 'Resend offer' : 'Send offer'}
                </Button>
              </div>
            </div>
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
        </div>
      ),
    },
    {
      // Step 3 — medical clearance.
      title: 'Medical clearance',
      icon: Stethoscope,
      lockReason: 'Unlocks when the candidate accepts the offer.',
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
            {ob.medicalNote && (
              <span className="text-xs text-slate-500">“{ob.medicalNote}”</span>
            )}
          </div>

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
                href={medicalReportDoc.url}
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

          <Hint>Recorded by the Medical Officer / Team on their queue page.</Hint>
        </>
      ),
    },
    {
      // Step 4 — board approval + facility provisioning.
      title: 'Board Approval & Facility Provisioning',
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
                    <p className="text-[12px] font-semibold text-emerald-700">Board Approved</p>
                    <p className="text-[11px] text-emerald-600">
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
                      <p className="text-[11px] italic leading-relaxed text-slate-600">
                        "{boardApproval.hrApprovalNote}"
                      </p>
                    )}
                    {boardApproval.hrApprovalAttachmentUrl && (
                      <a
                        href={boardApproval.hrApprovalAttachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-brand-600 hover:underline"
                      >
                        <Paperclip className="h-3 w-3" />
                        {boardApproval.hrApprovalAttachmentName ?? 'View attachment'}
                      </a>
                    )}
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      — {boardApproval.hrApprovedBy.name}
                    </p>
                  </div>
                )}
                {!boardApproval?.hrApprovedBy && approvedVotes[0]?.notes && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] italic leading-relaxed text-slate-600">
                      "{approvedVotes[0].notes}"
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      — {approvedVotes[0].member.name}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowBoardModal(true)}
                  className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-600"
                >
                  <Send className="h-3 w-3" /> Resend to members
                </button>
              </div>
            ) : showHrForm ? (
              <div className="mx-auto max-w-md space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-[12px] font-medium transition-colors',
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
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowHrForm(false); setHrNote(''); setHrFile(null); }}
                    className="flex-1 rounded-xl border border-slate-200 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={hrApprove.isPending || !hrFile}
                    onClick={confirmHrApprove}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {hrApprove.isPending ? 'Saving…' : 'Confirm'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-md space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center">
                {boardApproval && (
                  <p className="text-[11px] text-amber-600">
                    {approvedVotes.length}/{boardApproval.votes.length} approved · {pendingCount} pending
                  </p>
                )}
                {!boardApproval && (
                  <p className="text-[11px] text-slate-400">
                    Board approval is required before final verification.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBoardModal(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Send className="h-3.5 w-3.5 text-brand-500" />
                    {boardApproval ? 'Resend' : 'Send to Board'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHrForm(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    HR Approve
                  </button>
                </div>
              </div>
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
      lockReason: 'Unlocks after Board Approval.',
      content: (
        <div className="space-y-6">
          <div>
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
                  {ob.archiveFolderUrl && (
                    <a
                      href={ob.archiveFolderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open archive folder
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    leftIcon={<Printer className="h-4 w-4" />}
                    onClick={() => printOnboardingSummary(result)}
                  >
                    Print summary
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
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Work email</p>
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
                      {d && <span className="text-[11px] font-medium text-emerald-600">Completed</span>}
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
                        <span className="text-[11px] text-slate-400">Handled by IT team</span>
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
        open={offerLetterOpen}
        onClose={() => setOfferLetterOpen(false)}
      />
      {showBoardModal && (
        <SendApprovalModal
          candidateId={candidateId}
          onClose={() => setShowBoardModal(false)}
        />
      )}

      {/* HR verify — summary + confirmation before the final, hard-to-undo sign-off
          (it also auto-rejects every other applicant still in this requisition's pipeline). */}
      <Modal
        open={verifyConfirmOpen}
        onClose={() => setVerifyConfirmOpen(false)}
        title="Confirm final verification"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setVerifyConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={hrVerify.isPending}
              leftIcon={<UserCheck className="h-4 w-4" />}
              onClick={() =>
                hrVerify.mutate(undefined, {
                  onSuccess: () => setVerifyConfirmOpen(false),
                })
              }
            >
              Confirm &amp; verify
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Review before signing off {result.candidate.name}&rsquo;s hire:
          </p>
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            <SummaryRow
              label="Documents"
              ok={(ob.docs.length > 0 || Boolean(ob.docsSkippedAt)) && allVerified}
              detail={
                ob.docsSkippedAt || ob.verificationSkippedAt
                  ? 'Checked manually on hand'
                  : allVerified
                    ? `${ob.docs.length} verified`
                    : 'Not fully verified'
              }
            />
            <SummaryRow
              label="Offer"
              ok={Boolean(ob.offerAcceptedAt)}
              detail={ob.offerAcceptedAt ? `Accepted ${fmt(ob.offerAcceptedAt)}` : 'Not accepted yet'}
            />
            <SummaryRow
              label="Medical"
              ok={ob.medicalStatus === 'cleared'}
              detail={ob.medicalStatus === 'cleared' ? `Cleared ${fmt(ob.medicalClearedAt)}` : 'Not cleared'}
            />
            <SummaryRow
              label="Board Approval"
              ok={isApproved}
              detail={isApproved ? 'Approved' : 'Not approved'}
            />
            <SummaryRow
              label="Facility Provisioning"
              ok={!provisioning || provisioning.items.every((i) => i.recipients.length > 0)}
              detail={
                !provisioning || provisioning.items.length === 0
                  ? 'Nothing to arrange'
                  : `${provisioning.items.filter((i) => Boolean(i.confirmedAt)).length}/${provisioning.items.length} arranged`
              }
            />
          </dl>
          <p className="text-xs text-amber-600">
            This finalizes the hire and automatically rejects any other
            applicants still in this requisition&rsquo;s pipeline.
          </p>
        </div>
      </Modal>

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
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
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
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                  In progress
                </span>
              )}
              {activeState === 'done' && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
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
            <p className="text-[11px] text-slate-400">
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
          href={doc.url}
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
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate font-medium text-slate-700">{value || '—'}</p>
    </div>
  );
}
