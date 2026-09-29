import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  FileText,
  Loader2,
  Search,
  Send,
  UploadCloud,
  X,
} from 'lucide-react';

import { Avatar, Portal } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { isValidBdMobile, toBdMobile } from '@shared/utils';
// By path, not the barrel: the requisition barrel already imports this module.
import { CV_SOURCES } from '@modules/requisition/constants';
import { CV_SOURCE_META } from '@modules/requisition/cvSourceMeta';
import {
  EmployeePicker,
  type PickedEmployee,
} from '@modules/requisition/components/EmployeePicker';
import type { CvSource } from '@modules/requisition/types/requisition.types';

import {
  useBulkCreateCandidates,
  useCreateCandidate,
} from '../hooks/useCandidates';
import { nameFromFileName } from './bulkCvName';

const MAX_FILES = 30;
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const REFERRAL: CvSource = 'employee_referral';

interface Row {
  key: string;
  /** Null for someone added by name, before any CV exists. */
  file: File | null;
  name: string;
}

type Audience = 'factory' | 'recruiter';

/** The words that differ between who is sending. */
const COPY: Record<Audience, { title: string; eyebrow: string; lands: string; note: string }> = {
  factory: {
    title: 'Send CVs to the recruiter',
    eyebrow: 'New submission',
    lands: 'Lands as Applied',
    note: 'The recruiter shortlists from what you send. Male / Female and “Applied before” appear once the AI has read each CV.',
  },
  recruiter: {
    title: 'Add candidates',
    eyebrow: 'Candidate pipeline',
    lands: 'Into the pipeline',
    note: 'Each CV is read and screened by the AI as it lands — match score, Male / Female and “Applied before” follow within a minute.',
  },
};

const rowOf = (f: File): Row => ({
  key: `${f.name}-${f.size}-${f.lastModified}`,
  file: f,
  name: nameFromFileName(f.name),
});

/**
 * Adding candidates to a job — the recruiter's pipeline, or Factory HR /
 * Factory HR Head sending CVs in to a published job (`audience`).
 *
 * One flow for one CV or thirty: where they came from, then the files. The
 * number of files decides the rest — one gets a short form (name, email,
 * mobile), several get a list of names to check. An employee referral is a
 * source like any other: choosing it asks for the employee, and nothing else.
 * Everything sent lands in the pipeline as Applied; the recruiter shortlists.
 */
