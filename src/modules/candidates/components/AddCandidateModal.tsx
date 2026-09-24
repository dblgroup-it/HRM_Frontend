import { useRef, useState } from 'react';
import { Paperclip, UserPlus, X } from 'lucide-react';

import {
  Button,
  Checkbox,
  Input,
  Modal,
  PhoneInput,
  Select,
  Textarea,
} from '@shared/components/ui';
import { isValidBdMobile, toBdMobile } from '@shared/utils';
// By path, not the barrel: the requisition barrel already imports this module.
import {
  EmployeePicker,
  type PickedEmployee,
} from '@modules/requisition/components/EmployeePicker';
import { CV_SOURCES } from '@modules/requisition/constants';
import type { CvSource } from '@modules/requisition/types/requisition.types';

import { useCreateCandidate } from '../hooks/useCandidates';

const ACCEPT = '.pdf,application/pdf';
const MAX_PDF_BYTES = 5 * 1024 * 1024;

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
  const [referred, setReferred] = useState(false);
  const [referrer, setReferrer] = useState<PickedEmployee | null>(null);
  const [source, setSource] = useState('');
  const sourceOptions = (
    cvSources?.length
      ? CV_SOURCES.filter((s) => cvSources.includes(s.value))
      : CV_SOURCES
  ).map((s) => ({ value: s.value, label: s.label }));

  const reset = () => {
    setSource('');
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setCv(null);
    setReferred(false);
    setReferrer(null);
  };

  const close = () => {
    reset();
    onClose();
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
      title="Add candidate"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            isLoading={create.isPending}
            disabled={!canSubmit}
          >
            Add candidate
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Md. Rofiqul Islam"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Select
          label="Source (optional)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          options={[{ value: '', label: 'Not recorded' }, ...sourceOptions]}
        />
        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
          <Checkbox
            label="Referred by an employee"
            description="Employee referral — pick who put them forward from the employee directory."
            className="border-0 p-0 hover:bg-transparent"
            checked={referred}
            onChange={(e) => {
              setReferred(e.target.checked);
              if (!e.target.checked) setReferrer(null);
            }}
          />
          {referred &&
            (referrer ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                    Employee referral
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
                  className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <EmployeePicker label="Referred by" value="" onPick={setReferrer} />
            ))}
        </div>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional — source, first impression…"
          rows={2}
        />

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">
            CV {referred ? '(required for a referral)' : '(optional)'}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && (f.type !== 'application/pdf' || f.size > MAX_PDF_BYTES)) {
                  alert(f.type !== 'application/pdf' ? 'Only PDF files are accepted.' : 'File must be under 5 MB.');
                  e.target.value = '';
                  return;
                }
                setCv(f);
              }}
          />
          {cv ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Paperclip className="h-4 w-4" />}
              onClick={() => fileRef.current?.click()}
            >
              Attach CV
            </Button>
          )}
          <p className="mt-1.5 text-xs text-slate-400">
            Stored in this requisition&rsquo;s “All CVs” Drive folder.
          </p>
        </div>
      </div>
    </Modal>
  );
}
