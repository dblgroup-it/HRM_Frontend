import { Check } from 'lucide-react';

import { cn } from '@shared/lib';

import type { RequisitionStatus } from '../types/requisition.types';
import { WORKFLOW_STEPS } from '../constants';

/** Maps a requisition status to how far along the 4 steps it is (1–4). */
function currentStep(status: RequisitionStatus): number {
  switch (status) {
    case 'draft':
    case 'pending_approval':
      return 1;
    case 'rejected':
    case 'approved':
      return 2;
    case 'profile_generated':
      return 3;
    case 'posted':
      return 4;
    default:
      return 1;
  }
}

export function WorkflowStepper({ status }: { status: RequisitionStatus }) {
  const active = currentStep(status);
  const rejected = status === 'rejected';

  return (
    <ol className="flex items-center">
      {WORKFLOW_STEPS.map((step, index) => {
        const isComplete = step.step < active || status === 'posted';
        const isCurrent = step.step === active && status !== 'posted';
        const isRejectedHere = rejected && step.key === 'approval';

        return (
          <li
            key={step.key}
            className={cn(
              'flex items-center',
              index < WORKFLOW_STEPS.length - 1 && 'flex-1'
            )}
          >
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  isRejectedHere
                    ? 'border-red-500 bg-red-500 text-white'
                    : isComplete
                      ? 'border-accent-500 bg-accent-500 text-white'
                      : isCurrent
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-400'
                )}
              >
                {isComplete && !isRejectedHere ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.step
                )}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-xs font-medium',
                  isCurrent || isComplete ? 'text-slate-700' : 'text-slate-400'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2 mb-5 h-0.5 flex-1 rounded',
                  step.step < active ? 'bg-accent-400' : 'bg-slate-200'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
