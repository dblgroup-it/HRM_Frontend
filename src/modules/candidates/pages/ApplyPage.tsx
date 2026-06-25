import { useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  MapPin,
  Paperclip,
  UploadCloud,
  X,
} from 'lucide-react';

import { Button, FullPageSpinner, Input, Logo } from '@shared/components/ui';

import { candidatesApi } from '../api/candidates.api';

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg';

function errMsg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

export default function ApplyPage() {
  const { reqId = '' } = useParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const job = useQuery({
    queryKey: ['apply', reqId],
    queryFn: () => candidatesApi.jobInfo(reqId),
    retry: false,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [cv, setCv] = useState<File | null>(null);
  const [error, setError] = useState('');

  const apply = useMutation({
    mutationFn: () =>
      candidatesApi.apply(
        reqId,
        { name, email, phone, salaryExpectation: salaryExpectation.trim() || undefined },
        cv as File,
      ),
    onError: (e) => setError(errMsg(e, 'Something went wrong. Please try again.')),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Please enter your full name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return setError('Please enter a valid email address.');
    }
    if (!cv) return setError('Please attach your CV.');
    apply.mutate();
  };

  if (job.isLoading) return <FullPageSpinner label="Loading position…" />;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        {job.isError || !job.data ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-800">
              Position not available
            </p>
            <p className="mt-1 text-sm text-slate-500">
              This job is no longer open for applications, or the link is
              invalid.
            </p>
          </div>
        ) : apply.isSuccess ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">
              Application received
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Thank you for applying for{' '}
              <span className="font-medium text-slate-700">
                {job.data.designation}
              </span>{' '}
              at DBL Group. Our recruitment team will review your CV and reach
              out if your profile matches.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Job header */}
            <div className="border-b border-slate-100 bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-6 text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                {job.data.code} · We&rsquo;re hiring
              </p>
              <h1 className="mt-1 text-2xl font-semibold">
                {job.data.designation}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/90">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> {job.data.unitFactory}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {job.data.placeOfPosting}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-4 p-6">
              <p className="text-sm text-slate-500">
                Fill in your details and attach your CV to apply.
              </p>

              <Input
                label="Full name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Email *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <Input
                  label="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <Input
                label="Expected Salary (BDT)"
                value={salaryExpectation}
                onChange={(e) => setSalaryExpectation(e.target.value)}
                placeholder="e.g. 40,000 or Negotiable"
              />

              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">
                  CV / Resume *
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => setCv(e.target.files?.[0] ?? null)}
                />
                {cv ? (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2 truncate text-slate-700">
                      <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{cv.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCv(null)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <UploadCloud className="h-6 w-6 text-slate-400" />
                    Click to attach your CV
                    <span className="text-xs text-slate-400">
                      PDF, DOC, DOCX or image · up to 10 MB
                    </span>
                  </button>
                )}
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={apply.isPending}
              >
                Submit application
              </Button>
              <p className="text-center text-xs text-slate-400">
                Powered by DBL HRM · Your details are shared only with DBL Group
                recruitment.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
