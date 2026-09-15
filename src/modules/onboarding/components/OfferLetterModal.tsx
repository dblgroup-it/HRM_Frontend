import { useEffect, useMemo, useState } from 'react';
import { FileText, Mail, Printer, RotateCcw } from 'lucide-react';

import { Button, Modal, Spinner } from '@shared/components/ui';
import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';
import { cn } from '@shared/lib';
import { printDocument } from '@shared/utils';
import { toast } from 'sonner';

import { useMasterData } from '@modules/master-data';

import {
  useSendOffer,
  useSetOnboardingDesignation,
} from '../hooks/useOnboarding';
import type { OnboardingView } from '../types/onboarding.types';

type Format = 'junior' | 'senior';

/** Company-wide and not editable — only the serial after it is typed. */
const OFFER_REF_PREFIX = 'Corp/HR/OL-';

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
  candidate: {
    id: string;
    name: string;
    designation: string;
    requisitionDesignation?: string;
    alternateDesignations?: string[];
    fixedDesignation?: string | null;
    unit: string;
  };
  onboarding: OnboardingView | null;
  open: boolean;
  onClose: () => void;
}) {
  const ob = onboarding;
  const sendOffer = useSendOffer(candidate.id);
  const { data: master } = useMasterData();
  const jobLocations = master?.jobLocations ?? [];

  const [format, setFormat] = useState<Format>(
    (ob?.offerFormat as Format | null) ?? 'junior',
  );

  /**
   * Which level this person is actually hired at.
   *
   * A requisition can be raised for several — "Senior Executive or Assistant
   * Manager" — because the level depends on who is found. The letter is signed
   * and sent, so it has to name one, and this is where that is settled.
   * Single-designation requisitions never see this control.
   */
  // Built from the requisition's own primary, not from `candidate.designation`
  // — that now shows the settled level, so deriving the list from it would
  // drop the primary from the choices as soon as an alternate was picked.
  const levels = [
    candidate.requisitionDesignation ?? candidate.designation,
    ...(candidate.alternateDesignations ?? []),
  ];
  const multiLevel = levels.length > 1;
  const setDesignation = useSetOnboardingDesignation(candidate.id);
  const fixedDesignation =
    candidate.fixedDesignation ?? (multiLevel ? '' : levels[0]);
  const [salutation, setSalutation] = useState('Mr.');
  const [address, setAddress] = useState(ob?.candidateAddress ?? '');
  // The prefix is fixed company-wide; only the serial is typed. Stored whole,
  // so an older reference saved before this split still loads and displays.
  const [refNo, setRefNo] = useState(
    (ob?.offerRef ?? '').replace(OFFER_REF_PREFIX, ''),
  );
  const reference = refNo.trim() ? `${OFFER_REF_PREFIX}${refNo.trim()}` : '';
  const [joiningDate, setJoiningDate] = useState(ob?.offerJoiningDate ?? '');
  // Blank means "use the unit's own name", which is what the letter falls back
  // to server-side. Seeding it with the unit name instead made the picker open
  // on "Somewhere else…", since a unit name is not one of the addresses.
  const [jobLocation, setJobLocation] = useState(ob?.offerJobLocation ?? '');
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
      // Omitted on a single-designation requisition, where the primary applies.
      fixedDesignation: multiLevel ? fixedDesignation || undefined : undefined,
      salutation: salutation.trim() || undefined,
      address: address.trim() || undefined,
      reference: reference.trim() || undefined,
      joiningDate: joiningDate || undefined,
      // Both formats print the job location, so it is sent for both — while
      // this sat inside the senior branch the junior preview never saw a
      // change, and a saved junior letter lost the location entirely.
      jobLocation: jobLocation.trim() || undefined,
      ...(format === 'senior'
        ? {
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
    [format, fixedDesignation, multiLevel, salutation, address, reference, joiningDate, jobLocation, benefits, probation, notice],
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
              // Sending a letter that names the wrong level is not correctable
              // once it is in the candidate's inbox, so the choice is required
              // rather than defaulted.
              disabled={multiLevel && !fixedDesignation}
              title={
                multiLevel && !fixedDesignation
                  ? 'Choose the confirmed designation first'
                  : undefined
              }
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
          {/* Only for a requisition raised at more than one level. The letter
              is signed and sent, so it has to name one. */}
          {multiLevel && (
            <div>
              <span className={label}>Confirmed designation</span>
              <div className="grid gap-1.5">
                {levels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDesignation.mutate(level)}
                    disabled={setDesignation.isPending}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors',
                      fixedDesignation === level
                        ? 'border-brand-300 bg-brand-50/60 text-slate-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {level}
                    {level === candidate.designation && (
                      <span className="ml-1.5 text-[0.6875rem] font-normal text-slate-400">
                        primary
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p
                className={cn(
                  'mt-1.5 text-xs',
                  fixedDesignation ? 'text-slate-500' : 'font-medium text-amber-700',
                )}
              >
                {fixedDesignation
                  ? 'This is what the offer and appointment letters will print.'
                  : 'Choose the level before sending — it is printed on the letter.'}
              </p>
            </div>
          )}

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
              <div className="flex items-stretch">
                <span className="inline-flex shrink-0 items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-500">
                  {OFFER_REF_PREFIX}
                </span>
                <input
                  className={cn(field, 'rounded-l-none')}
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="4322/26"
                />
              </div>
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

          {/* Both formats print the job location now, so the picker is not
              behind the senior/junior branch. */}
          <label className="block">
            <span className={label}>Job location</span>
            <select
              className={field}
              value={jobLocations.includes(jobLocation) ? jobLocation : jobLocation ? '__other' : ''}
              onChange={(e) =>
                setJobLocation(e.target.value === '__other' ? ' ' : e.target.value)
              }
            >
              <option value="">Not stated — leave the line off</option>
              {jobLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
              <option value="__other">Somewhere else…</option>
            </select>
            {jobLocation && !jobLocations.includes(jobLocation) && (
              <input
                autoFocus
                className={cn(field, 'mt-2')}
                value={jobLocation.trim()}
                onChange={(e) => setJobLocation(e.target.value)}
                placeholder="Type the address"
              />
            )}
          </label>

          {format === 'senior' ? (
            <>
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
