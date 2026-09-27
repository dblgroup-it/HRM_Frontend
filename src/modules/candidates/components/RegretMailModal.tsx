import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, MailX } from 'lucide-react';

import { Button, Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import { useSendRegretMail } from '../hooks/useCandidates';
import {
  MAX_REGRET_PER_SEND as MAX_PER_SEND,
  REGRET_MAIL_PREVIEW,
  regretBlocker,
  type RegretTarget,
} from '../regretMail';

/**
 * Send the regret letter to one rejected candidate or many.
 *
 * Everyone passed in is listed, so nobody silently drops out of a batch: the
 * ones who can be written to are ticked, the rest are shown greyed with the
 * reason — already sent, no email, not rejected.
 */
export function RegretMailModal({
  candidates,
  designation,
  open,
  onClose,
}: {
  candidates: RegretTarget[];
  /** The post, for the subject line preview. */
  designation?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const send = useSendRegretMail();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showLetter, setShowLetter] = useState(false);

  const eligible = useMemo(
    () => candidates.filter((c) => !regretBlocker(c)),
    [candidates],
  );

  // A fresh selection each time it opens: every eligible candidate ticked.
  useEffect(() => {
    if (!open) return;
    setPicked(new Set(eligible.slice(0, MAX_PER_SEND).map((c) => c.id)));
    setShowLetter(candidates.length === 1);
  }, [open, eligible, candidates.length]);

  const single = candidates.length === 1 ? candidates[0] : null;
  const role = designation?.trim();
  const subject = role
    ? `Application Update — ${role} | DBL Group`
    : 'Application Update | DBL Group';
  const count = picked.size;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_PER_SEND) next.add(id);
      return next;
    });

  const allOn = eligible.length > 0 && eligible.every((c) => picked.has(c.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={single ? `Regret mail to ${single.name}` : 'Send regret mail'}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {count === 0
              ? 'Nobody selected'
              : `${count} candidate${count === 1 ? '' : 's'} will be emailed`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              leftIcon={<MailX className="h-4 w-4" />}
              isLoading={send.isPending}
              disabled={count === 0}
              onClick={() =>
                send.mutate([...picked], { onSuccess: onClose })
              }
            >
              {count > 1 ? `Send to ${count}` : 'Send regret mail'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {single ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">To: </span>
            <span className="font-medium text-slate-800">{single.name}</span>
            {single.email && (
              <span className="text-slate-500"> · {single.email}</span>
            )}
            {regretBlocker(single) && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                {regretBlocker(single) === 'No email on file'
                  ? 'This candidate has no email address. Add one first to send the letter.'
                  : regretBlocker(single) === 'Not rejected'
                    ? 'Only a rejected candidate can be sent the regret mail.'
                    : `Already sent on ${formatDate(single.regretSentAt!)} — it goes once only.`}
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recipients · {eligible.length} of {candidates.length} can be
                sent
              </p>
              {eligible.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-medium text-brand-600 hover:underline"
                  onClick={() =>
                    setPicked(
                      allOn
                        ? new Set()
                        : new Set(
                            eligible.slice(0, MAX_PER_SEND).map((c) => c.id),
                          ),
                    )
                  }
                >
                  {allOn ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>
            {eligible.length > MAX_PER_SEND && (
              <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Up to {MAX_PER_SEND} go in one send. Send these, then open this
                again for the rest.
              </p>
            )}
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {candidates.map((c) => {
                const blocked = regretBlocker(c);
                const on = picked.has(c.id);
                return (
                  <li key={c.id}>
                    <label
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm',
                        blocked
                          ? 'cursor-not-allowed bg-slate-50/60'
                          : 'cursor-pointer hover:bg-slate-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-40"
                        checked={on}
                        disabled={Boolean(blocked)}
                        onChange={() => toggle(c.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block truncate font-medium',
                            blocked ? 'text-slate-400' : 'text-slate-800',
                          )}
                        >
                          {c.name}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {c.email || 'No email'}
                        </span>
                      </span>
                      {blocked && (
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold',
                            c.regretSentAt
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          {c.regretSentAt && <Check className="h-3 w-3" />}
                          {blocked}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setShowLetter((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                The letter
              </span>
              <span className="block truncate text-sm text-slate-700">
                {subject}
              </span>
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                showLetter && 'rotate-180',
              )}
            />
          </button>
          {showLetter && (
            <p className="max-h-64 overflow-y-auto whitespace-pre-line border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-sm leading-6 text-slate-700">
              {REGRET_MAIL_PREVIEW}
            </p>
          )}
        </div>
        <p className="text-xs text-slate-400">
          Sent from the DBL recruitment mailbox, once per candidate. The
          wording is DBL&apos;s standard letter and is the same for everyone.
        </p>
      </div>
    </Modal>
  );
}

/**
 * The opt-in on a reject dialog: "also send the regret mail".
 *
 * Off by default — rejecting never writes to anybody by itself — and
 * disabled, with the reason, when the candidate has no email or was already
 * written to.
 */
export function RegretMailToggle({
  checked,
  onChange,
  email,
  alreadySentAt,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  email: string | null | undefined;
  alreadySentAt?: string | null;
  className?: string;
}) {
  const reason = !email?.trim()
    ? 'No email on file, so the letter cannot be sent.'
    : alreadySentAt
      ? `Already sent on ${formatDate(alreadySentAt)}.`
      : null;
  return (
    <label
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2',
        reason ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-slate-50',
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        checked={checked && !reason}
        disabled={Boolean(reason)}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-700">
          Also send the regret mail
        </span>
        <span className="block text-xs text-slate-400">
          {reason ?? `DBL's standard letter, to ${email}.`}
        </span>
      </span>
    </label>
  );
}
