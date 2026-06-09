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
  Mail,
  Send,
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
  DocStatus,
  OnboardingDoc,
  OnboardingView,
} from '../types/onboarding.types';

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
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <BackLink
        to={ROUTES.requisitionDetail(c.requisitionId)}
        label="requisition"
      />

      {/* Header */}
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
          <ContactBlock
            candidateId={c.id}
            reqId={c.requisitionId}
            email={c.email}
            phone={c.phone}
          />
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
        <Card>
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
        <Flow
          candidateId={candidateId}
          ob={ob}
          email={c.email}
          aiOn={data.aiConfigured}
          mailOn={data.mailConfigured}
          itWebhook={data.itWebhook}
        />
      )}
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
}: {
  candidateId: string;
  ob: OnboardingView;
  email: string;
  aiOn: boolean;
  mailOn: boolean;
  itWebhook: boolean;
}) {
  const sendLink = useSendOnboardingLink(candidateId);
  const sendOffer = useSendOffer(candidateId);
  const hrVerify = useHrVerify(candidateId);
  const archive = useArchiveOnboarding(candidateId);
  const notifyIt = useNotifyIt(candidateId);

  const [itEmail, setItEmail] = useState(ob.itEmail);
  const [itAsset, setItAsset] = useState(ob.itAssetId);

  const done = progressOf(ob);
  const allVerified =
    ob.docs.length > 0 && ob.docs.every((d) => d.status === 'verified');
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
    <div className="space-y-5">
      {/* 1 · Document submission */}
      <Stage n={1} done={done > 0} title="Document submission link" icon={FileText}>
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
        done={allVerified}
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
              <DocRow key={d.id} candidateId={candidateId} doc={d} aiOn={aiOn} />
            ))}
          </div>
        )}
      </Stage>

      {/* 3 · Offer letter */}
      <Stage n={3} done={Boolean(ob.offerAcceptedAt)} title="Offer letter" icon={Send}>
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
        done={ob.medicalStatus === 'cleared'}
        title="Medical clearance"
        icon={Stethoscope}
      >
        <div className="flex items-center gap-2">
          <Badge tone={MED_TONE[ob.medicalStatus] ?? 'warning'}>
            {ob.medicalStatus === 'cleared'
              ? `Cleared ${fmt(ob.medicalClearedAt)}`
              : ob.medicalStatus === 'rejected'
                ? 'Not cleared'
                : 'Pending'}
          </Badge>
          {ob.medicalNote && (
            <span className="text-xs text-slate-500">“{ob.medicalNote}”</span>
          )}
        </div>
        <Hint>
          Recorded by the Medical Officer / Team — unlocked once the offer is
          accepted.
        </Hint>
      </Stage>

      {/* 5 · HR final + archive */}
      <Stage
        n={5}
        done={Boolean(ob.hrVerifiedAt)}
        title="HR final verification & archive"
        icon={FolderArchive}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {ob.hrVerifiedAt ? (
              <Badge tone="success">Verified {fmt(ob.hrVerifiedAt)}</Badge>
            ) : (
              <span className="text-slate-500">
                Final HR sign-off after medical clearance.
              </span>
            )}
            {ob.archivedAt && <Badge tone="info">Archived</Badge>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              isLoading={archive.isPending}
              onClick={() => archive.mutate(undefined)}
            >
              Archive docs
            </Button>
            <Button
              isLoading={hrVerify.isPending}
              disabled={ob.medicalStatus !== 'cleared'}
              title={
                ob.medicalStatus !== 'cleared'
                  ? 'Requires medical clearance'
                  : undefined
              }
              onClick={() => hrVerify.mutate(undefined)}
            >
              HR verify
            </Button>
          </div>
        </div>
        {ob.medicalStatus !== 'cleared' && (
          <Hint tone="amber">Medical clearance is required before HR sign-off.</Hint>
        )}
      </Stage>

      {/* 6 · IT provisioning */}
      <Stage
        n={6}
        done={Boolean(ob.itNotifiedAt)}
        title="IT provisioning"
        icon={Laptop}
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
    <div className="text-right text-sm text-white/90">
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="email"
            value={draft}
            placeholder="name@example.com"
            onChange={(e) => setDraft(e.target.value)}
            className="rounded-md px-2 py-1 text-xs text-slate-800 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={save}
            disabled={update.isPending}
            className="rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium hover:bg-white/30 disabled:opacity-50"
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
          className="hover:underline"
          title="Edit email"
        >
          {email}
        </button>
      )}
      {phone && <p className="mt-0.5">{phone}</p>}
      {!email && !editing && (
        <p className="mt-0.5 text-xs text-white/70">Add an email to send the offer</p>
      )}
    </div>
  );
}

function Stage({
  n,
  done,
  title,
  icon: Icon,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              done
                ? 'bg-emerald-500 text-white'
                : 'bg-brand-50 text-brand-700',
            )}
          >
            {done ? <Check className="h-4 w-4" /> : n}
          </div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Icon className="h-4 w-4 text-brand-600" />
            {title}
          </h2>
        </div>
        <div className="pl-11">{children}</div>
      </CardBody>
    </Card>
  );
}

function DocRow({
  candidateId,
  doc,
  aiOn,
}: {
  candidateId: string;
  doc: OnboardingDoc;
  aiOn: boolean;
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
