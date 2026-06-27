import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  Lock,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Logo } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { onboardingApi } from '../api/onboarding.api';
import type { DocStatus } from '../types/onboarding.types';

const ACCEPT = '.pdf,application/pdf';
const MAX_PDF_BYTES = 5 * 1024 * 1024;

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

export default function OnboardingPage() {
  const { token = '' } = useParams();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

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
    onError: () => toast.error('Upload failed — please try again'),
  });

  const accept = useMutation({
    mutationFn: () => onboardingApi.publicAccept(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-onboarding', token] });
      toast.success('Offer accepted! Welcome to DBL Group 🎉');
    },
    onError: () => toast.error('Could not accept the offer'),
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/70 backdrop-blur-sm">
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
                {/* Offer banner */}
                {data.offerSentAt && (
                  <div
                    className={cn(
                      'rounded-2xl border p-5 shadow-sm animate-rise-in',
                      data.offerAcceptedAt
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-brand-200 bg-brand-50',
                    )}
                    style={{ animationDelay: '80ms' }}
                  >
                    {data.offerAcceptedAt ? (
                      <div className="text-center">
                        <PartyPopper className="mx-auto h-8 w-8 text-emerald-500" />
                        <p className="mt-2 text-sm font-bold text-emerald-700">Offer accepted!</p>
                        <p className="mt-1 text-xs text-emerald-600">Welcome aboard — next steps will follow by email.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-brand-800">🎉 You have an offer!</p>
                        <p className="mt-1 text-xs text-brand-600">DBL Group has extended you an employment offer. Please review and accept.</p>
                        <button
                          disabled={accept.isPending}
                          onClick={() => accept.mutate()}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
                        >
                          {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept offer'}
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
                  {data.requiredDocs.map((label, i) => {
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
                              'mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
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
                  })}
                </div>

                {/* Privacy notice */}
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
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

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            if (file.type !== 'application/pdf') {
              toast.error('Only PDF files are accepted.');
              e.target.value = '';
              return;
            }
            if (file.size > MAX_PDF_BYTES) {
              toast.error('File must be under 5 MB.');
              e.target.value = '';
              return;
            }
            if (activeLabel) upload.mutate({ label: activeLabel, file });
          }
          e.target.value = '';
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
