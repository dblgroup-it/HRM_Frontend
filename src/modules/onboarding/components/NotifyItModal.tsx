import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Mail, Send, UserMinus } from 'lucide-react';

import {
  Button,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
} from '@shared/components/ui';
import { useDebounce } from '@shared/hooks';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import {
  useItRequestDraft,
  useItRequestPreview,
  useSendItRequest,
} from '../hooks/useItRequest';
import type { ItRequestInput } from '../types/itRequest.types';

/** Loose on purpose — the server checks too, and names the bad address. */
const EMAIL = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()".]{2,}$/;
const isEmail = (v: string) => EMAIL.test(v.trim());

interface Leaver {
  name: string;
  code: string | null;
  email: string;
  reason: string | null;
  include: boolean;
  found: boolean;
}

/**
 * "Notify IT" — ask IT for the new hire's work email, in DBL's own format.
 *
 * Form on the left, the email exactly as IT will receive it on the right, so
 * nobody sends a request they have not read. For a replacement hire the
 * leavers are listed too, ticked for deletion when the directory knows their
 * address (a transfer is not: they are still with the group).
 */
export function NotifyItModal({
  candidateId,
  open,
  onClose,
}: {
  candidateId: string;
  open: boolean;
  onClose: () => void;
}) {
  const draft = useItRequestDraft(candidateId, open);
  const send = useSendItRequest(candidateId);

  const [preferredEmail, setPreferredEmail] = useState('');
  const [platform, setPlatform] = useState('Google');
  const [approvedBy, setApprovedBy] = useState('');
  const [purpose, setPurpose] = useState('');
  const [leavers, setLeavers] = useState<Leaver[]>([]);
  const [ready, setReady] = useState(false);

  // Start from the server's draft each time the dialog opens.
  const d = draft.data;
  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    if (!d) return;
    setPreferredEmail(d.preferredEmail);
    setPlatform(d.platform);
    setApprovedBy(d.approvedBy);
    setPurpose(d.purpose);
    setLeavers(d.deletions.map((l) => ({ ...l })));
    setReady(true);
  }, [open, d]);

  const input: ItRequestInput = useMemo(
    () => ({
      preferredEmail: preferredEmail.trim() || undefined,
      platform,
      approvedBy: approvedBy.trim() || undefined,
      purpose: purpose.trim() || undefined,
      deletions: leavers
        .filter((l) => l.include)
        .map(({ name, code, email, reason }) => ({ name, code, email, reason })),
    }),
    [preferredEmail, platform, approvedBy, purpose, leavers],
  );
  const debounced = useDebounce(input, 350);
  // Only once the form holds the draft, and only once typing has paused —
  // the last preview stays on screen in between.
  const preview = useItRequestPreview(
    candidateId,
    open && ready && debounced === input ? debounced : null,
  );

  const preferredBad = Boolean(preferredEmail.trim()) && !isEmail(preferredEmail);
  const leaverBad = leavers.some((l) => l.include && !isEmail(l.email));
  const canSend = Boolean(d?.deliverable) && !preferredBad && !leaverBad;

  const setLeaver = (i: number, patch: Partial<Leaver>) =>
    setLeavers((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const resend = Boolean(d?.previous);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resend ? 'Send the request to IT again' : 'Notify IT — work email account'}
      size="full"
      footer={
        <>
          <p className="mr-auto self-center text-xs text-slate-500">
            {d ? (
              <>
                To <span className="font-medium text-slate-700">{d.recipients.join(', ')}</span>
                {d.requesterEmail ? (
                  <>
                    {' '}· a copy to you
                  </>
                ) : null}
                {' '}· IT confirms from the link in the email
              </>
            ) : null}
          </p>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            leftIcon={<Send className="h-4 w-4" />}
            isLoading={send.isPending}
            disabled={!canSend}
            onClick={() =>
              send.mutate(input, {
                onSuccess: () => onClose(),
              })
            }
          >
            {resend ? 'Send again' : 'Send to IT'}
          </Button>
        </>
      }
    >
      {draft.isLoading || !d ? (
        <div className="flex justify-center py-16">
          {draft.isError ? (
            <p className="text-sm text-red-600">
              {(draft.error as Error)?.message || 'Could not load the request.'}
            </p>
          ) : (
            <Spinner />
          )}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
          {/* ── The form ───────────────────────────────────────── */}
          <div className="space-y-5">
            {!d.deliverable && (
              <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Outgoing email is switched off, so IT would not receive this. Turn on the master
                  email switch on Integrations, or record the work email by hand.
                </span>
              </div>
            )}

            {resend && d.previous && (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                Last sent {formatDate(d.previous.lastSentAt, 'dd MMM yyyy, p')} by{' '}
                {d.previous.sentByName}. Sending again gives IT a new link; the old one stops
                working.
              </p>
            )}

            <section className="space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Mail className="h-3.5 w-3.5" /> New email account
              </p>
              <div className="rounded-xl border border-slate-200 px-3.5 py-3 text-sm">
                <p className="font-semibold text-slate-800">{d.employee.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[d.employee.designation, d.employee.department, d.employee.unit]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {d.employee.employeeId ? `Employee ID ${d.employee.employeeId}` : 'No employee ID yet'}
                  {d.employee.joiningDate
                    ? ` · joining ${formatDate(d.employee.joiningDate, 'dd MMM yyyy')}`
                    : ''}
                </p>
              </div>
              <Input
                label="Preferred email address"
                type="email"
                placeholder="e.g. quality.accessories@glory-dbl.com"
                value={preferredEmail}
                onChange={(e) => setPreferredEmail(e.target.value)}
                error={preferredBad ? 'Not an email address' : undefined}
                hint={preferredBad ? undefined : 'Leave blank and IT will choose the address.'}
              />
              <Select
                label="Email platform"
                options={d.platforms.map((p) => ({ value: p, label: p }))}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              />
              <Textarea
                label="Approved by"
                rows={2}
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                hint="From the requisition's sign-offs — edit if needed."
              />
              <Textarea
                label="Purpose"
                rows={2}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </section>

            {leavers.length > 0 && (
              <section className="space-y-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <UserMinus className="h-3.5 w-3.5" /> Leaver&rsquo;s email
                </p>
                <p className="text-xs text-slate-500">
                  This hire replaces the {leavers.length > 1 ? 'people' : 'person'} below. Tick
                  to ask IT to delete the email account.
                </p>
                {leavers.map((l, i) => {
                  const bad = l.include && !isEmail(l.email);
                  return (
                    <div key={`${l.code ?? l.name}-${i}`} className="rounded-xl border border-slate-200 p-3">
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={l.include}
                          onChange={(e) => setLeaver(i, { include: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-800">
                            Delete {l.name}&rsquo;s email account
                          </span>
                          <span className="block text-xs text-slate-500">
                            {[l.code ? `Code ${l.code}` : null, l.reason].filter(Boolean).join(' · ') ||
                              'No reason recorded'}
                          </span>
                        </span>
                      </label>
                      <div className={cn('mt-2.5 pl-[1.625rem]', !l.include && 'opacity-50')}>
                        <Input
                          type="email"
                          placeholder="name@dbl-group.com"
                          value={l.email}
                          disabled={!l.include}
                          onChange={(e) => setLeaver(i, { email: e.target.value })}
                          error={bad ? 'Enter their email address' : undefined}
                          hint={
                            !bad && !l.found && l.include
                              ? 'Not in the directory — type it.'
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </div>

          {/* ── The email, as IT will see it ────────────────────── */}
          <div className="flex min-h-[30rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="space-y-1 border-b border-slate-200 bg-white px-4 py-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wide text-slate-400">Preview</span>
                {preview.isFetching && (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Updating
                  </span>
                )}
              </div>
              <PreviewLine label="To" value={d.recipients.join(', ')} />
              {d.requesterEmail && <PreviewLine label="Cc" value={d.requesterEmail} />}
              <PreviewLine label="Subject" value={preview.data?.subject ?? '…'} strong />
            </div>
            <div className="min-h-0 flex-1 bg-white">
              {preview.data ? (
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={`<!doctype html><html><body style="margin:0;padding:20px 22px;background:#fff">${preview.data.html}</body></html>`}
                  className="h-full min-h-[30rem] w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center py-16">
                  <Spinner />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function PreviewLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <p className="flex gap-2">
      <span className="w-14 shrink-0 text-slate-400">{label}</span>
      <span className={cn('min-w-0 break-words', strong ? 'font-semibold text-slate-800' : 'text-slate-600')}>
        {value}
      </span>
    </p>
  );
}
