import { useEffect, useMemo, useState } from 'react';
import { FileText, Mail, Printer, RotateCcw } from 'lucide-react';

import { Button, Modal, Spinner } from '@shared/components/ui';
import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';
import { cn } from '@shared/lib';
import { printDocument } from '@shared/utils';
import { toast } from 'sonner';

import { useSendOffer } from '../hooks/useOnboarding';
import type { OnboardingView } from '../types/onboarding.types';

type Format = 'junior' | 'senior';

const FORMATS: { value: Format; label: string; hint: string }[] = [
  {
    value: 'junior',
    label: 'Junior / Mid',
    hint: 'Probation period and notice. Points to a Service Agreement after joining.',
  },
  {
    value: 'senior',
    label: 'Senior',
    hint: 'Numbered terms with job location and benefits. Points to an Appointment letter.',
  },
];

const DEFAULT_BENEFITS = [
  'Two Festival Bonuses in a year as per company policy;',
  'Leave Fair Assistance (LFA) will be entitled as per company policy;',
  'Full time car as per company policy;',
  'Other admissible benefits as per company policy;',
];

/**
 * Compose and send the offer letter.
 *
 * DBL issues two house formats and they differ in substance, not just wording:
 * the junior letter carries a probation period and notice, the senior one a
 * job location and a benefits list. Choosing the format therefore changes
 * which terms are asked for, and the letter is rendered by the backend so what
 * is previewed here is exactly what is mailed.
 */
export function OfferLetterModal({
  candidate,
  onboarding,
  open,
  onClose,
}: {
  candidate: { id: string; name: string; designation: string; unit: string };
  onboarding: OnboardingView | null;
  open: boolean;
  onClose: () => void;
}) {
  const ob = onboarding;
  const sendOffer = useSendOffer(candidate.id);

  const [format, setFormat] = useState<Format>(
    (ob?.offerFormat as Format | null) ?? 'junior',
  );
  const [salutation, setSalutation] = useState('Mr.');
  const [address, setAddress] = useState(ob?.candidateAddress ?? '');
  const [reference, setReference] = useState(ob?.offerRef ?? '');
  const [joiningDate, setJoiningDate] = useState(ob?.offerJoiningDate ?? '');
  const [jobLocation, setJobLocation] = useState(
    ob?.offerJobLocation ?? candidate.unit,
  );
  const [probation, setProbation] = useState(
    String(ob?.offerProbationMonths ?? 6),
  );
  const [notice, setNotice] = useState(String(ob?.offerNoticeDays ?? 15));
  const [benefits, setBenefits] = useState(
    (ob?.offerBenefits?.length ? ob.offerBenefits : DEFAULT_BENEFITS).join('\n'),
  );

  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);

  const payload = useMemo(
    () => ({
      format,
      salutation: salutation.trim() || undefined,
      address: address.trim() || undefined,
      reference: reference.trim() || undefined,
      joiningDate: joiningDate || undefined,
      ...(format === 'senior'
        ? {
            jobLocation: jobLocation.trim() || undefined,
            benefits: benefits
              .split('\n')
              .map((b) => b.trim())
              .filter(Boolean),
          }
        : {
            probationMonths: Number(probation) || 0,
            noticeDays: Number(notice) || 0,
          }),
    }),
    [format, salutation, address, reference, joiningDate, jobLocation, benefits, probation, notice],
  );

  // Re-render on any change, debounced — the preview is the point of the page.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      http
        .post<ApiResponse<{ html: string }>>(
          `/candidates/${candidate.id}/onboarding/offer/preview`,
          payload,
        )
        .then((r) => {
          if (!cancelled) setHtml(r.data.html);
        })
        .catch(() => {
          if (!cancelled) setHtml('');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, candidate.id, payload]);

  const field =
    'w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none';
  const label =
    'mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title={`Offer letter — ${candidate.name}`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            {ob?.offerSentAt
              ? 'Already sent — sending again replaces the stored copy.'
              : 'The letter below is exactly what the candidate receives.'}
          </span>
          <div className="flex gap-2">
            {/* Prints the letter alone — the preview is already the finished
                document, so there is nothing to assemble first. */}
            <Button
              variant="outline"
              size="sm"
              disabled={!html}
              leftIcon={<Printer className="h-3.5 w-3.5" />}
              onClick={() => {
                if (!printDocument(html, `Offer letter — ${candidate.name}`)) {
                  toast.error(
                    'Your browser blocked the print window — allow popups for this site.',
                  );
                }
              }}
            >
              Print
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              leftIcon={<Mail className="h-3.5 w-3.5" />}
              isLoading={sendOffer.isPending}
              onClick={() =>
                sendOffer.mutate(payload, { onSuccess: onClose })
              }
            >
              {ob?.offerSentAt ? 'Resend letter' : 'Send letter'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[20rem,1fr]">
        {/* Terms */}
        <div className="space-y-3">
          <div>
            <span className={label}>Format</span>
            <div className="grid gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left transition-colors',
                    format === f.value
                      ? 'border-brand-300 bg-brand-50/60'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                  )}
                >
                  <span className="block text-sm font-semibold text-slate-800">
                    {f.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    {f.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[4.5rem,1fr] gap-2">
            <label>
              <span className={label}>Title</span>
              <input
                className={field}
                value={salutation}
                onChange={(e) => setSalutation(e.target.value)}
                placeholder="Mr."
              />
            </label>
            <label>
              <span className={label}>Reference</span>
              <input
                className={field}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Corp/HR/OL-4322/26"
              />
            </label>
          </div>

          <label className="block">
            <span className={label}>Address</span>
            <input
              className={field}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Gopalpur, Nabinagar, Brahmanbaria."
            />
          </label>

          <label className="block">
            <span className={label}>Joining on or before</span>
            <input
              type="date"
              className={field}
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
            />
          </label>

          {format === 'senior' ? (
            <>
              <label className="block">
                <span className={label}>Job location</span>
                <input
                  className={field}
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={label}>
                  Benefits <span className="normal-case">— one per line</span>
                </span>
                <textarea
                  rows={5}
                  className={cn(field, 'font-normal leading-5')}
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setBenefits(DEFAULT_BENEFITS.join('\n'))}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  <RotateCcw className="h-3 w-3" /> Reset to standard benefits
                </button>
              </label>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className={label}>Probation (months)</span>
                <input
                  type="number"
                  min={0}
                  className={field}
                  value={probation}
                  onChange={(e) => setProbation(e.target.value)}
                />
              </label>
              <label>
                <span className={label}>Notice (days)</span>
                <input
                  type="number"
                  min={0}
                  className={field}
                  value={notice}
                  onChange={(e) => setNotice(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        {/* Live preview of the actual letter */}
        <div className="flex min-h-[30rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">
              Letter preview
            </span>
            {loading && <Spinner className="ml-auto h-3.5 w-3.5" />}
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
            {html ? (
              // The letter renders at its own document width on a grey
              // ground, the way a printed page reads — not squeezed to fit.
              <div
                className="mx-auto bg-white shadow-sm ring-1 ring-slate-200"
                style={{ width: 760, maxWidth: '100%' }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                {loading ? 'Rendering…' : 'Preview unavailable'}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
