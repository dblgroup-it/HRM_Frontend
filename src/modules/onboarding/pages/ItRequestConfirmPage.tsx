import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Mail,
  MailCheck,
  UserMinus,
  XCircle,
} from 'lucide-react';

import { FullPageSpinner, Logo } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import {
  useCompleteItRequest,
  useItRequestPublic,
} from '../hooks/useItRequest';

const EMAIL = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()".]{2,}$/;

/**
 * IT's page, opened from the link in "Notify IT".
 *
 * IT says what they created (and deleted) and signs it with their name; that
 * records the work email in DBL HRM, completes the hire's onboarding, and
 * sends the requester the "completed" reply. No sign-in — the link is the
 * credential, and it opens this one request only.
 */
export default function ItRequestConfirmPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isLoading, isError, error } = useItRequestPublic(token);
  const complete = useCompleteItRequest(token);

  const [createdEmail, setCreatedEmail] = useState('');
  const [byName, setByName] = useState('');
  const [note, setNote] = useState('');
  const [deleted, setDeleted] = useState<Record<string, boolean>>({});
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!data || data.state !== 'open') return;
    setCreatedEmail((v) => v || data.preferredEmail || '');
    setDeleted((m) =>
      Object.keys(m).length
        ? m
        : Object.fromEntries(data.deletions.map((d) => [d.email.toLowerCase(), true])),
    );
  }, [data]);

  if (isLoading) return <FullPageSpinner label="Loading…" />;

  if (isError || !data) {
    return (
      <Shell>
        <Notice
          tone="bad"
          title="Link not found"
          text={
            (error as Error | null)?.message ||
            'This link is not valid. It may have been replaced by a newer request from HR.'
          }
        />
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Notice
          tone="good"
          title="Thank you — recorded"
          text={`The new address is recorded in DBL HRM and ${data.requesterName} has been sent your confirmation.`}
        />
      </Shell>
    );
  }

  if (data.state === 'completed' && data.completed) {
    return (
      <Shell>
        <Notice
          tone="good"
          title="Already completed"
          text={`${data.completed.byName ?? 'IT'} confirmed this on ${formatDate(
            data.completed.at,
            'dd MMM yyyy, p',
          )}: ${data.completed.createdEmail ?? ''}. Nothing more is needed.`}
        />
      </Shell>
    );
  }

  if (data.state === 'closed') {
    return (
      <Shell>
        <Notice
          tone="neutral"
          title="Closed by HR"
          text={`${data.closedReason ? `${data.closedReason}. ` : ''}Nothing more is needed from IT.`}
        />
      </Shell>
    );
  }

  if (data.state === 'expired') {
    return (
      <Shell>
        <Notice
          tone="neutral"
          title="This link has expired"
          text={`Ask ${data.requesterName} to send the request again — a new link comes with it.`}
        />
      </Shell>
    );
  }

  const e = data.employee;
  const emailBad = !EMAIL.test(createdEmail.trim());
  const nameBad = byName.trim().length < 2;
  const submit = () => {
    setTouched(true);
    if (emailBad || nameBad) return;
    complete.mutate(
      {
        createdEmail: createdEmail.trim(),
        completedByName: byName.trim(),
        deleted: data.deletions
          .filter((d) => deleted[d.email.toLowerCase()])
          .map((d) => d.email),
        note: note.trim() || undefined,
      },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="text-[0.8125rem] leading-relaxed text-slate-600">
          <p>
            Dear <span className="font-semibold text-slate-800">{data.salutation}</span>,
          </p>
          <p className="mt-1">
            {data.requesterName} asked for the following on{' '}
            {formatDate(data.sentAt, 'dd MMM yyyy')}. Please confirm once it is done — the
            address is recorded in DBL HRM and {data.requesterName} receives your reply.
          </p>
        </div>

        {/* New account */}
        <section className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <Mail className="h-4 w-4 text-brand-600" />
            <p className="text-sm font-semibold text-slate-800">New email account</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-lg font-bold text-slate-900">{e.name}</p>
            <p className="text-[0.8125rem] text-slate-500">{e.designation}</p>
            <dl className="mt-3 grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[0.8125rem]">
              {e.employeeId && <Row k="Employee ID" v={e.employeeId} />}
              {e.department && <Row k="Department" v={e.department} />}
              <Row k="Unit" v={e.unit} />
              {e.joiningDate && <Row k="Joining date" v={formatDate(e.joiningDate, 'dd MMM yyyy')} />}
              <Row k="Preferred address" v={data.preferredEmail || 'IT to choose'} />
              <Row k="Email platform" v={data.platform} />
              {data.purpose && <Row k="Purpose" v={data.purpose} />}
            </dl>
          </div>
        </section>

        {/* Leavers */}
        {data.deletions.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
              <UserMinus className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-800">
                Delete {data.deletions.length > 1 ? 'these email accounts' : 'this email account'}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {data.deletions.map((d) => {
                const key = d.email.toLowerCase();
                return (
                  <label key={key} className="flex cursor-pointer items-start gap-3 px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={Boolean(deleted[key])}
                      onChange={(ev) => setDeleted((m) => ({ ...m, [key]: ev.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="min-w-0 text-[0.8125rem]">
                      <span className="block font-semibold text-slate-800">{d.name}</span>
                      <span className="block break-words text-slate-600">{d.email}</span>
                      <span className="block text-slate-400">
                        {[d.code ? `Code ${d.code}` : null, d.reason].filter(Boolean).join(' · ')}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {deleted[key] ? 'Deleted' : 'Not deleted — say why in the note'}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        {/* Answer */}
        <section className="space-y-4">
          <Field
            label="Email address created"
            required
            error={touched && emailBad ? 'Enter the address you created.' : undefined}
          >
            <input
              type="email"
              value={createdEmail}
              onChange={(ev) => setCreatedEmail(ev.target.value)}
              placeholder="name@dbl-group.com"
              className={inputCls(touched && emailBad)}
            />
          </Field>
          <Field
            label="Your name"
            required
            hint="It signs the reply HR receives."
            error={touched && nameBad ? 'Enter your name.' : undefined}
          >
            <input
              value={byName}
              onChange={(ev) => setByName(ev.target.value)}
              placeholder="e.g. Md. Farhad Hossain"
              className={inputCls(touched && nameBad)}
            />
          </Field>
          <Field label="Note" hint="Optional — anything HR should know.">
            <textarea
              rows={3}
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              className={cn(inputCls(false), 'resize-none')}
            />
          </Field>
          {complete.isError && (
            <p className="text-[0.8125rem] font-medium text-red-600">
              {(complete.error as Error)?.message || 'That did not go through — please try again.'}
            </p>
          )}
          <button
            type="button"
            disabled={complete.isPending}
            onClick={submit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[0.9375rem] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            <MailCheck className="h-5 w-5" />
            {complete.isPending ? 'Saving…' : 'Confirm completed'}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[0.6875rem] text-slate-400">
            <Clock className="h-3 w-3" /> This link works until{' '}
            {formatDate(data.expiresAt, 'dd MMM yyyy')} and can be used once.
          </p>
        </section>
      </div>
    </Shell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-slate-400">{k}</dt>
      <dd className="break-words text-slate-700">{v}</dd>
    </>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.75rem] font-semibold text-slate-700">
        {label} {required && <span className="font-normal text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[0.75rem] font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[0.75rem] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

const inputCls = (bad: boolean) =>
  cn(
    'w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2',
    bad
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-slate-200 focus:border-brand-400 focus:ring-brand-100',
  );

function Notice({
  tone,
  title,
  text,
}: {
  tone: 'good' | 'bad' | 'neutral';
  title: string;
  text: string;
}) {
  const Icon = tone === 'good' ? CheckCircle2 : tone === 'bad' ? XCircle : Clock;
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-2xl',
          tone === 'good' ? 'bg-emerald-50' : tone === 'bad' ? 'bg-red-50' : 'bg-slate-100',
        )}
      >
        <Icon
          className={cn(
            'h-7 w-7',
            tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-500' : 'text-slate-500',
          )}
        />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-800">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <Logo withLabel={false} size="lg" />
          <div>
            <p className="text-[0.9375rem] font-bold text-slate-800">DBL Group HR</p>
            <p className="text-[0.6875rem] text-slate-400">IT account request</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
