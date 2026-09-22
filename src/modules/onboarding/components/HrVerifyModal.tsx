import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Mail,
  Send,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';

import { Button, Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';

export interface VerifyCheck {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * HR's final sign-off — a summary and a confirmation before the hard-to-undo
 * step (it also rejects every other applicant still on the requisition).
 *
 * "Notify candidate" lives on the outstanding-documents card rather than in
 * the footer: it emails exactly that list, so it belongs beside it, and three
 * buttons in the footer of a narrow dialog ran off the edge on a phone. When
 * the file is short that card comes first — it is what HR has to act on —
 * and the full checklist follows.
 */
export function HrVerifyModal({
  open,
  onClose,
  candidateName,
  checks,
  docsSettled,
  missingDocs,
  pendingDocs,
  notify,
  skip,
  confirm,
}: {
  open: boolean;
  onClose: () => void;
  candidateName: string;
  checks: VerifyCheck[];
  /** The server's own answer (hr-verify.ts) — gates the confirm button. */
  docsSettled: boolean;
  missingDocs: string[];
  pendingDocs: string[];
  notify: {
    onClick: () => void;
    isPending: boolean;
    /** Why the reminder cannot be sent — no email, or mail not set up. */
    unavailable?: string;
  };
  /**
   * Record that the outstanding documents were checked on paper.
   *
   * The same waiver the Documents step offers ("Checked by Manual on hand").
   * It is offered here too because this is where HR actually discovers the
   * file is short — being told to go to another step, find the control and
   * come back is the kind of instruction people work around instead.
   */
  skip: { onClick: () => void; isPending: boolean };
  confirm: { onClick: () => void; isPending: boolean };
}) {
  const done = checks.filter((c) => c.ok).length;
  const ready = docsSettled && done === checks.length;
  const firstName = candidateName.split(' ')[0];
  const outstanding = missingDocs.length + pendingDocs.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Final verification"
      size="md"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto"
            isLoading={confirm.isPending}
            disabled={!docsSettled}
            title={
              docsSettled
                ? undefined
                : 'Collect and verify every document first, or record that you checked them by hand.'
            }
            leftIcon={<UserCheck className="h-4 w-4" />}
            onClick={confirm.onClick}
          >
            Confirm &amp; verify
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Where the file stands, before the detail. */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl px-4 py-3 ring-1',
            ready
              ? 'bg-emerald-50 ring-emerald-100'
              : 'bg-amber-50/70 ring-amber-100',
          )}
        >
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              ready ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600',
            )}
          >
            {ready ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {ready ? 'Ready to sign off' : `${done} of ${checks.length} checks complete`}
            </p>
            <p className="truncate text-xs text-slate-500">{candidateName}</p>
            {!ready && (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${(done / Math.max(checks.length, 1)) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {!docsSettled && (
          <section className="overflow-hidden rounded-xl border border-rose-100 bg-rose-50/60">
            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-rose-700">
                Outstanding documents
              </p>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-rose-700">
                {outstanding}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5 px-4">
              {missingDocs.map((label) => (
                <li key={`m-${label}`} className="flex items-start gap-2 text-xs leading-5 text-rose-800">
                  <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  <span className="min-w-0">
                    {label} <span className="text-rose-500">— not collected</span>
                  </span>
                </li>
              ))}
              {pendingDocs.map((label) => (
                <li key={`p-${label}`} className="flex items-start gap-2 text-xs leading-5 text-amber-800">
                  <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span className="min-w-0">
                    {label} <span className="text-amber-600">— not verified yet</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* The moment HR finds the file is short is the moment to chase
                it — the list is the server's own, so the email and this card
                cannot disagree. */}
            <div className="mt-3 space-y-2 border-t border-rose-100 bg-white/60 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {notify.unavailable ?? `Email ${firstName} this list as a reminder.`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  isLoading={notify.isPending}
                  disabled={Boolean(notify.unavailable)}
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                  onClick={notify.onClick}
                >
                  Notify candidate
                </Button>
              </div>
              {/* The other way out: HR has the papers in front of them. The
                  waiver is recorded against the onboarding, so the file says
                  these were checked by hand rather than simply passing. */}
              <div className="flex flex-col gap-2 border-t border-rose-100/70 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                  <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  Have them on paper? Record it and this unlocks.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  isLoading={skip.isPending}
                  leftIcon={<ClipboardCheck className="h-3.5 w-3.5" />}
                  onClick={skip.onClick}
                >
                  Checked on hand
                </Button>
              </div>
            </div>
          </section>
        )}

        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 px-3.5 py-2.5">
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                  c.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400',
                )}
              >
                {c.ok ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                ) : (
                  <X className="h-2.5 w-2.5" strokeWidth={3} />
                )}
              </span>
              <span className="min-w-[6.5rem] flex-1 text-sm text-slate-700">
                {c.label}
              </span>
              <span
                className={cn(
                  'text-right text-xs font-medium leading-5',
                  c.ok ? 'text-slate-500' : 'text-amber-600',
                )}
              >
                {c.detail}
              </span>
            </li>
          ))}
        </ul>

        <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          Signing off finalizes the hire and automatically rejects every other
          applicant still in this requisition&rsquo;s pipeline.
        </p>
      </div>
    </Modal>
  );
}
