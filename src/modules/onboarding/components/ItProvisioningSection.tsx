import { useState } from 'react';
import {
  Check,
  Clock,
  Lock,
  Mail,
  Send,
  UserMinus,
  X,
} from 'lucide-react';

import { Badge, Button, Input } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import { useNotifyIt } from '../hooks/useOnboarding';
import type { OnboardingView } from '../types/onboarding.types';
import { NotifyItModal } from './NotifyItModal';

const EMAIL = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()".]{2,}$/;
const when = (iso: string) => formatDate(iso, 'dd MMM yyyy, p');

/**
 * Onboarding's last step: the work email.
 *
 * "Notify IT" mails IT the request in DBL's own format; IT confirms from the
 * link in it, which records the address and completes the onboarding. An
 * address that arrived some other way can still be recorded by hand.
 */
export function ItProvisioningSection({
  candidateId,
  ob,
  isBoardApproved,
  itWebhook,
}: {
  candidateId: string;
  ob: OnboardingView;
  isBoardApproved: boolean;
  itWebhook: boolean;
}) {
  const notifyIt = useNotifyIt(candidateId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const req = ob.itRequest;
  const waiting = Boolean(req && !req.completedAt && !req.closedAt);

  return (
    <div className="border-t border-slate-100 pt-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        IT provisioning &amp; completion
      </p>

      {!ob.hrVerifiedAt ? (
        <p className="flex items-center gap-1.5 text-sm text-slate-400">
          <Lock className="h-4 w-4 shrink-0" /> Complete final verification above first.
        </p>
      ) : ob.itNotifiedAt ? (
        <Completed ob={ob} />
      ) : (
        <div className="space-y-4">
          {waiting && req ? (
            <div className="rounded-xl border border-slate-200 px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warning" dot>
                  Waiting for IT
                </Badge>
                <span className="text-xs text-slate-500">
                  Sent {when(req.lastSentAt)} by {req.sentByName}
                  {req.sendCount > 1 ? ` · sent ${req.sendCount} times` : ''}
                </span>
              </div>
              <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
                <dt className="text-slate-400">Sent to</dt>
                <dd className="break-words text-slate-700">{req.sentTo}</dd>
                <dt className="text-slate-400">Address asked for</dt>
                <dd className="text-slate-700">
                  {req.preferredEmail || 'IT to choose'} · {req.platform}
                </dd>
                {req.deletions.length > 0 && (
                  <>
                    <dt className="text-slate-400">Also delete</dt>
                    <dd className="text-slate-700">
                      {req.deletions.map((d) => `${d.name} (${d.email})`).join(', ')}
                    </dd>
                  </>
                )}
              </dl>
              <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                IT confirms from the link in their email — the address is then recorded here, the
                onboarding completes, and the reply comes to {req.sentByName}. The link works until{' '}
                {formatDate(req.expiresAt, 'dd MMM yyyy')}.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Ask IT to create the work email. The request goes in DBL&rsquo;s usual format
              {ob.itRequest ? '' : ' — and, for a replacement, asks for the leaver’s account to be deleted'}.
              IT confirms from a link in the email, and the address is recorded here.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button
              leftIcon={<Send className="h-4 w-4" />}
              variant={waiting ? 'outline' : 'primary'}
              disabled={!isBoardApproved}
              title={
                !isBoardApproved
                  ? 'Board Approval is required before onboarding can be completed'
                  : undefined
              }
              onClick={() => setDialogOpen(true)}
            >
              {waiting ? 'Send again' : 'Notify IT'}
            </Button>
            <button
              type="button"
              onClick={() => setManualOpen((v) => !v)}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {manualOpen ? 'Hide' : 'Already have the address? Record it by hand'}
            </button>
          </div>

          {manualOpen && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[16rem] flex-1">
                  <Input
                    label="Work email"
                    type="email"
                    placeholder="name@dbl-group.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  leftIcon={<Mail className="h-4 w-4" />}
                  isLoading={notifyIt.isPending}
                  disabled={!isBoardApproved || !EMAIL.test(manualEmail.trim())}
                  onClick={() => notifyIt.mutate({ email: manualEmail.trim() })}
                >
                  Record &amp; complete onboarding
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                For an address IT gave you another way.
                {waiting ? ' The open request is closed, so its link tells IT nothing more is needed.' : ''}
                {itWebhook ? ' The IT webhook is also called.' : ''}
              </p>
            </div>
          )}

          <NotifyItModal
            candidateId={candidateId}
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function Completed({ ob }: { ob: OnboardingView }) {
  const req = ob.itRequest;
  const fromIt = Boolean(req?.completedAt);
  const rows: { label: string; done: boolean; note?: string }[] = [
    {
      label: 'Work email account created',
      done: Boolean(ob.itEmail),
      note: fromIt ? `by ${req!.completedByName}` : ob.itEmail ? 'recorded by hand' : undefined,
    },
    ...(req?.deletionsDone ?? []).map((d) => ({
      label: `${d.name}'s email account deleted`,
      done: d.deleted,
      note: d.email,
    })),
  ];

  return (
    <div className="space-y-3">
      <Badge tone="success">Onboarded {formatDate(ob.itNotifiedAt!, 'dd MMM yyyy')}</Badge>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <Mail className="h-4 w-4 shrink-0 text-brand-500" />
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-400">Work email</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{ob.itEmail || '—'}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {rows.map(({ label, done, note }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-400',
              )}
            >
              {done ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : label.includes('deleted') ? (
                <UserMinus className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </span>
            <span className={cn('flex-1', done ? 'text-slate-700' : 'text-slate-500')}>
              {label}
              {note ? <span className="ml-1.5 text-xs text-slate-400">· {note}</span> : null}
            </span>
            <span className={cn('text-[0.6875rem] font-medium', done ? 'text-emerald-600' : 'text-slate-400')}>
              {done ? 'Completed' : 'Not done'}
            </span>
          </div>
        ))}
      </div>
      {fromIt && req && (
        <p className="text-xs text-slate-500">
          IT confirmed {when(req.completedAt!)}
          {req.confirmationSentAt ? `; the reply went to ${req.sentByName}` : ''}.
          {req.completionNote ? ` Note: “${req.completionNote}”` : ''}
        </p>
      )}
    </div>
  );
}
