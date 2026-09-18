import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Ban,
  Briefcase,
  Building2,
  CheckCircle2,
  Layers,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { FullPageSpinner } from '@shared/components/ui';
import {
  useFacilityConfirmInfo,
  useSubmitFacilityConfirm,
  useSubmitFacilityDecline,
} from '../hooks/useFacilityProvisioning';

/** HR's reason is mandatory, so mirror the server's minimum here. */
const MIN_REASON = 3;

export default function FacilityConfirmPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const { data, isLoading, isError } = useFacilityConfirmInfo(token);
  const submit = useSubmitFacilityConfirm(token);
  const decline = useSubmitFacilityDecline(token);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const [done, setDone] = useState(false);
  const [declined, setDeclined] = useState(false);
  // The email's second link lands here with the refusal form already open.
  const [declining, setDeclining] = useState(params.get('action') === 'decline');

  if (isLoading) return <FullPageSpinner label="Loading…" />;

  if (isError || !data) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">Link not found</p>
            <p className="mt-1 text-sm text-slate-500">
              This link is invalid, expired, or has already been used.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (data.alreadyDeclined || declined) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <Ban className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">
              {declined ? 'Thanks — HR has been told' : 'Already declined'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {declined
                ? `Thank you, ${data.recipientName}. HR knows this cannot be arranged and will follow up.`
                : `You already declined this, ${data.recipientName}.`}
            </p>
            {!declined && data.declineReason ? (
              <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-left text-[0.8125rem] text-slate-600">
                &ldquo;{data.declineReason}&rdquo;
              </p>
            ) : null}
          </div>
        </div>
      </PageShell>
    );
  }

  if (data.alreadyConfirmed || done) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">
              {done ? 'Thanks, confirmed!' : 'Already confirmed'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {done
                ? `Thank you, ${data.recipientName}. HR has been notified.`
                : `You already confirmed this, ${data.recipientName}.`}
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  const c = data.candidate!;

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <p className="text-[0.8125rem] text-slate-500">
            Dear <span className="font-semibold text-slate-700">{data.recipientName}</span>,
          </p>
          <p className="mt-1 text-[0.8125rem] text-slate-500 leading-relaxed">
            HR has asked you to arrange <b>{data.facilityLabel}</b> for the following new joiner.
            Please confirm below once it&rsquo;s ready &mdash; or tell HR if it can&rsquo;t be done.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div
            className="border-b border-slate-100 px-5 py-4"
            style={{ background: 'linear-gradient(to right,#f8fafc,#eff6ff)' }}
          >
            <p className="text-xl font-bold text-slate-800">{c.name}</p>
            <p className="mt-0.5 text-[0.8125rem] text-slate-500">{c.designation}</p>
          </div>
          <div className="space-y-2.5 px-5 py-4">
            <InfoRow icon={<Building2 className="h-4 w-4 text-slate-400" />} label="Unit" value={c.unit} />
            <InfoRow icon={<Layers className="h-4 w-4 text-slate-400" />} label="Department" value={c.department} />
            <InfoRow icon={<Briefcase className="h-4 w-4 text-slate-400" />} label="Requisition" value={c.code} />
            <InfoRow
              icon={<ShieldCheck className="h-4 w-4 text-brand-500" />}
              label="Facility"
              value={data.facilityLabel ?? ''}
            />
          </div>
        </div>

        {declining ? (
          <>
            <div>
              <label className="mb-1.5 block text-[0.75rem] font-semibold text-slate-700">
                Why can&rsquo;t this be arranged?{' '}
                <span className="font-normal text-red-500">(required)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => setReasonTouched(true)}
                rows={3}
                autoFocus
                placeholder="e.g. No quarters free until 15 October — can offer one then."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              />
              <p className="mt-1.5 text-[0.75rem] text-slate-400">
                HR reads this to decide what to do next, so please be specific.
              </p>
              {reasonTouched && reason.trim().length < MIN_REASON ? (
                <p className="mt-1 text-[0.75rem] font-medium text-red-600">
                  Please give a reason before submitting.
                </p>
              ) : null}
              {decline.isError ? (
                <p className="mt-1 text-[0.75rem] font-medium text-red-600">
                  Couldn&rsquo;t submit that — please try again.
                </p>
              ) : null}
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={decline.isPending || reason.trim().length < MIN_REASON}
                onClick={() => {
                  setReasonTouched(true);
                  decline.mutate(reason.trim(), { onSuccess: () => setDeclined(true) });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[0.9375rem] font-bold text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                  boxShadow: '0 8px 24px -4px rgba(220,38,38,.35)',
                }}
              >
                <Ban className="h-5 w-5" />
                {decline.isPending ? 'Submitting…' : 'Submit — cannot arrange'}
              </button>
              <button
                type="button"
                onClick={() => setDeclining(false)}
                className="w-full rounded-2xl border border-slate-200 py-3 text-[0.8125rem] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Back
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-[0.75rem] font-semibold text-slate-700">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Any details HR should know…"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={submit.isPending}
                onClick={() => submit.mutate(note || undefined, { onSuccess: () => setDone(true) })}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[0.9375rem] font-bold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-60 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#059669,#0d9488)', boxShadow: '0 8px 24px -4px rgba(5,150,105,.35)' }}
              >
                <CheckCircle2 className="h-5 w-5" />
                {submit.isPending ? 'Submitting…' : `Confirm ${data.facilityLabel} arranged`}
              </button>
              <button
                type="button"
                onClick={() => setDeclining(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3 text-[0.8125rem] font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                <Ban className="h-4 w-4" />
                I can&rsquo;t arrange this
              </button>
            </div>
          </>
        )}

        <p className="text-center text-[0.6875rem] text-slate-400">
          This link is valid for 14 days and can only be used once.
        </p>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg,#0d1f3c,#1877c0)' }}
          >
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[0.9375rem] font-bold text-slate-800">DBL Group HR</p>
            <p className="text-[0.6875rem] text-slate-400">Facility Provisioning</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[0.8125rem]">
      {icon}
      <span className="w-28 shrink-0 text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
