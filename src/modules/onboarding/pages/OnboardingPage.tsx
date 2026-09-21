import { useEffect, useRef, useState } from 'react';
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
  Plus,
  ChevronDown,
  Paperclip,
  ScanFace,
} from 'lucide-react';
import { toast } from 'sonner';

import { Logo } from '@shared/components/ui';
import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { SignatureCropper } from '@modules/settings';

import { onboardingApi } from '../api/onboarding.api';
import type {
  DocStatus,
  JoiningDocSpec,
  NidParticulars,
} from '../types/onboarding.types';

/**
 * What a joining document may be.
 *
 * PDF plus photographs: most of this checklist is paper the candidate is
 * physically holding, and a phone photo of a certificate is what they
 * actually have. Insisting on PDF sent them off to find a converter.
 */
const ACCEPT = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';
/** The signed offer is a document DBL issued — it comes back as it went out. */
const PDF_ONLY_ACCEPT = '.pdf,application/pdf';
const IMAGE_ACCEPT = '.png,.jpg,.jpeg,image/png,image/jpeg';
const isJoiningDocType = (type: string) =>
  type === 'application/pdf' || /^image\/(png|jpe?g)$/.test(type);
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * The one checklist item that is a picture.
 *
 * Matched on the label the server sends rather than an index: the list is
 * DBL's and will be edited, and an index would silently point at the wrong
 * row the first time somebody reorders it.
 */
/**
 * The checklist slot an inline signature upload files under.
 *
 * Deliberately the same slot the documents list shows, so a signature added
 * from the offer box turns up there too — one signature, one place, whichever
 * screen they happened to be on when they gave it.
 */
