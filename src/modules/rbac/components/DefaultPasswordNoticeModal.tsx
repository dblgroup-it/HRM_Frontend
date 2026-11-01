import { AlertTriangle, CheckCircle2, Mail, MailX } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Modal, Spinner } from '@shared/components/ui';

import {
  useDefaultPasswordAudience,
  useDefaultPasswordRun,
  useSendDefaultPasswordNotices,
} from '../hooks/useRbac';
import type { DefaultPasswordRun } from '../types/rbac.types';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dhaka',
  });

/**
 * Emails everyone who can sign in and still holds the default password their
 * user ID and the password, once. Made for the accounts moved to the default
 * on 30 Oct 2026, and still useful whenever many are waiting to sign in.
 */
export function DefaultPasswordNoticeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const audience = useDefaultPasswordAudience(open);
  const runQuery = useDefaultPasswordRun(open);
  const send = useSendDefaultPasswordNotices();

  const run = runQuery.data?.run ?? audience.data?.run ?? null;
  const sending = Boolean(run && !run.finishedAt);
  const data = audience.data;
  const canSend =
    Boolean(data?.recipients) && Boolean(data?.mailOn) && !sending;

  const start = () => {
    if (!data) return;
    if (
      !window.confirm(
        `Email ${data.recipients} ${data.recipients === 1 ? 'person' : 'people'} their user ID and the default password? Each gets one email.`,
      )
    )
      return;
    send.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(
          `Sending to ${r.total} ${r.total === 1 ? 'person' : 'people'}. This takes a few minutes.`,
        ),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Email sign-in details"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            leftIcon={<Mail className="h-4 w-4" />}
            disabled={!canSend || send.isPending}
            isLoading={send.isPending}
            onClick={start}
          >
            {data?.recipients
              ? `Email ${data.recipients} ${data.recipients === 1 ? 'person' : 'people'}`
              : 'Email them'}
          </Button>
        </div>
      }
    >
      {audience.isLoading ? (
        <div className="flex flex-col items-center gap-2 py-8 text-sm text-slate-500">
          <Spinner size={56} />
          Checking who is still on the default password…
        </div>
      ) : audience.isError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {(audience.error as Error).message}
        </p>
      ) : data ? (
        <div className="space-y-4">
          {run && <RunStatus run={run} />}

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-3xl font-semibold text-slate-900">
              {data.recipients}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {data.recipients === 1 ? 'person' : 'people'} with access{' '}
              {data.recipients === 1 ? 'is' : 'are'} still on the default
              password and {data.recipients === 1 ? 'has' : 'have'} an email
              address.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              <li>
                Each gets one email: their password was reset by the
                Administrator for security purposes, with their{' '}
                <span className="font-medium text-slate-800">user ID</span>{' '}
                and the{' '}
                <span className="font-medium text-slate-800">
                  default password
                </span>
                .
              </li>
              <li>
                It tells them they will choose their own password at their
                first sign-in.
              </li>
              <li>
                Anyone who has already changed their password is left out.
              </li>
            </ul>
          </div>

          {!data.mailOn && (
            <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <MailX className="mt-0.5 h-4 w-4 shrink-0" />
              Email is switched off on Integrations. Turn it on to send.
            </p>
          )}

          {data.withoutEmail.length > 0 && (
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <p className="flex items-start gap-2 font-medium">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {data.withoutEmail.length}{' '}
                {data.withoutEmail.length === 1 ? 'has' : 'have'} no email
                address on file. Tell them yourself:
              </p>
              <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto pl-6 text-amber-900">
                {data.withoutEmail.map((p) => (
                  <li key={p.employeeCode}>
                    {p.name}{' '}
                    <span className="text-amber-700">· {p.employeeCode}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function RunStatus({ run }: { run: DefaultPasswordRun }) {
  const done = run.sent + run.failed;
  if (!run.finishedAt) {
    const pct = run.total ? Math.round((done / run.total) * 100) : 0;
    return (
      <div className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
        <p className="font-medium">
          Sending… {done} of {run.total}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-brand-700">
          You can close this; it carries on.
        </p>
      </div>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Last sent {when(run.finishedAt)} by {run.startedBy}: {run.sent} sent
        {run.failed ? `, ${run.failed} failed` : ''}.
      </span>
    </p>
  );
}
