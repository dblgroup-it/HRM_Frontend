import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Mail, Send, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Modal, Spinner } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { onboardingApi } from '../api/onboarding.api';
import { useMedicalLetterDraft } from '../hooks/useOnboarding';
import type { MedicalAgeBand } from '../types/onboarding.types';

/** "2026-08-29T10:30" for a datetime-local input. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Send the pre-employment medical test letter.
 *
 * Two emails leave here: the letter to whoever holds the medical roles, and
 * where/when/what-to-bring to the candidate. Recipients are not typed — they
 * are resolved from the roles and shown before sending, because an address
 * retyped per send is a transcription error headed for an external clinic.
 *
 * The age band is the one thing that must not be got wrong: the two test lists
 * differ by an actual test, so a wrong band means a test nobody runs. It is
 * offered from the candidate's date of birth and always left changeable.
 */
export function MedicalLetterModal({
  onboardingId,
  open,
  onClose,
}: {
  onboardingId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: draft, isLoading } = useMedicalLetterDraft(onboardingId, open);

  const [band, setBand] = useState<MedicalAgeBand | null>(null);
  const [examAt, setExamAt] = useState('');
  const [venue, setVenue] = useState('');
  const [salutation, setSalutation] = useState('Mr.');
  const [notifyTeam, setNotifyTeam] = useState(true);
  const [notifyCandidate, setNotifyCandidate] = useState(true);

  useEffect(() => {
    if (!draft) return;
    setBand(draft.band ?? draft.suggestedBand);
    setExamAt(toLocalInput(draft.examAt));
    setVenue(draft.venue);
  }, [draft]);

  const reachable = useMemo(
    () => (draft?.recipients ?? []).filter((r) => r.hasEmail),
    [draft],
  );
  const unreachable = useMemo(
    () => (draft?.recipients ?? []).filter((r) => !r.hasEmail),
    [draft],
  );

  const send = useMutation({
    mutationFn: () =>
      onboardingApi.sendMedicalLetter(onboardingId, {
        band: band as MedicalAgeBand,
        examAt: new Date(examAt).toISOString(),
        venue: venue.trim() || undefined,
        salutation: salutation.trim() || undefined,
        notifyMedicalTeam: notifyTeam,
        notifyCandidate,
      }),
    onSuccess: (result) => {
      toast.success(`Letter sent — ${result.refNo}`);
      if (result.failed.length) {
        toast.warning(
          `${result.failed.length} address failed: ${result.failed[0].reason}`,
        );
      }
      void qc.invalidateQueries({ queryKey: ['medical-letter', onboardingId] });
      void qc.invalidateQueries({ queryKey: ['onboarding'] });
      onClose();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Could not send the letter'),
  });

  // At least one recipient, and the team box only counts if anyone is reachable.
  const ready =
    Boolean(band) &&
    Boolean(examAt) &&
    ((notifyTeam && reachable.length > 0) ||
      (notifyCandidate && Boolean(draft?.candidateEmail)));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Send medical test letter"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {draft?.refNo
              ? `Re-send — keeps reference ${draft.refNo}`
              : 'A reference number is issued when you send.'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={send.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => send.mutate()}
              disabled={!ready}
              isLoading={send.isPending}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Send
            </Button>
          </div>
        </div>
      }
    >
      {isLoading || !draft ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Spinner className="h-4 w-4" />
          Preparing the letter…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">
              {draft.candidateName}
            </p>
            <p className="text-xs text-slate-500">Unit — {draft.unitName}</p>
          </div>

          {/* The band decides which tests the clinic runs, so it is first and
              it says why it was chosen. */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Test list
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['below_40', 'Below 40', '7 tests'],
                  ['above_40', '40 & above', '8 tests · adds S/Creatinine'],
                ] as [MedicalAgeBand, string, string][]
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBand(value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-colors',
                    band === value
                      ? 'border-brand-300 bg-brand-50/60'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                  )}
                >
                  <span className="block text-sm font-semibold text-slate-800">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[0.6875rem] text-slate-500">
                    {hint}
                  </span>
                </button>
              ))}
            </div>
            <p
              className={cn(
                'mt-1.5 text-xs',
                draft.suggestedBand ? 'text-slate-500' : 'font-medium text-amber-700',
              )}
            >
              {draft.suggestedBand
                ? `Suggested from date of birth (${draft.dateOfBirth}). Change it if the record is wrong.`
                : 'No date of birth on file — choose the list yourself.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,7rem]">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Appointment (date and time)
              </span>
              <input
                type="datetime-local"
                value={examAt}
                onChange={(e) => setExamAt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Salutation
              </span>
              <input
                value={salutation}
                onChange={(e) => setSalutation(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Venue
            </span>
            <textarea
              rows={2}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Printed on the clinic&rsquo;s letter and in the candidate&rsquo;s
              email — one address, so the two cannot disagree.
            </span>
          </label>

          {/* Who it reaches, before sending rather than after. Each side is
              its own choice: a clinic already told by phone still needs the
              candidate emailed, and the reverse. */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={notifyTeam}
              onChange={(e) => setNotifyTeam(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
              disabled={reachable.length === 0}
            />
            <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              Send the letter to the medical team
              {draft.teamSentAt && (
                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide text-emerald-700">
                  Sent
                </span>
              )}
            </p>
            {reachable.length === 0 ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Nobody holding a medical role has an email address. Assign the
                role, or add an address, in Access Control before sending.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-600">
                {reachable.map((r) => r.name).join(', ')}
              </p>
            )}
            {unreachable.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No email on file, so skipped: {unreachable.map((r) => r.name).join(', ')}
              </p>
            )}
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={notifyCandidate}
              onChange={(e) => setNotifyCandidate(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
              disabled={!draft.candidateEmail}
            />
            <span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                Email the candidate
                {draft.candidateSentAt && (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide text-emerald-700">
                    Sent
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {draft.candidateEmail
                  ? `Where to be, when, and what to bring — sent to ${draft.candidateEmail}. The test list is not repeated to them.`
                  : 'This candidate has no email address on file.'}
              </span>
            </span>
          </label>
        </div>
      )}
    </Modal>
  );
}