const SIGNATURE_KEY = 'signature';

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
  const [activeKey, setActiveKey] = useState<string | null>(null);
  /** Names typed into the repeatable slots, before the file is chosen. */
  const [slotNames, setSlotNames] = useState<Record<string, string>>({});
  /**
   * Which repeatable slot has its add-form open.
   *
   * The form is not on screen until asked for: a permanently visible empty
   * name box read as a stray field the candidate had to puzzle out, and it
   * sat there just as prominently for somebody holding no certificates.
   */
  const [adding, setAdding] = useState<string | null>(null);
  /**
   * Which section is expanded.
   *
   * One at a time. Twenty-four rows laid out flat is a page nobody scrolls
   * to the bottom of — and a candidate works through this over several
   * sittings, fetching one folder of papers at a time, so the whole list
   * open at once is not what they need anyway. Seven bands they can see in
   * one screen, with the one they are working on open, is.
   */
  const [openSection, setOpenSection] = useState<string | null>(null);
  /** Set once from the data: the first section still missing something. */
  const openSeeded = useRef(false);
  // The offer mail's second link lands here with the form already open.
  const [declining, setDeclining] = useState(params.get('action') === 'decline');
  const [declineReason, setDeclineReason] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-onboarding', token],
    queryFn: () => onboardingApi.publicGet(token),
    enabled: Boolean(token),
    retry: false,
  });

  // Seed the NID fields once, from whatever the server already holds. Guarded
  // so a refetch mid-typing does not overwrite what is being typed.
  useEffect(() => {
    if (nidLoaded.current || !data) return;
    nidLoaded.current = true;
    setNid(data.nid);
  }, [data]);

  // Open the first section that still owes something, once. Guarded so an
  // upload does not slam the section shut and jump them somewhere else.
  useEffect(() => {
    if (openSeeded.current || !data) return;
    openSeeded.current = true;
    const firstIncomplete = data.docSections.find((sec) =>
      data.docCatalogue.some(
        (slot) =>
          slot.section === sec.key &&
          slot.required &&
          !data.submitted.some(
            (sub) => sub.docKey === slot.key && sub.status !== 'rejected',
          ),
      ),
    );
    setOpenSection(firstIncomplete?.key ?? data.docSections[0]?.key ?? null);
  }, [data]);

  const upload = useMutation({
    mutationFn: (vars: { docKey: string; file: File; label?: string }) =>
      onboardingApi.publicUpload(token, vars.docKey, vars.file, vars.label),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['public-onboarding', token] });
      // Clear the name so the next certificate starts from an empty field
      // rather than being added under the previous one's name.
      setSlotNames((n) => ({ ...n, [vars.docKey]: '' }));
      setAdding(null);
      toast.success('Document uploaded successfully');
    },
    onError: (e) => toast.error(msg(e, 'Upload failed — please try again')),
  });

  /**
   * The NID particulars, held locally and saved on blur.
   *
   * Saved per field as they leave it rather than behind a Save button: this
   * page is filled in over several sittings, often on a phone, and a form
   * that loses four typed fields to a closed tab is one people do not
   * finish.
   */
  const [nid, setNid] = useState<NidParticulars>({
    name: '',
    address: '',
    dateOfBirth: '',
    number: '',
  });
  const nidLoaded = useRef(false);
  const saveNid = useMutation({
    mutationFn: (patch: Partial<NidParticulars>) =>
      onboardingApi.publicSaveNid(token, patch),
    onError: (e) => toast.error(msg(e, 'Could not save that — please retry')),
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

  /** The slot the file picker is open for, so its rules can be applied. */
  const activeSpec = data.docCatalogue.find((d) => d.key === activeKey) ?? null;

  // Derived. Counted on the catalogue key, not the label — the label of a
  // repeatable slot is whatever the candidate typed.
  const requiredSlots = data.docCatalogue.filter((d) => d.required);
  const totalDocs = requiredSlots.length;
  const uploadedDocs = requiredSlots.filter((slot) =>
    data.submitted.some(
      (sub) => sub.docKey === slot.key && sub.status !== 'rejected',
    ),
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
  /**
   * One checklist slot.
   *
   * Matched on the catalogue key, so a slot keeps its uploads when its
   * wording changes — and so a repeatable slot can hold several rows, each
   * named by the candidate ("PMP", "Six Sigma Green Belt").
   */
  const renderSlot = (slot: JoiningDocSpec, i: number) => {
    const filed = data.submitted.filter((sub) => sub.docKey === slot.key);
    const latest = filed[filed.length - 1];
    const isUploading = upload.isPending && activeKey === slot.key;
    const repeatable = Boolean(slot.repeatable);

    return (
      <div
        key={slot.key}
        className={cn(
          'group relative px-5 py-4 animate-card-in transition-colors',
          filed.length ? 'hover:bg-emerald-50/30' : 'hover:bg-slate-50/70',
        )}
        style={{ animationDelay: `${i * 40}ms` }}
      >
        {/* A thread of colour down the left once the row is satisfied, so
            progress is legible while scrolling past at speed. */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 w-0.5 origin-top transition-transform duration-300',
            filed.length ? 'scale-y-100 bg-emerald-400' : 'scale-y-0 bg-transparent',
          )}
        />
        <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
          <div className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
            filed.length
              ? 'bg-emerald-100 ring-2 ring-emerald-200/60'
              : 'bg-slate-100 group-hover:bg-brand-50',
          )}>
            {filed.length ? (
              <FileCheck2 className="h-5 w-5 text-emerald-600 animate-card-in" />
            ) : (
              <FileText className="h-5 w-5 text-slate-400 transition-colors group-hover:text-brand-500" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {slot.label}
              {!slot.required && (
                <span className="ml-1.5 text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">
                  optional
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{slot.hint}</p>

            {/* Every copy filed against this slot. A fixed slot has one and
                the newest wins; a repeatable one lists them all, because
                each is a different certificate. */}
            {!repeatable && latest && (
              <div className="mt-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold',
                    DOC_STATUS_META[latest.status].cls,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', DOC_STATUS_META[latest.status].dot)} />
                  {DOC_STATUS_META[latest.status].label}
                </span>
              </div>
            )}

            {/* The lab prints have to reach HR on paper too — saying so here
                is the only place the candidate would ever learn it. */}
            {/* Said up front, not discovered by having an upload bounce. */}
            {slot.verifyPortrait && filed.length === 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-[0.6875rem] text-slate-400">
                <ScanFace className="h-3 w-3 shrink-0" />
                We check this is a photo of a face before accepting it.
              </p>
            )}
            {slot.hardCopy && (
              <p className={cn(
                'mt-1.5 inline-flex items-center gap-1 text-[0.6875rem]',
                data.photosHardCopyAt ? 'text-emerald-600' : 'text-amber-600',
              )}>
                <ShieldCheck className="h-3 w-3 shrink-0" />
                {data.photosHardCopyAt
                  ? 'Hard copies received by HR'
                  : 'Also hand the printed set to HR'}
              </p>
            )}

          </div>

          {/* A repeatable slot has no single button — each certificate is its
              own row underneath, added from the form below them. */}
          {!repeatable && (
            <button
              type="button"
              disabled={isUploading}
              onClick={() => {
                setActiveKey(slot.key);
                fileRef.current?.click();
              }}
              className={cn(
                'mt-0.5 flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold',
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:scale-95 active:translate-y-0',
                filed.length
                  ? 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600'
                  : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" />
              )}
              {isUploading ? 'Uploading…' : filed.length ? 'Replace' : 'Upload'}
            </button>
          )}
        </div>

        {/* ── A repeatable slot: one row per certificate, then the adder ──
            The old shape was a permanent empty text box with an "Add" button
            beside it, which read as a stray field the candidate had to work
            out, and the ones already sent were squeezed into little chips.
            Each certificate is a real row now, and adding one is a deliberate
            two-field step that is not on screen until it is wanted. */}
        {repeatable && (
          <div className="mt-3 space-y-2 pl-12">
            {filed.map((sub) => (
              <div
                key={sub.id}
                className="flex animate-card-in items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                  {sub.label}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold',
                    DOC_STATUS_META[sub.status].cls,
                  )}
                >
                  {DOC_STATUS_META[sub.status].label}
                </span>
              </div>
            ))}

            {adding === slot.key ? (
              <div className="animate-card-in rounded-xl border border-brand-200 bg-brand-50/50 p-3">
                <label className="block">
                  <span className="mb-1 block text-[0.625rem] font-semibold uppercase tracking-wide text-brand-800">
                    What is it called?
                  </span>
                  <input
                    autoFocus
                    value={slotNames[slot.key] ?? ''}
                    onChange={(e) =>
                      setSlotNames((n) => ({ ...n, [slot.key]: e.target.value }))
                    }
                    placeholder="e.g. PMP — Project Management Professional"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
                  />
                </label>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUploading || !(slotNames[slot.key] ?? '').trim()}
                    onClick={() => {
                      setActiveKey(slot.key);
                      fileRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5" />
                    )}
                    {isUploading ? 'Uploading…' : 'Attach the file'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(null);
                      setSlotNames((n) => ({ ...n, [slot.key]: '' }));
                    }}
                    className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(slot.key)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-500 transition-all hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-600"
              >
                <Plus className="h-3.5 w-3.5" />
                {filed.length
                  ? 'Add another'
                  : `Add a ${slot.label.toLowerCase().replace(/s$/, '')}`}
              </button>
            )}
          </div>
        )}

        {/* The four particulars, typed. They print on the appointment letter
            and go onto payroll, so an OCR read of the scan is not enough. */}
        {slot.particulars === 'nid' && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-[0.6875rem] font-semibold text-slate-600">
              Type these exactly as printed on your NID
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <NidField
                label="Name as per NID"
                value={nid.name}
                onChange={(v) => setNid((n) => ({ ...n, name: v }))}
                onCommit={() => saveNid.mutate({ name: nid.name })}
              />
              <NidField
                label="NID number"
                value={nid.number}
                onChange={(v) => setNid((n) => ({ ...n, number: v }))}
                onCommit={() => saveNid.mutate({ number: nid.number })}
              />
              <NidField
                label="Date of birth"
                type="date"
                value={nid.dateOfBirth}
                onChange={(v) => setNid((n) => ({ ...n, dateOfBirth: v }))}
                onCommit={() => saveNid.mutate({ dateOfBirth: nid.dateOfBirth })}
              />
              <NidField
                label="Address"
                value={nid.address}
                onChange={(v) => setNid((n) => ({ ...n, address: v }))}
                onCommit={() => saveNid.mutate({ address: nid.address })}
              />
            </div>
          </div>
        )}
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
                {/* Shimmers while there is still something to send, and
                    settles the moment the list is complete — the bar is the
                    one thing on this page the candidate watches. */}
                <div
                  className={cn(
                    'h-full rounded-full bg-accent-400 transition-[width] duration-700 ease-out',
                    progressPct > 0 &&
                      progressPct < 100 &&
                      'bg-[linear-gradient(90deg,#8cc63f_0%,#b6e06a_50%,#8cc63f_100%)] bg-[length:200%_100%] animate-shimmer',
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {progressPct === 100 && (
                <p className="mt-2 flex animate-card-in items-center gap-1.5 text-xs font-semibold text-accent-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Everything required is in — thank you.
                </p>
              )}
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
                        {/* Their signature, here, rather than a note telling
                            them to go and find the documents list. If it is
                            already on file it is simply used — asking twice
                            for the same image is how people conclude the form
                            did not save the first time. */}
                        <div className="mt-3 rounded-xl border border-brand-200 bg-white/70 px-3 py-2.5">
                          {data.signatureOnFile ? (
                            <p className="flex items-start gap-1.5 text-[0.6875rem] text-brand-800">
                              <FileSignature className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                              Your acceptance will be signed with the signature
                              you already uploaded. Nothing more to do.
                            </p>
                          ) : (
                            <>
                              <p className="text-[0.6875rem] font-semibold text-brand-800">
                                Add your signature
                              </p>
                              <p className="mt-0.5 text-[0.6875rem] text-brand-700">
                                A photo or scan of your signature — JPG or PNG.
                                You will crop it on the next screen.
                              </p>
                              <button
                                type="button"
                                disabled={upload.isPending}
                                onClick={() => {
                                  setActiveKey(SIGNATURE_KEY);
                                  fileRef.current?.click();
                                }}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-2.5 py-1.5 text-[0.6875rem] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                              >
                                <UploadCloud className="h-3.5 w-3.5" />
                                {upload.isPending ? 'Uploading…' : 'Upload signature'}
                              </button>
                            </>
                          )}
                        </div>
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
                      { icon: '📄', text: 'PDF, JPG or PNG' },
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
                  <h2 className="text-base font-bold text-slate-900">Your documents</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Upload each one below. Anything marked optional can be left
                    out if you do not have it.
                  </p>
                </div>

                {/* Grouped into sections rather than one long list.
                    Twenty-odd rows flat is a wall nobody reads, and the
                    sections are how the candidate actually gathers them —
                    the academic ones come out of one folder, the employment
                    ones out of another. */}
                {data.docSections.map((section, si) => {
                  const slots = data.docCatalogue.filter(
                    (d) => d.section === section.key,
                  );
                  if (!slots.length) return null;
                  // Documents, not slots. Counting slots said "1 added" for
                  // two certificates, because both sit in the one repeatable
                  // slot — and that count is only ever shown for sections
                  // whose whole point is holding several.
                  const filedHere = data.submitted.filter((sub) =>
                    slots.some((slot) => slot.key === sub.docKey),
                  ).length;
                  // Counted on the REQUIRED slots only. Counting optional
                  // ones as satisfied made an untouched section read "3/3",
                  // which says finished when nothing has been sent. A
                  // section with nothing required shows no counter at all —
                  // there is no number that could be wrong.
                  const required = slots.filter((d) => d.required);
                  const done = required.filter((slot) =>
                    data.submitted.some(
                      (sub) =>
                        sub.docKey === slot.key && sub.status !== 'rejected',
                    ),
                  ).length;
                  const complete =
                    required.length > 0 && done === required.length;
                  const isOpen = openSection === section.key;
                  const pct =
                    required.length > 0
                      ? Math.round((done / required.length) * 100)
                      : filedHere > 0
                        ? 100
                        : 0;
                  return (
                    <div
                      key={section.key}
                      className="animate-card-in"
                      style={{ animationDelay: `${si * 70}ms` }}
                    >
                      {/* The band is the control: it says where this section
                          stands and opens it. One section at a time keeps the
                          whole checklist inside a screen or two instead of a
                          page nobody reaches the bottom of. */}
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenSection(isOpen ? null : section.key)
                        }
                        className={cn(
                          'relative flex w-full items-center justify-between gap-3 border-t px-5 py-3 text-left transition-colors',
                          complete
                            ? 'border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50'
                            : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100/70',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'absolute inset-y-0 left-0 w-1 origin-top animate-rail-draw',
                            complete ? 'bg-emerald-400' : 'bg-brand-400',
                          )}
                        />
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wide',
                              complete ? 'text-emerald-700' : 'text-slate-600',
                            )}
                          >
                            {complete && (
                              <CheckCircle2 className="h-3.5 w-3.5 animate-card-in" />
                            )}
                            {section.label}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {section.blurb}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          {required.length > 0 ? (
                            <>
                              <span
                                className={cn(
                                  'text-[0.625rem] font-bold tabular-nums',
                                  complete ? 'text-emerald-600' : 'text-slate-400',
                                )}
                              >
                                {done}/{required.length}
                              </span>
                              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                                <span
                                  className={cn(
                                    'block h-full rounded-full transition-[width] duration-500 ease-out',
                                    complete ? 'bg-emerald-500' : 'bg-brand-500',
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </span>
                            </>
                          ) : (
                            // Nothing required here, so a bar would always read
                            // as complete. Say what has come in instead.
                            <span className="text-[0.625rem] font-semibold text-slate-400">
                              {filedHere > 0 ? `${filedHere} added` : 'optional'}
                            </span>
                          )}
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                              isOpen && 'rotate-180',
                            )}
                          />
                        </div>
                      </button>
                      {isOpen && (
                        <div className="divide-y divide-slate-100">
                          {slots.map(renderSlot)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Privacy notice */}
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="flex items-center gap-1.5 text-[0.6875rem] text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    Your documents are stored securely and shared only with DBL Group HR.
                    PDF, JPG or PNG · max 5 MB each.
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
                if (activeKey) upload.mutate({ docKey: activeKey, file: cropped });
              }}
            />
          </div>
        </div>
      )}

      {/* Hidden file input — PDF or a photo for documents; the signature is
          an image, and is cropped before it is sent. */}
      <input
        ref={fileRef}
        type="file"
        accept={activeSpec?.imageOnly || activeKey === SIGNATURE_KEY ? IMAGE_ACCEPT : ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file || !activeKey) return;

          // A slot that asks for a photograph takes only a photograph. The
          // passport photos become the candidate's picture everywhere, and
          // a PDF in an <img> is a broken icon.
          if (activeSpec?.imageOnly && !/^image\/(png|jpe?g)$/.test(file.type)) {
            toast.error(`${activeSpec.label} must be a JPG or PNG photograph.`);
            return;
          }
          if (activeKey === SIGNATURE_KEY) {
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

          if (!isJoiningDocType(file.type)) {
            toast.error('Please upload a PDF, JPG or PNG file.');
            return;
          }
          if (file.size > MAX_PDF_BYTES) {
            toast.error('File must be under 5 MB.');
            return;
          }
          upload.mutate({
            docKey: activeKey,
            file,
            label: slotNames[activeKey]?.trim() || undefined,
          });
        }}
      />

      {/* The signed offer, returned as a PDF */}
      <input
        ref={signedOfferRef}
        type="file"
        accept={PDF_ONLY_ACCEPT}
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

/**
 * One NID particular.
 *
 * Saves when the field loses focus rather than on every keystroke — the
 * candidate is often on a phone connection, and a request per character
 * would both hammer the server and lose races between them.
 */
function NidField({
  label,
  value,
  type = 'text',
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  type?: 'text' | 'date';
  onChange: (v: string) => void;
  onCommit: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-brand-300 focus:outline-none"
      />
    </label>
  );
}
