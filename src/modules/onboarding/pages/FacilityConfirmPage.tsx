import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Briefcase, Building2, CheckCircle2, Layers, ShieldCheck, XCircle } from 'lucide-react';

import { FullPageSpinner } from '@shared/components/ui';
import { useFacilityConfirmInfo, useSubmitFacilityConfirm } from '../hooks/useFacilityProvisioning';

export default function FacilityConfirmPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isLoading, isError } = useFacilityConfirmInfo(token);
  const submit = useSubmitFacilityConfirm(token);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

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
          <p className="text-[13px] text-slate-500">
            Dear <span className="font-semibold text-slate-700">{data.recipientName}</span>,
          </p>
          <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
            HR has asked you to arrange <b>{data.facilityLabel}</b> for the following new joiner.
            Please confirm below once it&rsquo;s ready.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div
            className="border-b border-slate-100 px-5 py-4"
            style={{ background: 'linear-gradient(to right,#f8fafc,#eff6ff)' }}
          >
            <p className="text-xl font-bold text-slate-800">{c.name}</p>
            <p className="mt-0.5 text-[13px] text-slate-500">{c.designation}</p>
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

        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">
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

        <button
          type="button"
          disabled={submit.isPending}
          onClick={() => submit.mutate(note || undefined, { onSuccess: () => setDone(true) })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-60 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#059669,#0d9488)', boxShadow: '0 8px 24px -4px rgba(5,150,105,.35)' }}
        >
          <CheckCircle2 className="h-5 w-5" />
          {submit.isPending ? 'Submitting…' : `Confirm ${data.facilityLabel} arranged`}
        </button>

        <p className="text-center text-[11px] text-slate-400">
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
            <p className="text-[15px] font-bold text-slate-800">DBL Group HR</p>
            <p className="text-[11px] text-slate-400">Facility Provisioning</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px]">
      {icon}
      <span className="w-28 shrink-0 text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
