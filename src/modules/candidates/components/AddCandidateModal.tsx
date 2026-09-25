import { useRef, useState, type ReactNode } from 'react';
import { FileText, Upload, UserPlus, X } from 'lucide-react';

import {
  Button,
  Input,
  Modal,
  PhoneInput,
  Textarea,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { isValidBdMobile, toBdMobile } from '@shared/utils';
// By path, not the barrel: the requisition barrel already imports this module.
import {
  EmployeePicker,
  type PickedEmployee,
} from '@modules/requisition/components/EmployeePicker';
import type { CvSource } from '@modules/requisition/types/requisition.types';

import { useCreateCandidate } from '../hooks/useCandidates';
import { nameFromFileName } from './bulkCvName';
import { CvSourcePicker } from './CvSourcePicker';

const MAX_PDF_BYTES = 5 * 1024 * 1024;

/**
 * One candidate, by hand.
 *
 * Laid out in the order the work actually happens: the CV first — dropping it
 * fills in the name from the file, as bulk upload does — then who they are,
 * where the CV came from, and whether an employee referred them.
 */
export function AddCandidateModal({
  reqId,
  cvSources,
  open,
  onClose,
}: {
  reqId: string;
  /** The requisition's ticked CV sources; empty or absent offers them all. */
  cvSources?: CvSource[];
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateCandidate(reqId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [cv, setCv] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [referred, setReferred] = useState(false);
  const [referrer, setReferrer] = useState<PickedEmployee | null>(null);
  const [source, setSource] = useState('');

  const reset = () => {
    setSource('');
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setCv(null);
    setCvError(null);
    setReferred(false);
    setReferrer(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setCvError(`${f.name} is not a PDF — only PDF CVs are accepted.`);
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setCvError(`${f.name} is over 5 MB.`);
      return;
    }
    setCvError(null);
    setCv(f);
    // Only fill an empty name — never overwrite what someone typed.
    if (!name.trim()) setName(nameFromFileName(f.name));
  };

  // Optional, but if started it has to be a whole number.
  const phoneError =
    phone && !isValidBdMobile(phone)
      ? 'Enter the 10 digits after +880, starting with 1 (e.g. 1712345678)'
      : undefined;
  // A referral comes with the referrer and the CV together — the API
  // refuses one without the other, so the button says so first.
  const referralIncomplete = referred && (!referrer || !cv);
  const canSubmit =
    name.trim().length >= 2 && !phoneError && !referralIncomplete;

  const submit = () => {
    if (!canSubmit) return;
    create.mutate(
      {
        input: {
          name: name.trim(),
          email: email.trim() || undefined,
          phone: toBdMobile(phone) || undefined,
          notes: notes.trim() || undefined,
          referredByCode:
            referred && referrer ? referrer.employeeCode : undefined,
          cvSource: source || undefined,
        },
        cv: cv ?? undefined,
      },
      { onSuccess: close },
    );
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a candidate"
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {referralIncomplete
              ? 'A referral needs the referrer and the CV.'
              : cv
                ? 'The AI screen reads email and mobile off the CV if left blank.'
                : 'Only the name is required.'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              isLoading={create.isPending}
              disabled={!canSubmit}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              Add candidate
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ① The CV */}
        <Section n={1} title="CV" hint={referred ? 'Required for a referral' : 'PDF, up to 5 MB'}>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
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
                  {(cv.size / 1024 / 1024).toFixed(1)} MB · saved to the
                  requisition&rsquo;s &ldquo;All CVs&rdquo; folder
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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 text-left transition-colors',
                dragging
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40',
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200">
                <Upload className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-700">
                  Drop the CV here, or click to choose
                </span>
                <span className="block text-xs text-slate-400">
                  The name is filled in from the file — correct it below.
                </span>
              </span>
            </button>
          )}
          {cvError && <p className="mt-1.5 text-xs text-rose-600">{cvError}</p>}
        </Section>

        {/* ② Who they are */}
        <Section n={2} title="Candidate">
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
                placeholder="name@example.com"
              />
              <PhoneInput
                label="Mobile"
                value={phone}
                onChange={setPhone}
                error={phoneError}
              />
            </div>
          </div>
        </Section>

        {/* ③ Where the CV came from */}
        <Section n={3} title="Where did this CV come from?" hint="Optional">
          <CvSourcePicker
            value={source}
            onChange={setSource}
            cvSources={cvSources}
            optional
          />
        </Section>

        {/* ④ Referral */}
        <Section n={4} title="Employee referral">
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
        </Section>

        {/* ⑤ Notes */}
        <Section n={5} title="Notes" hint="Optional">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="First impression, anything the recruiter should know…"
            rows={2}
          />
        </Section>
      </div>
    </Modal>
  );
}

/** A numbered step of the form, so it reads top to bottom. */
function Section({
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
