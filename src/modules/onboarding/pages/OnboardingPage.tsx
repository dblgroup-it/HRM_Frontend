import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  PartyPopper,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button, FullPageSpinner, Logo } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { onboardingApi } from '../api/onboarding.api';
import type { DocStatus } from '../types/onboarding.types';

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg';

const DOC_TONE: Record<DocStatus, string> = {
  pending: 'text-amber-600 bg-amber-50',
  verified: 'text-emerald-600 bg-emerald-50',
  rejected: 'text-rose-600 bg-rose-50',
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
      toast.success('Document uploaded');
    },
    onError: () => toast.error('Upload failed — please try again'),
  });

  const accept = useMutation({
    mutationFn: () => onboardingApi.publicAccept(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-onboarding', token] });
      toast.success('Offer accepted');
    },
    onError: () => toast.error('Could not accept the offer'),
  });

  if (isLoading) return <FullPageSpinner label="Loading…" />;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        {isError || !data ? (
          <Card>
            <p className="text-lg font-semibold text-slate-800">
              Link not available
            </p>
            <p className="mt-1 text-sm text-slate-500">
              This onboarding link is invalid or has expired.
            </p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-6 text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                {data.code} · Welcome to DBL Group
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{data.designation}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/90">
                <Building2 className="h-4 w-4" /> {data.unit}
              </p>
            </div>

            <div className="space-y-6 p-6">
              <p className="text-sm text-slate-600">
                Hi {data.candidateName}, please upload your joining documents
                below. Our team will verify each one.
              </p>

              {/* Offer banner */}
              {data.offerSentAt && (
                <div
                  className={cn(
                    'rounded-xl border p-4',
                    data.offerAcceptedAt
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-brand-200 bg-brand-50',
                  )}
                >
                  {data.offerAcceptedAt ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                      <PartyPopper className="h-4 w-4" /> You&rsquo;ve accepted
                      your offer — welcome aboard! Next steps will follow by
                      email.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium text-brand-800">
                        🎉 You&rsquo;ve received an offer of employment.
                      </p>
                      <Button
                        size="sm"
                        isLoading={accept.isPending}
                        onClick={() => accept.mutate()}
                      >
                        Accept offer
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Document checklist */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Required documents
                </p>
                {data.requiredDocs.map((label) => {
                  const submitted = data.submitted.filter(
                    (s) => s.label === label,
                  );
                  return (
                    <div
                      key={label}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5"
                    >
                      <FileCheck2 className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 text-sm text-slate-700">
                        {label}
                      </span>
                      {submitted.map((s) => (
                        <span
                          key={s.id}
                          className={cn(
                            'rounded px-2 py-0.5 text-[11px] font-medium capitalize',
                            DOC_TONE[s.status],
                          )}
                        >
                          {s.status}
                        </span>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={upload.isPending && activeLabel === label}
                        leftIcon={<UploadCloud className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setActiveLabel(label);
                          fileRef.current?.click();
                        }}
                      >
                        {submitted.length > 0 ? 'Replace' : 'Upload'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Your documents are shared
                only with DBL Group HR. PDF, DOC or image · up to 10 MB each.
              </p>
            </div>
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
          if (file && activeLabel) upload.mutate({ label: activeLabel, file });
          e.target.value = '';
        }}
      />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      {children}
    </div>
  );
}
