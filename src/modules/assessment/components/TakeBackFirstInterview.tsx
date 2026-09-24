import { useState } from 'react';
import { Hourglass, Undo2 } from 'lucide-react';

import { Button, Modal } from '@shared/components/ui';
import type { FirstInterviewHold } from '@modules/candidates';

import { useTakeBackFirstInterview } from '../hooks/useAssessment';
import { heldByLabel } from './heldByLabel';

/**
 * The recruiter's way to run a first interview they had sent to the factory.
 *
 * Withdrawing the hand-off is the deliberate act the lock points at — it
 * leaves a record, unlike quietly rescheduling somebody else's round. The
 * lock used to tell the recruiter to do it "under Assignments", where there
 * was no button to do it with, so a candidate once sent could never come back.
 *
 * Not offered while the Factory HR Head is deciding: that would leave the
 * Head approving a candidate nobody was holding any more.
 */
export function TakeBackFirstInterview({
  candidateId,
  candidateName,
  hold,
}: {
  candidateId: string;
  candidateName: string;
  hold: FirstInterviewHold;
}) {
  const takeBack = useTakeBackFirstInterview(candidateId);
  const [confirming, setConfirming] = useState(false);

  if (hold.awaitingApproval) {
    return (
      <p className="mt-3 inline-flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-[0.6875rem] leading-relaxed text-amber-800">
        <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {heldByLabel(hold)} put {candidateName} through. It is with the
        Factory HR Head for approval, and comes to you for the second
        interview once they approve.
      </p>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        leftIcon={<Undo2 className="h-4 w-4" />}
        onClick={() => setConfirming(true)}
      >
        Take it back — I&rsquo;ll interview
      </Button>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        size="sm"
        title="Take the first interview back?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              isLoading={takeBack.isPending}
              leftIcon={<Undo2 className="h-4 w-4" />}
              onClick={() =>
                takeBack.mutate(
                  hold.delegates.map((d) => d.id),
                  { onSuccess: () => setConfirming(false) },
                )
              }
            >
              Take it back
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {candidateName}&rsquo;s first interview is withdrawn from{' '}
          <span className="font-semibold">{heldByLabel(hold)}</span> and comes
          back to you to arrange and run. Any round they already booked stays
          on the record, and you can change or remove it.
        </p>
      </Modal>
    </>
  );
}
