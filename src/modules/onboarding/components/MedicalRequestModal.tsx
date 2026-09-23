import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Input, Modal, Spinner } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { onboardingApi } from '../api/onboarding.api';
import { useMedicalLetterDraft } from '../hooks/useOnboarding';
import type { MedicalAgeBand } from '../types/onboarding.types';
import { MEDICAL_BANDS } from '../utils/medicalLetter';

const SALUTATIONS = ['Mr.', 'Ms.', 'Mrs.'];

/**
 * The recruiter's request for a medical test.
 *
 * Only what the recruiter knows: which test list, how the letter addresses
 * the candidate, and the register's reference if one was already given. The
 * date, the venue and who is emailed are Head of Talent Acquisition's call —
 * the request waits in their Medical Requests inbox and nothing is sent from
 * here.
 */
export function MedicalRequestModal({
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
  const [salutation, setSalutation] = useState('Mr.');
  const [refNo, setRefNo] = useState('');

  useEffect(() => {
    if (!draft) return;
    setBand(draft.band ?? draft.suggestedBand);
    if (draft.salutation) setSalutation(draft.salutation);
    setRefNo(draft.refNo ?? '');
  }, [draft]);

  const request = useMutation({
    mutationFn: () =>
      onboardingApi.requestMedicalTest(onboardingId, {
        band: band as MedicalAgeBand,
        salutation: salutation || undefined,
        refNo: refNo.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Sent to Head of Talent Acquisition to schedule');
      void qc.invalidateQueries({ queryKey: ['medical-letter', onboardingId] });
      void qc.invalidateQueries({ queryKey: ['onboarding'] });
      onClose();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Could not send the request'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Request medical test"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Head of Talent Acquisition sets the date and venue.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={request.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => request.mutate()}
              disabled={!band}
              isLoading={request.isPending}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              {draft?.requestPending ? 'Update request' : 'Send to HoTA'}
            </Button>
          </div>
        </div>
      }
    >
      {isLoading || !draft ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Spinner className="h-4 w-4" />
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">{draft.candidateName}</p>
            <p className="text-xs text-slate-500">Unit: {draft.unitName}</p>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Test list
            </span>
            <div className="grid grid-cols-2 gap-2">
              {MEDICAL_BANDS.map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBand(value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-colors',
                    band === value
                      ? 'border-brand-300 bg-brand-50/60 ring-1 ring-brand-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                  )}
                >
                  <span className="block text-sm font-semibold text-slate-800">{label}</span>
                  <span className="mt-0.5 block text-[0.6875rem] text-slate-500">{hint}</span>
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
                : 'No date of birth on file, so choose the list yourself.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[9rem,1fr]">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Salutation
              </span>
              <div className="flex h-10 overflow-hidden rounded-lg border border-slate-300">
                {SALUTATIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSalutation(s)}
                    className={cn(
                      'flex-1 text-sm font-medium transition-colors',
                      salutation === s
                        ? 'bg-brand-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Reference no."
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              placeholder="Leave blank to issue the next number"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
