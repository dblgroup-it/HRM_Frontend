import { useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  Ban,
  Download,
  FileSignature,
  Lock,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Logo } from '@shared/components/ui';
import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { SignatureCropper } from '@modules/settings';

import { onboardingApi } from '../api/onboarding.api';
import type { DocStatus } from '../types/onboarding.types';

const ACCEPT = '.pdf,application/pdf';
const IMAGE_ACCEPT = '.png,.jpg,.jpeg,image/png,image/jpeg';
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * The one checklist item that is a picture.
 *
 * Matched on the label the server sends rather than an index: the list is
 * DBL's and will be edited, and an index would silently point at the wrong
 * row the first time somebody reorders it.
 */
const isSignatureDoc = (label: string) => /^signature/i.test(label.trim());

const DOC_STATUS_META: Record<DocStatus, { label: string; cls: string; dot: string }> = {
  pending: {
    label: 'Pending review',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
  },
  verified: {
    label: 'Verified',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-400',
  },
  rejected: {
    label: 'Rejected',
    cls: 'bg-rose-50 text-rose-600 border-rose-200',
    dot: 'bg-rose-400',
  },
};

/**
 * The server's own words.
 *
 * Every failure here used to read "please check the image and retry", which
 * was wrong for most of them — the form not sent yet, no signature on file, a
 * browser that could not start. The message that explains the problem is the
 * one the server already wrote.
 */
function msg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

/** Mirrors the server's minimum, so the button and the API agree. */
const MIN_DECLINE_REASON = 3;

