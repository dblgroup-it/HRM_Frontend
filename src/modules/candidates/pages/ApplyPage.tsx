import { useRef, useState, type FormEvent, type DragEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';

import { Logo } from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';
import { candidatesApi } from '../api/candidates.api';

const ACCEPT = '.pdf,application/pdf';
const MAX_PDF_BYTES = 5 * 1024 * 1024;

function validatePdf(file: File): string | null {
  if (file.type !== 'application/pdf') return 'Only PDF files are accepted.';
  if (file.size > MAX_PDF_BYTES) return 'File must be under 5 MB.';
  return null;
}

function errMsg(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

const EMP_LABEL: Record<string, string> = {
  permanent: 'Permanent',
  contractual: 'Contractual',
  part_time: 'Part Time',
  internship: 'Internship',
  probationary: 'Probationary',
};

// ── Reusable field component ──────────────────────────────────────────────────
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export default function ApplyPage() {
  const { reqId = '' } = useParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

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

  const pickFile = (file: File) => {
    const err = validatePdf(file);
    if (err) { setError(err); return; }
    setError('');
    setCv(file);
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Please enter your full name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return setError('Please enter a valid email address.');
    if (!cv) return setError('Please attach your CV.');
    apply.mutate();
  };

  // ── Loading ──
  if (job.isLoading) {
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

  // ── Not found ──
  if (job.isError || !job.data) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-2">
            <Logo />
            <Link to={ROUTES.careers} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-600 transition">
              <ArrowLeft className="h-3.5 w-3.5" /> Browse all jobs
            </Link>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm animate-rise-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Briefcase className="h-7 w-7 text-slate-300" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-800">Position not available</h2>
            <p className="mt-2 text-sm text-slate-500">
              This job is no longer open for applications, or the link is invalid.
            </p>
            <Link
              to={ROUTES.careers}
              className="mt-6 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition active:scale-95"
            >
              Browse open positions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (apply.isSuccess) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md">
          <Logo />
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm animate-rise-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            </div>
            <h1 className="mt-5 text-xl font-bold text-slate-900">Application received!</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
              Thank you for applying for{' '}
              <span className="font-semibold text-slate-700">{job.data.designation}</span> at DBL Group.
              Our recruitment team will review your CV and reach out if your profile matches.
            </p>
            <div className="mt-6 space-y-2">
              <Link
                to={ROUTES.applyStatus}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition"
              >
                <ClipboardList className="h-4 w-4" /> Track your application
              </Link>
              <Link
                to={ROUTES.careers}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 transition"
              >
                Browse more jobs
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const empLabel = EMP_LABEL[job.data.employmentNature] ?? job.data.employmentNature;

  // ── Main form ──
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Sticky nav */}
      <header className="sticky top-0 z-30 border-b border-white/20 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={ROUTES.applyStatus}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-600"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Track application</span>
            </Link>
            <Link
              to={ROUTES.careers}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-600 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">All jobs</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 px-4 py-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl animate-blob-1" aria-hidden />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-accent-400/15 blur-3xl animate-blob-2" aria-hidden />
        <div className="relative z-10 mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/70 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-pulse" />
            Now hiring · DBL Group
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl animate-rise-in">
            {job.data.designation}
          </h1>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/80 animate-rise-in" style={{ animationDelay: '60ms' }}>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 shrink-0" /> {job.data.unitFactory}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" /> {job.data.placeOfPosting}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 shrink-0" /> {job.data.requiredPosts} {job.data.requiredPosts === 1 ? 'vacancy' : 'vacancies'}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 animate-rise-in" style={{ animationDelay: '100ms' }}>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
              {empLabel}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
              {job.data.code}
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-5">

            {/* Left: tips card */}
            <aside className="order-2 lg:order-1 lg:col-span-2">
              <div className="sticky top-20 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-rise-in" style={{ animationDelay: '120ms' }}>
                  <h3 className="text-sm font-bold text-slate-800">How to apply</h3>
                  <ol className="mt-3 space-y-3">
                    {[
                      'Fill in your personal details accurately.',
                      'Attach your CV — PDF format only, max 5 MB.',
                      'Submit and track your status with your email.',
                    ].map((step, i) => (
                      <li key={i} className="flex gap-3 text-xs text-slate-500">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-rise-in" style={{ animationDelay: '160ms' }}>
                  <h3 className="text-sm font-bold text-slate-800">CV requirements</h3>
                  <ul className="mt-3 space-y-2">
                    {[
                      { icon: '📄', text: 'PDF format only' },
                      { icon: '⚖️', text: 'Maximum 5 MB' },
                      { icon: '🔤', text: 'File must be in English' },
                    ].map((item) => (
                      <li key={item.text} className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{item.icon}</span> {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>

            {/* Right: form */}
            <div className="order-1 lg:order-2 lg:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm animate-rise-in" style={{ animationDelay: '80ms' }}>
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-base font-bold text-slate-900">Your application</h2>
                  <p className="mt-0.5 text-xs text-slate-400">All starred fields are required.</p>
                </div>

                <form onSubmit={submit} className="space-y-5 p-6">
                  {/* Full name */}
                  <Field label="Full name" required>
                    <input
                      className={INPUT}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                  </Field>

                  {/* Email + Phone */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Email address" required>
                      <input
                        className={INPUT}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </Field>
                    <Field label="Phone number">
                      <input
                        className={INPUT}
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        autoComplete="tel"
                      />
                    </Field>
                  </div>

                  {/* Salary */}
                  <Field label="Expected salary (BDT)">
                    <input
                      className={INPUT}
                      value={salaryExpectation}
                      onChange={(e) => setSalaryExpectation(e.target.value)}
                      placeholder="e.g. 40,000 or Negotiable"
                    />
                  </Field>

                  {/* CV upload */}
                  <Field label="CV / Resume" required>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPT}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) pickFile(f);
                        e.target.value = '';
                      }}
                    />
                    {cv ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                            <FileText className="h-5 w-5 text-brand-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">{cv.name}</p>
                            <p className="text-xs text-slate-400">{(cv.size / 1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCv(null)}
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-brand-100 hover:text-rose-500 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        onDrop={onDrop}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all ${
                          dragging
                            ? 'border-brand-400 bg-brand-50 scale-[1.01]'
                            : 'border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/50'
                        }`}
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${dragging ? 'bg-brand-100' : 'bg-white border border-slate-200'}`}>
                          <UploadCloud className={`h-6 w-6 transition-colors ${dragging ? 'text-brand-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            {dragging ? 'Drop your CV here' : 'Click to upload or drag & drop'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">PDF only · max 5 MB</p>
                        </div>
                      </button>
                    )}
                  </Field>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 animate-fade-in">
                      <X className="mt-0.5 h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={apply.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-200 transition hover:bg-brand-700 disabled:opacity-60 active:scale-[0.98]"
                  >
                    {apply.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                    ) : (
                      'Submit application'
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-400">
                    Your details are shared only with DBL Group recruitment.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} DBL Group · All rights reserved</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <Link to={ROUTES.careers} className="text-brand-500 hover:underline">Browse all jobs</Link>
            <Link to={ROUTES.applyStatus} className="text-brand-500 hover:underline">Track application</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
