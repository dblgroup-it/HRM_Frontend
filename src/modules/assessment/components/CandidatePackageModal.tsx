import { CheckCircle2, Lock, Save } from 'lucide-react';

import { Button, Modal } from '@shared/components/ui';

import { useSetCandidatePackage } from '../hooks/useAssessment';
import { FacilitiesForm } from './FacilitiesForm';

/**
 * What the candidate earns now and what they are asking for.
 *
 * Its own modal rather than a section of the Salary Fixation screen, and
 * deliberately so: this is filled in by whoever ran the interview — usually
 * factory HR, who has no business setting anybody's pay — while Salary
 * Fixation is Corporate HR settling the grade, the band and the figure. Two
 * different people, two different moments, two different authorities.
 *
 * The fields are `FacilitiesForm`, shared with the HR section of the
 * evaluation form, so the two cannot drift apart.
 */
export function CandidatePackageModal({
  candidate,
  open,
  onClose,
  stacked,
  onSaved,
}: {
  candidate: {
    id: string;
    name: string;
    presentSalary?: number | null;
    salaryExpectation?: number | null;
    salaryBenefitsNote?: string | null;
    salaryBenefits?: string[];
    transportPickup?: string | null;
    packageUpdatedAt?: string | null;
    packageUpdatedByName?: string | null;
  };
  open: boolean;
  onClose: () => void;
  /** Opened from another dialog — show it above that one. */
  stacked?: boolean;
  /** After a successful save, e.g. to refresh the screen it was opened from. */
  onSaved?: () => void;
}) {
  const save = useSetCandidatePackage(candidate.id);
  const initial = {
    presentSalary: candidate.presentSalary ?? null,
    salaryExpectation: candidate.salaryExpectation ?? null,
    salaryBenefitsNote: candidate.salaryBenefitsNote ?? null,
    salaryBenefits: candidate.salaryBenefits ?? [],
    transportPickup: candidate.transportPickup ?? null,
    updatedAt: candidate.packageUpdatedAt ?? null,
    updatedByName: candidate.packageUpdatedByName ?? null,
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      stacked={stacked}
      size="md"
      title={`Facilities & salary — ${candidate.name}`}
    >
      <p className="mb-4 text-xs text-slate-500">
        What the candidate told you in the interview. Corporate HR sees this on
        the Salary Fixation screen when they settle the offer.
      </p>
      {/* Keyed on the stamp: a colleague's newer save reseeds the fields. */}
      <FacilitiesForm
        key={`${candidate.id}:${initial.updatedAt ?? 'new'}:${open}`}
        initial={initial}
        saving={save.isPending}
        onSave={(input) =>
          save.mutate(input, {
            onSuccess: () => {
              onSaved?.();
              onClose();
            },
          })
        }
        renderActions={(submit, { dirty, saved }) => (
          <>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-slate-500">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              The final salary is not set here. Corporate HR fixes it against the
              grade and the committee&rsquo;s marks.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                {dirty ? 'Cancel' : 'Close'}
              </Button>
              {/* Nothing changed, nothing to send: says so instead. */}
              {saved && !dirty ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              ) : (
                <Button
                  isLoading={save.isPending}
                  disabled={!dirty}
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={submit}
                >
                  {saved ? 'Save changes' : 'Save'}
                </Button>
              )}
            </div>
          </>
        )}
      />
    </Modal>
  );
}