export default function OnboardingPage() {
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  // The offer mail's second link lands here with the form already open.
  const [declining, setDeclining] = useState(params.get('action') === 'decline');
  const [declineReason, setDeclineReason] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-onboarding', token],
    queryFn: () => onboardingApi.publicGet(token),
    enabled: Boolean(token),
    retry: false,
  });

  const upload = useMutation({
    mutationFn: (vars: { label: string; file: File }) =>
      onboardingApi.publicUpload(token, vars.label, vars.file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-onboarding', token] });
      toast.success('Document uploaded successfully');
    },
    onError: (e) => toast.error(msg(e, 'Upload failed — please try again')),
  });

  const accept = useMutation({
    mutationFn: (joining?: string) => onboardingApi.publicAccept(token, joining),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-onboarding', token] });
      toast.success('Offer accepted! Welcome to DBL Group 🎉');
    },
    onError: (e) => toast.error(msg(e, 'Could not accept the offer')),
  });

  const [cocAgreed, setCocAgreed] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [joiningDate, setJoiningDate] = useState('');
  const signedOfferRef = useRef<HTMLInputElement>(null);

  const signCoc = useMutation({
    mutationFn: () => onboardingApi.publicSignCoc(token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['public-onboarding', token] });
      setCocAgreed(false);
      toast.success('Thank you — your acknowledgement has been recorded.');
    },
    // The server says what was wrong — no signature on file, the form not
    // sent yet — and repeating it is far more use than "please retry".
    onError: (e) => toast.error(msg(e, 'Could not record that — please retry')),
  });

  const uploadSignedOffer = useMutation({
    mutationFn: (file: File) => onboardingApi.publicUploadSignedOffer(token, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['public-onboarding', token] });
      toast.success('Signed offer received — thank you.');
    },
    onError: (e) => toast.error(msg(e, 'Could not upload that file')),
  });

  const decline = useMutation({
    mutationFn: (reason: string) => onboardingApi.publicDecline(token, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['public-onboarding', token] });
      setDeclining(false);
      toast.success('Thank you — HR has been told.');
    },
    onError: () => toast.error('Could not submit that — please try again'),
  });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <Logo />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        </div>
      </div>
    );
  }

  // ── Error / invalid ──
  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md">
          <Logo />
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm animate-rise-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <X className="h-7 w-7 text-slate-400" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-800">Link not available</h2>
            <p className="mt-2 text-sm text-slate-500">
              This onboarding link is invalid or has expired. Please contact DBL Group HR.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Derived
  const totalDocs = data.requiredDocs.length;
  const uploadedDocs = data.requiredDocs.filter((label) =>
    data.submitted.some((s) => s.label === label),
  ).length;
  const allUploaded = totalDocs > 0 && uploadedDocs === totalDocs;
  const progressPct = totalDocs > 0 ? Math.round((uploadedDocs / totalDocs) * 100) : 0;

  /**
   * One checklist row.
   *
   * Shared by the required and the optional list so the two cannot drift into
   * looking like different things — the only difference between them is
   * whether being absent holds anything up.
   */
  const renderDocRow = (label: string, i: number) => {
                    const submitted = data.submitted.filter((s) => s.label === label);
                    const latest = submitted[submitted.length - 1];
                    const isUploading = upload.isPending && activeLabel === label;

                    return (
                      <div
                        key={label}
                        className="flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap animate-fade-in"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        {/* Icon */}
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                          latest?.status === 'verified' ? 'bg-emerald-100' : 'bg-slate-100'
                        )}>
                          {latest?.status === 'verified' ? (
                            <FileCheck2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <FileText className="h-5 w-5 text-slate-400" />
                          )}
                        </div>

                        {/* Name + badge */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
                          {latest && (
                            <span className={cn(
                              'mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold',
                              DOC_STATUS_META[latest.status].cls
                            )}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', DOC_STATUS_META[latest.status].dot)} />
                              {DOC_STATUS_META[latest.status].label}
                            </span>
                          )}
                        </div>

                        {/* Upload button */}
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => {
                            setActiveLabel(label);
                            fileRef.current?.click();
                          }}
                          className={cn(
                            'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-95',
                            latest
                              ? 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600'
                              : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100',
                            isUploading && 'opacity-60 cursor-not-allowed'
                          )}
                        >
                          {isUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UploadCloud className="h-3.5 w-3.5" />
                          )}
                          {isUploading ? 'Uploading…' : latest ? 'Replace' : 'Upload'}
                        </button>
                      </div>
                    );
  };

  // ── Main ──
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Sticky nav */}
      <header className="sticky top-0 z-30 border-b border-white/20 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            Onboarding Portal
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 px-4 py-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl animate-blob-1" aria-hidden />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-accent-400/15 blur-3xl animate-blob-2" aria-hidden />

        <div className="relative z-10 mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-widest text-white/70 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-accent-400" />
            Welcome to DBL Group
          </span>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl animate-rise-in">
            Hi {data.candidateName}! 👋
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70 animate-rise-in" style={{ animationDelay: '60ms' }}>
            Congratulations on your selection as{' '}
            <span className="font-semibold text-white">{data.designation}</span>. Please upload the
            required documents below to complete your onboarding.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80 animate-rise-in" style={{ animationDelay: '100ms' }}>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 shrink-0" /> {data.unit}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm">
              {data.code}
            </span>
          </div>

          {/* Progress bar */}
          {totalDocs > 0 && (
            <div className="mt-6 animate-rise-in" style={{ animationDelay: '140ms' }}>
              <div className="mb-1.5 flex items-center justify-between text-xs text-white/70">
                <span>Documents uploaded</span>
                <span className="font-bold text-white">{uploadedDocs} / {totalDocs}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-accent-400 transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-5">

            {/* Left sidebar */}
            <aside className="order-2 lg:order-1 lg:col-span-2">
              <div className="sticky top-20 space-y-4">
                {/* Code of Conduct — only once HR has sent it. */}
                {data.cocSentAt && (
                  <div
                    className={cn(
                      'rounded-2xl border p-5 shadow-sm animate-rise-in',
                      data.cocSignedAt
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-amber-200 bg-amber-50',
                    )}
                    style={{ animationDelay: '60ms' }}
                  >
                    {data.cocSignedAt ? (
                      <div className="text-center">
                        <FileSignature className="mx-auto h-8 w-8 text-emerald-500" />
                        <p className="mt-2 text-sm font-bold text-emerald-700">
                          Code of Conduct signed
                        </p>
                        <p className="mt-1 text-xs text-emerald-600">
                          Thank you — your acknowledgement is on file.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          Code of Conduct
                        </p>
                        <p className="mt-1 text-xs text-amber-800">
                          Please read the Code of Conduct attached to our email,
                          then confirm below. It is signed with the signature
                          you uploaded with your documents.
                        </p>
                        <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-amber-900">
                          <input
                            type="checkbox"
                            checked={cocAgreed}
                            onChange={(e) => setCocAgreed(e.target.checked)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-amber-300"
                          />
                          <span>
                            I acknowledge that I have received, read and
                            understood the DBL Group Code of Conduct, and I agree
                            to comply with it.
                          </span>
                        </label>
                        {!data.signatureOnFile && (
                          <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-[0.6875rem] text-amber-800">
                            Upload your signature in the documents list first —
                            this form is signed with it.
                          </p>
                        )}
                        <button
                          disabled={
                            !cocAgreed || !data.signatureOnFile || signCoc.isPending
                          }
                          onClick={() => signCoc.mutate()}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {signCoc.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileSignature className="h-4 w-4" />
                          )}
                          Sign with my signature
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Offer banner */}
                {data.offerSentAt && (
                  <div
                    className={cn(
                      'rounded-2xl border p-5 shadow-sm animate-rise-in',
                      data.offerAcceptedAt
                        ? 'border-emerald-200 bg-emerald-50'
                        : data.offerDeclinedAt
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-brand-200 bg-brand-50',
                    )}
                    style={{ animationDelay: '80ms' }}
                  >
                    {data.offerAcceptedAt ? (
                      <div className="text-center">
                        <PartyPopper className="mx-auto h-8 w-8 text-emerald-500" />
                        <p className="mt-2 text-sm font-bold text-emerald-700">Offer accepted!</p>
                        <p className="mt-1 text-xs text-emerald-600">Welcome aboard — next steps will follow by email.</p>
                        {data.offerJoiningTentative && (
                          <p className="mt-2 text-xs text-emerald-700">
                            You expect to join on{' '}
                            <strong>
                              {new Date(data.offerJoiningTentative).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </strong>
                            .
                          </p>
                        )}
                        {/* Returning the signed paper is a separate act — most
                            people accept online and post the scan later. */}
                        <div className="mt-3 border-t border-emerald-200 pt-3 text-left">
                          {data.offerSignedAt ? (
                            <p className="text-xs text-emerald-700">
                              Your signed copy has been received.
                            </p>
                          ) : (
                            <>
                              <p className="text-[0.6875rem] text-emerald-800">
                                If you were asked to return a signed copy:
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <a
                                  href={resolveApiFileUrl(
                                    onboardingApi.publicOfferLetterPath(token),
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[0.6875rem] font-semibold text-emerald-700 hover:bg-emerald-50"
                                >
                                  <Download className="h-3.5 w-3.5" /> Offer letter (PDF)
                                </a>
                                <button
                                  onClick={() => signedOfferRef.current?.click()}
                                  disabled={uploadSignedOffer.isPending}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[0.6875rem] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  <UploadCloud className="h-3.5 w-3.5" />
                                  {uploadSignedOffer.isPending ? 'Uploading…' : 'Upload signed copy'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ) : data.offerDeclinedAt ? (
                      <div className="text-center">
                        <Ban className="mx-auto h-8 w-8 text-slate-400" />
                        <p className="mt-2 text-sm font-bold text-slate-700">Offer declined</p>
                        <p className="mt-1 text-xs text-slate-500">
                          You let us know this offer isn&rsquo;t right for you. HR has your
                          message and may be in touch.
                        </p>
                        {data.offerDeclineReason && (
                          <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-left text-xs text-slate-600">
                            &ldquo;{data.offerDeclineReason}&rdquo;
                          </p>
                        )}
                      </div>
                    ) : declining ? (
                      <div>
                        <p className="text-sm font-bold text-slate-800">Declining the offer</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Please tell us why — it goes straight to the HR team handling
                          your application.
                        </p>
                        <textarea
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          rows={3}
                          autoFocus
                          placeholder="e.g. I have accepted another offer closer to home."
                          className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                        />
                        <button
                          disabled={
                            decline.isPending ||
                            declineReason.trim().length < MIN_DECLINE_REASON
                          }
                          onClick={() => decline.mutate(declineReason.trim())}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {decline.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Submit'
                          )}
                        </button>
                        <button
                          onClick={() => setDeclining(false)}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Back
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-brand-800">🎉 You have an offer!</p>
                        <p className="mt-1 text-xs text-brand-600">DBL Group has extended you an employment offer. Please review and accept.</p>
                        {/* Asked at acceptance because that is the moment
                            they know it, and HR plans joining around it. */}
                        <label className="mt-3 block">
                          <span className="mb-1 block text-[0.6875rem] font-semibold text-brand-800">
                            Tentative date of joining
                          </span>
                          <input
                            type="date"
                            value={joiningDate}
                            onChange={(e) => setJoiningDate(e.target.value)}
                            className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none"
                          />
                        </label>
                        {!data.signatureOnFile && (
                          <p className="mt-2 text-[0.6875rem] text-brand-700">
                            Please also upload your signature in the documents
                            list — your joining forms are signed with it.
                          </p>
                        )}
                        <button
                          disabled={accept.isPending || !joiningDate}
                          onClick={() => accept.mutate(joiningDate)}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept offer'}
                        </button>
                        <button
                          onClick={() => setDeclining(true)}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white"
                        >
                          I need to decline this offer
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress card */}
                {allUploaded && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center shadow-sm animate-fade-in">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <p className="mt-2 text-sm font-bold text-emerald-700">All documents uploaded!</p>
                    <p className="mt-1 text-xs text-emerald-600">Our HR team will verify each document and update you.</p>
                  </div>
                )}

                {/* Tips */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-rise-in" style={{ animationDelay: '120ms' }}>
                  <h3 className="text-sm font-bold text-slate-800">Upload guidelines</h3>
                  <ul className="mt-3 space-y-2.5">
                    {[
                      { icon: '📄', text: 'PDF format only' },
                      { icon: '⚖️', text: 'Maximum 5 MB per file' },
                      { icon: '✅', text: 'Documents must be clear & legible' },
                      { icon: '🔒', text: 'Shared only with DBL Group HR' },
                    ].map((item) => (
                      <li key={item.text} className="flex items-start gap-2 text-xs text-slate-500">
                        <span className="mt-0.5 shrink-0">{item.icon}</span>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>

            {/* Right: document checklist */}
            <div className="order-1 lg:order-2 lg:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm animate-rise-in" style={{ animationDelay: '80ms' }}>
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-base font-bold text-slate-900">Required documents</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Upload each document below. Click Upload on the right of each item.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {data.requiredDocs.map(renderDocRow)}
                </div>

                {/* Optional documents.
                    Kept visually separate and clearly labelled: they are
                    uploaded and verified exactly like the rest, but a
                    candidate who has none is not incomplete — a fresh graduate
                    has no pay slip, and a checklist that can never reach 100%
                    is one people stop trusting. */}
                {(data.optionalDocs?.length ?? 0) > 0 && (
                  <>
                    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2.5">
                      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                        If available
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Not required — upload these only if you have them.
                      </p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {data.optionalDocs!.map(renderDocRow)}
                    </div>
                  </>
                )}

                {/* Privacy notice */}
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="flex items-center gap-1.5 text-[0.6875rem] text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    Your documents are stored securely and shared only with DBL Group HR.
                    PDF only · max 5 MB each.
                  </p>
                </div>
              </div>

              {/* Security note */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 animate-fade-in">
                <Lock className="h-3.5 w-3.5" />
                This page is secured with a unique personal link. Do not share it.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Cropping to 3:1 happens here rather than being demanded of the
          candidate: they photograph a signature on paper and we cut it to the
          shape the form needs. */}
      {signatureFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <p className="mb-3 text-sm font-bold text-slate-800">
              Crop your signature
            </p>
            <SignatureCropper
              file={signatureFile}
              isUploading={upload.isPending}
              onCancel={() => setSignatureFile(null)}
              onCropped={(cropped) => {
                setSignatureFile(null);
                if (activeLabel) upload.mutate({ label: activeLabel, file: cropped });
              }}
            />
          </div>
        </div>
      )}

      {/* Hidden file input — PDF for documents, an image for the signature */}
      <input
        ref={fileRef}
        type="file"
        accept={activeLabel && isSignatureDoc(activeLabel) ? IMAGE_ACCEPT : ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file || !activeLabel) return;

          if (isSignatureDoc(activeLabel)) {
            if (!/^image\/(png|jpe?g)$/.test(file.type)) {
              toast.error('Your signature must be a PNG or JPEG image.');
              return;
            }
            if (file.size > MAX_IMAGE_BYTES) {
              toast.error('Please keep the image under 2 MB.');
              return;
            }
            // Cropped here rather than demanded of the candidate: they
            // photograph a signature on paper and we cut it to 3:1.
            setSignatureFile(file);
            return;
          }

          if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are accepted.');
            return;
          }
          if (file.size > MAX_PDF_BYTES) {
            toast.error('File must be under 5 MB.');
            return;
          }
          upload.mutate({ label: activeLabel, file });
        }}
      />

      {/* The signed offer, returned as a PDF */}
      <input
        ref={signedOfferRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (file.type !== 'application/pdf') {
            toast.error('Please upload the signed offer as a PDF.');
            return;
          }
          if (file.size > MAX_PDF_BYTES) {
            toast.error('File must be under 5 MB.');
            return;
          }
          uploadSignedOffer.mutate(file);
        }}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-4 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} DBL Group · All rights reserved</p>
          <p className="text-xs text-slate-400">Onboarding Portal · Powered by DBL HRM</p>
        </div>
      </footer>
    </div>
  );
}