export function SubmitCvsModal({
  reqId,
  reqLabel,
  cvSources,
  open,
  onClose,
  initialFiles,
  audience = 'factory',
}: {
  reqId: string;
  /** "REQ-0042 · Senior Executive". */
  reqLabel: string;
  cvSources?: CvSource[];
  open: boolean;
  onClose: () => void;
  /** Files dropped on the panel before the dialog opened. */
  initialFiles?: File[];
  /** Who is adding: the wording, and whether a candidate can come with no CV. */
  audience?: Audience;
}) {
  const copy = COPY[audience];
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const create = useCreateCandidate(reqId);
  const bulk = useBulkCreateCandidates(reqId, (done, total) => setProgress({ done, total }));
  const busy = create.isPending || bulk.isPending;

  const [source, setSource] = useState<CvSource | ''>('');
  const [referrer, setReferrer] = useState<PickedEmployee | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [remark, setRemark] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [failed, setFailed] = useState<{ fileName: string; error: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setSource('');
    setReferrer(null);
    setRows([]);
    setEmail('');
    setPhone('');
    setRemark('');
    setNotes([]);
    setFailed([]);
    setProgress(null);
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  /** Add files, refusing what cannot be a CV and saying why. */
  const add = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const refused: string[] = [];
    setRows((prev) => {
      // Real files replace a by-name entry.
      const next = prev.filter((r) => r.file);
      for (const f of incoming) {
        if (f.type !== 'application/pdf') refused.push(`${f.name} — PDF only`);
        else if (f.size > MAX_PDF_BYTES) refused.push(`${f.name} — over 5 MB`);
        else if (next.length >= MAX_FILES) refused.push(`${f.name} — ${MAX_FILES} at a time`);
        else if (!next.some((r) => r.key === rowOf(f).key)) next.push(rowOf(f));
      }
      return next;
    });
    setNotes(refused);
    setFailed([]);
  };

  // Files dropped on the panel arrive with the dialog. Only on opening:
  // re-running with every render would add the same files again.
  useEffect(() => {
    if (open && initialFiles?.length) add(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes, and the page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  /** The requisition's ticked sources, with Employee Referral always first. */
  const options = useMemo(() => {
    const ticked = CV_SOURCES.filter(
      (s) => s.value !== REFERRAL && (!cvSources?.length || cvSources.includes(s.value)),
    );
    const referral = CV_SOURCES.find((s) => s.value === REFERRAL);
    return referral ? [referral, ...ticked] : ticked;
  }, [cvSources]);

  const single = rows.length === 1;
  const phoneError =
    single && phone && !isValidBdMobile(phone)
      ? 'The 10 digits after +880, starting with 1'
      : undefined;
  const sourceDone = Boolean(source) && (source !== REFERRAL || Boolean(referrer));
  const byName = single && !rows[0].file;
  // The API refuses a referral without the CV — say so here instead.
  const referralNeedsCv = source === REFERRAL && byName;
  const filesDone =
    rows.length > 0 &&
    rows.every((r) => r.name.trim().length >= 2) &&
    !phoneError &&
    !referralNeedsCv;
  const canSend = sourceDone && filesDone && !busy;

  const blocker = !source
    ? 'Choose how these CVs reached you'
    : source === REFERRAL && !referrer
      ? 'Pick the employee who referred them'
      : !rows.length
        ? 'Add at least one CV'
        : referralNeedsCv
          ? 'A referral comes with the CV — attach it'
          : !filesDone
            ? single
              ? 'Type the candidate’s full name'
              : 'Check the names'
            : null;

  const send = () => {
    if (!canSend || !source) return;
    const referredByCode = source === REFERRAL ? referrer?.employeeCode : undefined;
    if (single) {
      create.mutate(
        {
          input: {
            name: rows[0].name.trim(),
            email: email.trim() || undefined,
            phone: toBdMobile(phone) || undefined,
            notes: remark.trim() || undefined,
            cvSource: source,
            referredByCode,
          },
          cv: rows[0].file ?? undefined,
        },
        {
          onSuccess: () => {
            reset();
            onClose();
          },
        },
      );
      return;
    }
    bulk.mutate(
      {
        cvSource: source,
        files: rows.map((r) => r.file as File),
        names: rows.map((r) => r.name.trim()),
        referredByCode,
      },
      {
        onSuccess: (result) => {
          if (!result.failed.length) {
            reset();
            onClose();
            return;
          }
          // Keep only what did not go in, so a retry cannot send the rest twice.
          const bad = new Set(result.failed.map((f) => f.fileName));
          setRows((prev) => prev.filter((r) => bad.has(r.file?.name ?? "")));
          setFailed(result.failed);
          setProgress(null);
        },
      },
    );
  };

  if (!open) return null;

  const sourceLabel = options.find((o) => o.value === source)?.label;
  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <div
          aria-hidden
          onClick={close}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-safe:animate-fade-in"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copy.title}
          className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 motion-safe:animate-rise-in"
        >
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* ── Left: where it goes, and how far along it is ── */}
            <aside className="relative shrink-0 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 px-6 py-6 text-white md:w-72">
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 top-10 h-40 w-40 rounded-full bg-emerald-300/20 blur-2xl"
              />
              <div className="relative">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur motion-safe:animate-float">
                  <Send className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold leading-snug">{copy.title}</h2>
                <p className="mt-1 text-sm text-white/75">{reqLabel}</p>

                <ol className="mt-8 space-y-4">
                  <StepItem
                    n={1}
                    done={sourceDone}
                    active={!sourceDone}
                    title="Source"
                    detail={
                      sourceDone
                        ? source === REFERRAL
                          ? `Referral · ${referrer?.name ?? ''}`
                          : sourceLabel
                        : 'How they reached you'
                    }
                  />
                  <StepItem
                    n={2}
                    done={filesDone}
                    active={sourceDone && !filesDone}
                    title="CVs"
                    detail={
                      byName
                        ? 'By name — no CV yet'
                        : rows.length
                          ? `${rows.length} PDF${rows.length === 1 ? '' : 's'}`
                          : 'One, or up to 30'
                    }
                  />
                  <StepItem
                    n={3}
                    done={false}
                    active={sourceDone && filesDone}
                    title={audience === 'recruiter' ? 'Add' : 'Send'}
                    detail={copy.lands}
                  />
                </ol>

                <p className="mt-8 hidden text-xs leading-relaxed text-white/65 md:block">
                  {copy.note}
                </p>
              </div>
            </aside>

            {/* ── Right: the form ── */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-6 pt-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {copy.eyebrow}
                </p>
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  aria-label="Close"
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 pb-6 pt-3">
                {/* ① Source */}
                <Section title="How did these CVs reach you?">
                  <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {options.map((o, i) => {
                      const meta = CV_SOURCE_META[o.value];
                      const Icon = meta.icon;
                      const on = source === o.value;
                      const featured = o.value === REFERRAL;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          disabled={busy}
                          onClick={() => {
                            setSource(o.value);
                            if (o.value !== REFERRAL) setReferrer(null);
                          }}
                          style={{ animationDelay: `${i * 25}ms` }}
                          className={cn(
                            'group relative flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all duration-200 motion-safe:animate-card-in',
                            featured && 'col-span-2 sm:col-span-3',
                            on
                              ? 'border-brand-400 bg-brand-50/60 shadow-sm ring-2 ring-brand-400/30'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm motion-safe:hover:-translate-y-px',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                              meta.badge,
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {o.label}
                            </span>
                            <span className="block truncate text-[0.6875rem] text-slate-500">
                              {meta.hint}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
                              on
                                ? 'scale-100 border-brand-600 bg-brand-600 text-white'
                                : 'scale-90 border-slate-300 text-transparent',
                            )}
                          >
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* The referrer, when that is the source — slides open. */}
                  <div
                    className={cn(
                      'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                      source === REFERRAL
                        ? 'mt-3 grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/50 p-3">
                        {referrer ? (
                          <div className="flex items-center gap-3 motion-safe:animate-fade-in">
                            <Avatar name={referrer.name} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-fuchsia-700">
                                Referred by
                              </p>
                              <p className="truncate text-sm font-medium text-slate-800">
                                {referrer.name}
                                <span className="font-normal text-slate-500">
                                  {' '}
                                  · {referrer.employeeCode}
                                  {referrer.jobTitle ? ` · ${referrer.jobTitle}` : ''}
                                </span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReferrer(null)}
                              disabled={busy}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-fuchsia-700 transition hover:bg-fuchsia-100"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fuchsia-800">
                              <Search className="h-3.5 w-3.5" />
                              Which employee referred them?
                              {rows.length > 1 && (
                                <span className="font-normal text-fuchsia-700/80">
                                  — recorded on all {rows.length}
                                </span>
                              )}
                            </p>
                            <EmployeePicker label="" value="" onPick={setReferrer} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Section>

                {/* ② CVs */}
                <Section title="CVs" hint={`PDF · up to 5 MB each · ${MAX_FILES} at a time`}>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) add(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      if (e.dataTransfer.files?.length) add(e.dataTransfer.files);
                    }}
                    className={cn(
                      'group flex w-full items-center gap-4 rounded-2xl border-2 border-dashed px-5 transition-all duration-200',
                      rows.length ? 'py-3' : 'py-7',
                      dragging
                        ? 'scale-[1.01] border-brand-400 bg-brand-50'
                        : 'border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200 transition-transform duration-200 group-hover:-translate-y-0.5',
                        rows.length ? 'h-9 w-9' : 'h-12 w-12',
                      )}
                    >
                      <UploadCloud className={rows.length ? 'h-4 w-4' : 'h-6 w-6'} />
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-semibold text-slate-800">
                        {byName
                          ? 'Have the CV after all? Drop it here'
                          : rows.length
                            ? 'Add more CVs'
                            : 'Drop CVs here, or click to browse'}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {rows.length
                          ? 'Drop them anywhere in this box'
                          : 'One CV gets a short form; several get a list of names to check'}
                      </span>
                    </span>
                  </button>

                  {audience === 'recruiter' && rows.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setRows([{ key: 'by-name', file: null, name: '' }])}
                      className="mt-2 text-xs font-medium text-brand-700 underline-offset-2 transition hover:underline"
                    >
                      No CV yet? Add a candidate by name
                    </button>
                  )}

                  {notes.length > 0 && (
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 motion-safe:animate-fade-in">
                      Not added: {notes.join(' · ')}
                    </p>
                  )}
                  {failed.length > 0 && (
                    <div className="mt-2 flex gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800 ring-1 ring-rose-200 motion-safe:animate-fade-in">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        These did not go in — the rest were sent:{' '}
                        {failed.map((f) => `${f.fileName} (${f.error})`).join(' · ')}
                      </p>
                    </div>
                  )}

                  {single && (
                    <div className="mt-3 rounded-2xl border border-slate-200 p-4 motion-safe:animate-card-in">
                      <FileHeader row={rows[0]} onRemove={() => setRows([])} disabled={busy} />
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Field label="Full name" className="sm:col-span-2">
                          <input
                            value={rows[0].name}
                            disabled={busy}
                            onChange={(e) => setRows([{ ...rows[0], name: e.target.value }])}
                            placeholder="e.g. Md. Rofiqul Islam"
                            className={inputCls(
                              rows[0].name.length > 0 && rows[0].name.trim().length < 2,
                            )}
                          />
                        </Field>
                        <Field label="Email" hint={rows[0].file ? 'read from the CV if blank' : undefined}>
                          <input
                            type="email"
                            value={email}
                            disabled={busy}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className={inputCls(false)}
                          />
                        </Field>
                        <Field label="Mobile" error={phoneError}>
                          <div
                            className={cn(
                              'flex overflow-hidden rounded-xl border bg-white transition focus-within:ring-2 focus-within:ring-brand-500/25',
                              phoneError
                                ? 'border-rose-300'
                                : 'border-slate-200 focus-within:border-brand-400',
                            )}
                          >
                            <span className="flex items-center border-r border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-500">
                              +880
                            </span>
                            <input
                              inputMode="numeric"
                              value={phone}
                              disabled={busy}
                              onChange={(e) =>
                                setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                              }
                              placeholder="1XXXXXXXXX"
                              className="h-10 min-w-0 flex-1 px-3 text-sm outline-none"
                            />
                          </div>
                        </Field>
                        <Field label="Notes" hint="optional" className="sm:col-span-2">
                          <textarea
                            value={remark}
                            disabled={busy}
                            onChange={(e) => setRemark(e.target.value)}
                            rows={2}
                            maxLength={2000}
                            placeholder={
                              audience === 'recruiter'
                                ? 'First impression, anything worth remembering…'
                                : 'Anything the recruiter should know…'
                            }
                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25"
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {rows.length > 1 && (
                    <ul className="mt-3 max-h-[34vh] space-y-2 overflow-y-auto pr-1">
                      {rows.map((r, i) => (
                        <li
                          key={r.key}
                          style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-slate-300 motion-safe:animate-card-in"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <input
                              value={r.name}
                              disabled={busy}
                              aria-label={`Name for ${r.file?.name}`}
                              onChange={(e) =>
                                setRows((p) =>
                                  p.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)),
                                )
                              }
                              className={cn(
                                'h-8 w-full rounded-lg border px-2 text-sm font-medium text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-500/25',
                                r.name.trim().length < 2
                                  ? 'border-rose-300'
                                  : 'border-transparent hover:border-slate-200 focus:border-brand-400',
                              )}
                            />
                            <p className="truncate px-2 text-[0.6875rem] text-slate-400" title={r.file?.name}>
                              {r.file?.name} · {((r.file?.size ?? 0) / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Remove ${r.file?.name}`}
                            onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </div>

              {/* ── Footer: what will happen, and the button that does it ── */}
              <div className="relative border-t border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
                {busy && (
                  <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-slate-100">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${single ? 70 : Math.max(pct, 8)}%` }}
                    />
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    {busy ? (
                      single || !progress ? (
                        'Saving to the job’s Drive folder…'
                      ) : (
                        `Sending ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                      )
                    ) : (
                      blocker ?? (
                        <span className="text-slate-700">
                          <span className="font-semibold">
                            {byName ? '1 candidate' : `${rows.length} CV${rows.length === 1 ? '' : 's'}`}
                          </span>{' '}
                          via{' '}
                          {source === REFERRAL
                            ? `referral from ${referrer?.name ?? ''}`
                            : sourceLabel}
                        </span>
                      )
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={close}
                      disabled={busy}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={send}
                      disabled={!canSend}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200',
                        canSend
                          ? 'bg-brand-600 shadow-brand-600/25 hover:bg-brand-700 hover:shadow-md active:scale-[0.98]'
                          : busy
                            ? 'bg-brand-500'
                            : 'cursor-not-allowed bg-slate-300',
                      )}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {audience === 'recruiter'
                        ? rows.length > 1
                          ? `Add ${rows.length} candidates`
                          : 'Add candidate'
                        : rows.length > 1
                          ? `Send ${rows.length} CVs`
                          : 'Send CV'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function StepItem({
  n,
  done,
  active,
  title,
  detail,
}: {
  n: number;
  done: boolean;
  active: boolean;
  title: string;
  detail?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
          done
            ? 'bg-white text-brand-700 motion-safe:animate-loader-pop'
            : active
              ? 'bg-white/20 text-white ring-2 ring-white/70'
              : 'bg-white/10 text-white/60 ring-1 ring-white/25',
        )}
      >
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
      </span>
      <span className="min-w-0 pt-0.5">
        <span
          className={cn(
            'block text-sm font-semibold',
            done || active ? 'text-white' : 'text-white/60',
          )}
        >
          {title}
        </span>
        {detail && <span className="block truncate text-xs text-white/65">{detail}</span>}
      </span>
    </li>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function FileHeader({
  row,
  onRemove,
  disabled,
}: {
  row: Row;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        {row.file ? (
          <>
            <p className="truncate text-sm font-medium text-slate-800" title={row.file.name}>
              {row.file.name}
            </p>
            <p className="text-xs text-slate-400">
              {(row.file.size / 1024 / 1024).toFixed(1)} MB · PDF
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-800">Added by name</p>
            <p className="text-xs text-slate-400">Upload the CV later from the candidate&rsquo;s row</p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove CV"
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 flex items-baseline gap-1.5 text-xs font-medium text-slate-600">
        {label}
        {hint && <span className="font-normal text-slate-400">· {hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[0.6875rem] text-rose-600">{error}</span>}
    </label>
  );
}

function inputCls(invalid: boolean) {
  return cn(
    'h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-500/25',
    invalid ? 'border-rose-300' : 'border-slate-200 focus:border-brand-400',
  );
}
