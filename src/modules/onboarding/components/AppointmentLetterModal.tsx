import { useEffect, useMemo, useState } from 'react';
import { FileText, Mail, Printer } from 'lucide-react';

import { Button, Modal, Spinner } from '@shared/components/ui';
import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';
import { printDocument } from '@shared/utils';
import { toast } from 'sonner';

import { useSendAppointmentLetter } from '../hooks/useOnboarding';
import type { OnboardingView } from '../types/onboarding.types';

/**
 * The appointment letter, issued after joining.
 *
 * Both offer formats end by promising this document — the junior letter calls
 * it a Service Agreement, the senior one an appointment letter — so it is one
 * letter rather than two, and it confirms terms already agreed rather than
 * offering anything new. Fewer fields than the offer for that reason.
 */
export function AppointmentLetterModal({
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
  const send = useSendAppointmentLetter(candidate.id);

  const [reference, setReference] = useState(ob?.appointmentRef ?? '');
  const [address, setAddress] = useState(ob?.candidateAddress ?? '');
  const [joiningDate, setJoiningDate] = useState(ob?.offerJoiningDate ?? '');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);

  const payload = useMemo(
    () => ({
      reference: reference.trim() || undefined,
      address: address.trim() || undefined,
      joiningDate: joiningDate || undefined,
    }),
    [reference, address, joiningDate],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      http
        .post<ApiResponse<{ html: string }>>(
          `/candidates/${candidate.id}/onboarding/appointment-letter/preview`,
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
      title={`Appointment letter — ${candidate.name}`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            {ob?.appointmentSentAt
              ? 'Already issued — sending again replaces the stored copy.'
              : 'Confirms the appointment on terms already agreed.'}
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
                if (!printDocument(html, `Appointment letter — ${candidate.name}`)) {
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
              isLoading={send.isPending}
              onClick={() => send.mutate(payload, { onSuccess: onClose })}
            >
              {ob?.appointmentSentAt ? 'Reissue letter' : 'Issue letter'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[18rem,1fr]">
        <div className="space-y-3">
          <label className="block">
            <span className={label}>Reference</span>
            <input
              className={field}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Corp/HR/AL-4322/26"
            />
          </label>
          <label className="block">
            <span className={label}>Address</span>
            <input
              className={field}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Effective from</span>
            <input
              type="date"
              className={field}
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
            />
          </label>
        </div>

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
