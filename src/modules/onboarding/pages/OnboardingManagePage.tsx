import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  FolderArchive,
  Laptop,
  Lock,
  Mail,
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
  Badge,
  Button,
  Card,
  CardBody,
  FullPageSpinner,
  Input,
  type BadgeTone,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { ROUTES } from '@app/router/paths';
import { useUpdateCandidate } from '@modules/candidates';

import { onboardingKeys } from '../hooks/useOnboarding';
import {
  useArchiveOnboarding,
  useCrossCheck,
  useHrVerify,
  useNotifyIt,
  useOnboarding,
  useSendOffer,
  useSendOnboardingLink,
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

const STAGES = [
  'Documents',
  'Verify',
  'Offer',
  'Accepted',
  'Medical',
  'HR final',
  'Onboarded',
];

function progressOf(ob: OnboardingView | null): number {
  if (!ob) return 0;
  const allVerified =
    ob.docs.length > 0 && ob.docs.every((d) => d.status === 'verified');
  if (ob.itNotifiedAt) return 7;
  if (ob.hrVerifiedAt) return 6;
  if (ob.medicalStatus === 'cleared') return 5;
  if (ob.offerAcceptedAt) return 4;
  if (ob.offerSentAt) return 3;
  if (allVerified) return 2;
  if (ob.docs.length > 0) return 1;
  return 0;
}

export default function OnboardingManagePage() {
  const { candidateId = '' } = useParams();
  const { data, isLoading, isError } = useOnboarding(candidateId);
  const start = useStartOnboarding(candidateId);

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
  const ob = data.onboarding;
  const done = progressOf(ob);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <BackLink
        to={ROUTES.requisitionDetail(c.requisitionId)}
        label="requisition"
      />

      {/* Header: name + journey stepper */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">
              {c.code} · Onboarding
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              <UserCheck className="h-6 w-6" /> {c.name}
            </h1>
            <p className="mt-1 text-sm text-white/90">
              {c.designation} · {c.unit}
              {c.department ? ` · ${c.department}` : ''}
            </p>
          </div>
          {c.matchScore != null && (
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">
              AI match {c.matchScore}%
            </span>
          )}
        </div>

        {/* Horizontal stepper */}
        <div className="mt-6 flex items-center">
          {STAGES.map((label, i) => {
            const reached = i < done;
            const current = i === done && Boolean(ob);
            return (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold',
                      reached
                        ? 'border-white bg-white text-brand-700'
                        : current
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/40 text-white/60',
                    )}
                  >
                    {reached ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className="mt-1 hidden text-[10px] text-white/80 sm:block">
                    {label}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    className={cn(
                      'mx-1 h-0.5 flex-1',
                      i < done ? 'bg-white' : 'bg-white/30',
                    )}
                  />
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
                Collect joining documents, verify them, send the offer, then
                complete medical clearance and IT provisioning.
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <Flow
            candidateId={candidateId}
            ob={ob}
            email={c.email}
            aiOn={data.aiConfigured}
            mailOn={data.mailConfigured}
            itWebhook={data.itWebhook}
            result={data}
          />
          <Sidebar result={data} ob={ob} />
        </div>
      )}
    </div>
  );
}

/** Sticky right rail: candidate facts, key dates and quick actions. */
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
      <Card>
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
      <Card>
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

      {/* Key dates */}
      <Card>
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

function Flow({
  candidateId,
  ob,
  email,
  aiOn,
  mailOn,
  itWebhook,
  result,
}: {
  candidateId: string;
  ob: OnboardingView;
  email: string;
  aiOn: boolean;
  mailOn: boolean;
  itWebhook: boolean;
  result: OnboardingResult;
}) {
  const sendLink = useSendOnboardingLink(candidateId);
  const sendOffer = useSendOffer(candidateId);
  const hrVerify = useHrVerify(candidateId);
  const archive = useArchiveOnboarding(candidateId);
  const notifyIt = useNotifyIt(candidateId);

  const [itEmail, setItEmail] = useState(ob.itEmail);
  const [itAsset, setItAsset] = useState(ob.itAssetId);

  const allVerified =
    ob.docs.length > 0 && ob.docs.every((d) => d.status === 'verified');

  // Timeline state per stage: done / locked / current (first actionable) / open.
  const doneFlags = [
    ob.docs.length > 0,
    allVerified,
    Boolean(ob.offerAcceptedAt),
    ob.medicalStatus === 'cleared',
    Boolean(ob.hrVerifiedAt),
    Boolean(ob.itNotifiedAt),
  ];
  const lockedFlags = [
    false,
    false,
    false,
    !ob.offerAcceptedAt,
    ob.medicalStatus !== 'cleared',
    !ob.hrVerifiedAt,
  ];
  const currentIdx = doneFlags.findIndex((d, i) => !d && !lockedFlags[i]);
  const stateOf = (i: number): StageState =>
    doneFlags[i]
      ? 'done'
      : lockedFlags[i]
        ? 'locked'
        : i === currentIdx
          ? 'current'
          : 'open';

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

  return (
    <div>
      {/* 1 · Document submission */}
      <Stage
        n={1}
        state={stateOf(0)}
        title="Document submission link"
        icon={FileText}
      >
        <p className="mb-3 text-sm text-slate-500">
          Share this secure link with the candidate to upload their joining
          documents.
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
      </Stage>

      {/* 2 · Documents & verification */}
      <Stage
        n={2}
        state={stateOf(1)}
        title={`Documents & verification (${ob.docs.length})`}
        icon={Check}
      >
        {ob.docs.length === 0 ? (
          <p className="text-sm text-slate-400">
            No documents yet — the candidate uploads them through the link above.
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
        {aiOn && ob.docs.length > 0 && (
          <CrossCheckPanel candidateId={candidateId} ob={ob} />
        )}
      </Stage>

      {/* 3 · Offer letter */}
      <Stage n={3} state={stateOf(2)} title="Offer letter" icon={Send}>
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
                Send the templated offer letter to the candidate by email.
              </span>
            )}
          </div>
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
      </Stage>

      {/* 4 · Medical */}
      <Stage
        n={4}
        state={stateOf(3)}
        title="Medical clearance"
        icon={Stethoscope}
        lockReason="Unlocks when the candidate accepts the offer."
      >
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
        <Hint>Recorded by the Medical Officer / Team on their queue page.</Hint>
      </Stage>

      {/* 5 · HR final + archive */}
      <Stage
        n={5}
        state={stateOf(4)}
        title="HR final verification & archive"
        icon={FolderArchive}
        lockReason="Unlocks after medical clearance."
      >
        {!ob.hrVerifiedAt ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              Confirm all records are in order and sign off this hire.
            </span>
            <Button
              isLoading={hrVerify.isPending}
              leftIcon={<UserCheck className="h-4 w-4" />}
              onClick={() => hrVerify.mutate(undefined)}
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
      </Stage>

      {/* 6 · IT provisioning */}
      <Stage
        n={6}
        state={stateOf(5)}
        title="IT provisioning"
        icon={Laptop}
        lockReason="Unlocks after HR final verification."
        last
      >
        {ob.itNotifiedAt ? (
          <div className="space-y-1 text-sm">
            <Badge tone="success">Onboarded {fmt(ob.itNotifiedAt)}</Badge>
            <p className="text-slate-600">
              Work email: <span className="font-medium">{ob.itEmail || '—'}</span>{' '}
              · Asset: <span className="font-medium">{ob.itAssetId || '—'}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              {itWebhook
                ? 'Fires the IT webhook with the new hire’s details; the issued email & asset id are written back automatically (you can override them below).'
                : 'Enter the work email and asset id issued by IT.'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Work email"
                placeholder="name@dbl-group.com"
                value={itEmail}
                onChange={(e) => setItEmail(e.target.value)}
              />
              <Input
                label="Asset / device id"
                placeholder="LAP-00123"
                value={itAsset}
                onChange={(e) => setItAsset(e.target.value)}
              />
            </div>
            <Button
              isLoading={notifyIt.isPending}
              disabled={!ob.hrVerifiedAt}
              title={!ob.hrVerifiedAt ? 'Complete HR verification first' : undefined}
              leftIcon={<Laptop className="h-4 w-4" />}
              onClick={() =>
                notifyIt.mutate({
                  email: itEmail || undefined,
                  assetId: itAsset || undefined,
                })
              }
            >
              Notify IT &amp; finish
            </Button>
            {!ob.hrVerifiedAt && (
              <Hint tone="amber">Complete HR verification before notifying IT.</Hint>
            )}
          </div>
        )}
      </Stage>
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

/** One step on the onboarding timeline: rail + connector + state-aware card. */
function Stage({
  n,
  state,
  title,
  icon: Icon,
  lockReason,
  last = false,
  children,
}: {
  n: number;
  state: StageState;
  title: string;
  icon: React.ElementType;
  lockReason?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  const locked = state === 'locked';
  return (
    <div className="flex gap-3 sm:gap-4">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition',
            state === 'done' &&
              'border-emerald-500 bg-emerald-500 text-white',
            state === 'current' &&
              'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-200',
            state === 'open' && 'border-slate-300 bg-white text-slate-500',
            locked && 'border-slate-200 bg-slate-100 text-slate-300',
          )}
        >
          {state === 'done' ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : locked ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            n
          )}
        </div>
        {!last && (
          <div
            className={cn(
              'w-0.5 flex-1 rounded-full',
              state === 'done' ? 'bg-emerald-300' : 'bg-slate-200',
            )}
          />
        )}
      </div>

      {/* Card */}
      <div
        className={cn(
          'mb-5 min-w-0 flex-1 rounded-2xl border bg-white p-4 transition sm:p-5',
          state === 'current'
            ? 'border-brand-200 shadow-sm ring-1 ring-brand-100'
            : 'border-slate-200',
          locked && 'bg-slate-50/70',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Icon
            className={cn(
              'h-4 w-4',
              locked ? 'text-slate-300' : 'text-brand-600',
            )}
          />
          <h2
            className={cn(
              'text-base font-semibold',
              locked ? 'text-slate-400' : 'text-slate-800',
            )}
          >
            {title}
          </h2>
          {state === 'current' && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              In progress
            </span>
          )}
          {state === 'done' && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Done
            </span>
          )}
        </div>
        {locked ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5 shrink-0" /> {lockReason}
          </p>
        ) : (
          <div className="mt-3">{children}</div>
        )}
      </div>
    </div>
  );
}

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

/** AI cross-verification of all extracted docs vs the candidate's profile. */
function CrossCheckPanel({
  candidateId,
  ob,
}: {
  candidateId: string;
  ob: OnboardingView;
}) {
  const check = useCrossCheck(candidateId);
  const cc = ob.crossCheck;
  const extracted = ob.docs.filter((d) => d.aiExtract).length;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {cc?.verdict === 'discrepancies' ? (
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500" />
        ) : (
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
        )}
        <span className="flex-1 text-sm font-semibold text-slate-700">
          AI cross-verification
        </span>
        {cc && (
          <Badge tone={CC_TONE[cc.verdict] ?? 'warning'}>
            {CC_LABEL[cc.verdict] ?? cc.verdict}
          </Badge>
        )}
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
          {cc ? 'Re-check' : 'Cross-check'}
        </Button>
      </div>

      {!cc ? (
        <p className="mt-2 text-xs text-slate-400">
          Checks every scanned document against the candidate&rsquo;s profile and
          against each other — names, dates and credentials.
          {extracted === 0 && ' Run an AI scan on the documents first.'}
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
              Checked {fmt(ob.crossCheckedAt)} — advisory only; verify
              originals before final sign-off.
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
