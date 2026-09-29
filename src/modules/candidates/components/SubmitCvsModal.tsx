import { useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  FileText,
  Files,
  Send,
  Upload,
  User,
  UserPlus,
  X,
} from 'lucide-react';

import {
  BusyOverlay,
  Button,
  Input,
  Modal,
  PhoneInput,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { isValidBdMobile, toBdMobile } from '@shared/utils';
// By path, not the barrel: the requisition barrel already imports this module.
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
import { CvSourcePicker } from './CvSourcePicker';

const MAX_FILES = 30;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

type Mode = 'single' | 'bulk';

interface Row {
  key: string;
  file: File;
  name: string;
}

/**
 * Factory HR / Factory HR Head sending CVs in to a published job.
 *
 * They know who is looking for work locally; the recruiter decides who is
 * shortlisted. So this is a sending form, not the recruiter's pipeline: one CV
 * or up to thirty, always with where they came from, and — for a single CV —
 * the employee who referred them. Everything sent lands in the pipeline as
 * Applied, and the recruiter is told.
 */
export function SubmitCvsModal({
  reqId,
  reqLabel,
  cvSources,
  open,
  onClose,
}: {
  reqId: string;
  /** "REQ-0042 · Senior Executive", shown under the title. */
  reqLabel: string;
  cvSources?: CvSource[];
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>('single');
  const [source, setSource] = useState('');

  // Single
  const create = useCreateCandidate(reqId);
  const singleRef = useRef<HTMLInputElement>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [referred, setReferred] = useState(false);
  const [referrer, setReferrer] = useState<PickedEmployee | null>(null);

  // Bulk
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const bulk = useBulkCreateCandidates(reqId, (done, total) =>
    setProgress({ done, total }),
  );
  const bulkRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [failed, setFailed] = useState<{ fileName: string; error: string }[]>(
    [],
  );

  const [notes, setNotes] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const busy = create.isPending || bulk.isPending;

  const reset = () => {
    setMode('single');
    setSource('');
    setCv(null);
    setName('');
    setEmail('');
    setPhone('');
    setReferred(false);
    setReferrer(null);
    setRows([]);
    setFailed([]);
    setNotes([]);
    setProgress(null);
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  /** Why a file is refused, or null when it is a usable CV. */
  const refusal = (f: File): string | null =>
    f.type !== 'application/pdf'
      ? `${f.name} — PDF only`
      : f.size > MAX_PDF_BYTES
        ? `${f.name} — over 5 MB`
        : null;

  const pickSingle = (f?: File | null) => {
    if (!f) return;
    const why = refusal(f);
    setNotes(why ? [why] : []);
    if (why) return;
    setCv(f);
    if (!name.trim()) setName(nameFromFileName(f.name));
  };

  const addBulk = (list: FileList | File[]) => {
    const refused: string[] = [];
    const next = [...rows];
    for (const f of Array.from(list)) {
      const why = refusal(f);
      if (why) refused.push(why);
      else if (next.length >= MAX_FILES)
        refused.push(`${f.name} — ${MAX_FILES} CVs at a time`);
      else if (!next.some((r) => r.file.name === f.name && r.file.size === f.size))
        next.push({
          key: `${f.name}-${f.size}-${f.lastModified}`,
          file: f,
          name: nameFromFileName(f.name),
        });
    }
    setRows(next);
    setNotes(refused);
  };

  const phoneError =
    phone && !isValidBdMobile(phone)
      ? 'Enter the 10 digits after +880, starting with 1 (e.g. 1712345678)'
      : undefined;

  const singleReady =
    Boolean(cv) &&
    name.trim().length >= 2 &&
    !phoneError &&
    (!referred || Boolean(referrer));
  const bulkReady =
    rows.length > 0 && rows.every((r) => r.name.trim().length >= 2);
  const canSend = Boolean(source) && (mode === 'single' ? singleReady : bulkReady);

  const blocker = !source
    ? 'Choose where the CV came from.'
    : mode === 'single'
      ? !cv
        ? 'Attach the CV.'
        : referred && !referrer
          ? 'Pick the employee who referred them.'
          : null
      : !rows.length
        ? 'Add at least one CV.'
        : null;

  const send = () => {
    if (!canSend) return;
    if (mode === 'single') {
      create.mutate(
        {
          input: {
            name: name.trim(),
            email: email.trim() || undefined,
            phone: toBdMobile(phone) || undefined,
            cvSource: source,
            referredByCode:
              referred && referrer ? referrer.employeeCode : undefined,
          },
          cv: cv ?? undefined,
        },
        { onSuccess: close },
      );
      return;
    }
    bulk.mutate(
      {
        cvSource: source,
        files: rows.map((r) => r.file),
        names: rows.map((r) => r.name.trim()),
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
          setRows((prev) => prev.filter((r) => bad.has(r.file.name)));
          setFailed(result.failed);
        },
      },
    );
  };

  const count = mode === 'single' ? (cv ? 1 : 0) : rows.length;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Send CVs to the recruiter"
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {blocker ??
              'They go into the pipeline as Applied; the recruiter shortlists.'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={send}
              isLoading={busy}
              disabled={!canSend}
              leftIcon={<Send className="h-4 w-4" />}
            >
              {count > 1 ? `Send ${count} CVs` : 'Send CV'}
            </Button>
          </div>
        </div>
      }
    >
      <BusyOverlay
        show={bulk.isPending}
        label={
          progress && progress.total
            ? `Sending CV ${Math.min(progress.done + 1, progress.total)} of ${progress.total}`
            : 'Sending CVs…'
        }
        sublabel="Saving each CV to the job's Drive folder. Keep this tab open."
      />

      <div className="space-y-5">
        <p className="-mt-1 text-sm text-slate-500">
          For <span className="font-medium text-slate-700">{reqLabel}</span>
        </p>

        {/* One or many */}
        <div
          role="tablist"
          aria-label="How many CVs"
          className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
        >
          {(
            [
              { key: 'single', label: 'One CV', hint: 'with details and referral', icon: User },
              { key: 'bulk', label: 'Several CVs', hint: `up to ${MAX_FILES} PDFs`, icon: Files },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={mode === t.key}
              disabled={busy}
              onClick={() => {
                setMode(t.key);
                setNotes([]);
              }}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
                mode === t.key
                  ? 'bg-white font-semibold text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <t.icon className="h-4 w-4" />
              <span>
                {t.label}
                <span className="hidden text-xs font-normal text-slate-400 sm:inline">
                  {' '}
                  · {t.hint}
                </span>
              </span>
            </button>
          ))}
        </div>

        <Step n={1} title="Where did the CV come from?" hint="Required">
          <CvSourcePicker value={source} onChange={setSource} cvSources={cvSources} />
        </Step>

        {mode === 'single' ? (
          <>
            <Step n={2} title="CV" hint="PDF, up to 5 MB">
              <input
                ref={singleRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  pickSingle(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              {cv ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800" title={cv.name}>
                      {cv.name}
                    </span>
                    <span className="block text-[0.6875rem] text-slate-500">
                      {(cv.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label="Remove CV"
                    onClick={() => setCv(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <DropZone
                  dragging={dragging}
                  setDragging={setDragging}
                  onClick={() => singleRef.current?.click()}
                  onDrop={(files) => pickSingle(files[0])}
                  icon={<Upload className="h-4 w-4" />}
                  title="Drop the CV here, or click to choose"
                  hint="The name is filled in from the file — correct it below."
                />
              )}
            </Step>

            <Step n={3} title="Candidate">
              <div className="space-y-3">
                <Input
                  label="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Md. Rofiqul Islam"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Read from the CV if left blank"
                  />
                  <PhoneInput
                    label="Mobile"
                    value={phone}
                    onChange={setPhone}
                    error={phoneError}
                  />
                </div>
              </div>
            </Step>

            <Step n={4} title="Employee referral" hint="Optional">
              <button
                type="button"
                role="switch"
                aria-checked={referred}
                onClick={() => {
                  setReferred((v) => !v);
                  if (referred) setReferrer(null);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                  referred
                    ? 'border-violet-200 bg-violet-50/70'
                    : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    referred ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  <UserPlus className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-800">
                    Referred by an employee
                  </span>
                  <span className="block text-xs text-slate-500">
                    Pick who put them forward from the employee directory.
                  </span>
                </span>
                <span
                  className={cn(
                    'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                    referred ? 'bg-violet-600' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                      referred ? 'left-[1.125rem]' : 'left-0.5',
                    )}
                  />
                </span>
              </button>
              {referred && (
                <div className="mt-2.5">
                  {referrer ? (
                    <div className="flex items-start gap-2.5 rounded-lg border border-violet-200 bg-white px-3 py-2">
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                          Referred by
                        </p>
                        <p className="truncate text-slate-800">
                          <span className="font-mono">{referrer.employeeCode}</span>
                          {' – '}
                          <span className="font-medium">{referrer.name}</span>
                          {referrer.jobTitle ? ` – ${referrer.jobTitle}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Change referrer"
                        onClick={() => setReferrer(null)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <EmployeePicker label="Referred by" value="" onPick={setReferrer} />
                  )}
                </div>
              )}
            </Step>
          </>
        ) : (
          <Step n={2} title="CVs" hint={`PDF, up to 5 MB each · ${MAX_FILES} at a time`}>
            <input
              ref={bulkRef}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addBulk(e.target.files);
                e.target.value = '';
              }}
            />
            <DropZone
              dragging={dragging}
              setDragging={setDragging}
              onClick={() => bulkRef.current?.click()}
              onDrop={addBulk}
              icon={<Files className="h-4 w-4" />}
              title="Drop PDF CVs here, or click to choose"
              hint="Each file is one candidate. Email and mobile are read from the CV."
            />

            {failed.length > 0 && (
              <div className="mt-3 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">
                    These did not go in — the rest were sent. Try again or remove them.
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {failed.map((f) => (
                      <li key={f.fileName} className="break-words">
                        <span className="font-medium">{f.fileName}</span>: {f.error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {rows.length > 0 && (
              <ul className="mt-3 max-h-[36vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {rows.map((r) => (
                  <li key={r.key} className="flex items-center gap-2 px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <input
                        value={r.name}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.key === r.key ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                        aria-label={`Candidate name for ${r.file.name}`}
                        className={cn(
                          'h-8 w-full rounded-md border px-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                          r.name.trim().length < 2
                            ? 'border-rose-300'
                            : 'border-slate-200 focus:border-brand-400',
                        )}
                      />
                      <p className="mt-0.5 truncate text-[0.6875rem] text-slate-400" title={r.file.name}>
                        {r.file.name} · {(r.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${r.file.name}`}
                      disabled={busy}
                      onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Step>
        )}

        {notes.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-semibold">Not added:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {notes.map((n) => (
                <li key={n} className="break-all">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function DropZone({
  dragging,
  setDragging,
  onClick,
  onDrop,
  icon,
  title,
  hint,
}: {
  dragging: boolean;
  setDragging: (v: boolean) => void;
  onClick: () => void;
  onDrop: (files: FileList) => void;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) onDrop(e.dataTransfer.files);
      }}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 text-left transition-colors',
        dragging
          ? 'border-brand-400 bg-brand-50'
          : 'border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40',
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium text-slate-700">{title}</span>
        <span className="block text-xs text-slate-400">{hint}</span>
      </span>
    </button>
  );
}

/** A numbered step of the form, so it reads top to bottom. */
function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[0.625rem] font-bold text-white">
          {n}
        </span>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {hint && <span className="text-xs text-slate-400">· {hint}</span>}
      </div>
      {children}
    </section>
  );
}
