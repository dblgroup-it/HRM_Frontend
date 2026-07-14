import { useState } from 'react';
import { CheckCircle2, Clock, MapPin, Stethoscope, XCircle } from 'lucide-react';

import {
  Avatar,
  Button,
  EmptyState,
  PageHeader,
  Spinner,
  Textarea,
} from '@shared/components/ui';
import { cn } from '@shared/lib';

import { useMedicalQueue, useSetMedical } from '../hooks/useOnboarding';
import type { MedicalQueueItem } from '../types/onboarding.types';

function daysWaiting(createdAt: string) {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day';
  return `${diff} days`;
}

export default function MedicalQueuePage() {
  const { data: queue = [], isLoading, isError } = useMedicalQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Clearance"
        description="New hires awaiting your sign-off before joining."
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="Not available"
          description="Only a medical officer or super user can view this queue."
        />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="Queue is clear"
          description="No candidates are awaiting medical clearance right now."
        />
      ) : (
        <>
          {/* Summary banner */}
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Stethoscope className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">
              {queue.length} candidate{queue.length > 1 ? 's' : ''} awaiting medical clearance
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {queue.map((item) => (
              <MedicalCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MedicalCard({ item }: { item: MedicalQueueItem }) {
  const setMedical = useSetMedical();
  const [note, setNote]       = useState('');
  const [action, setAction] = useState<'clear' | 'reject' | null>(null);

  const waiting = daysWaiting(item.createdAt ?? new Date().toISOString());

  const confirm = (a: 'clear' | 'reject') => setAction(a);

  const submit = () => {
    if (!action) return;
    setMedical.mutate({
      onboardingId: item.id,
      status: action === 'clear' ? 'cleared' : 'rejected',
      note: note || undefined,
    });
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* Waiting indicator strip */}
      <div className={cn(
        'flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold',
        waiting === 'Today'
          ? 'bg-brand-50 text-brand-700'
          : 'bg-amber-50 text-amber-700',
      )}>
        <Clock className="h-3 w-3" />
        Waiting {waiting}
      </div>

      {/* Candidate info */}
      <div className="flex items-start gap-3 px-4 py-4">
        <Avatar name={item.candidate.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 truncate">{item.candidate.name}</p>
          <p className="text-sm text-slate-500 truncate mt-0.5">{item.candidate.designation}</p>
          <div className="mt-2 space-y-0.5 text-xs text-slate-400">
            <p className="truncate">{item.candidate.unit}</p>
            {item.candidate.location && (
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {item.candidate.location}
              </p>
            )}
            {item.candidate.email && (
              <p className="truncate">{item.candidate.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 mx-4" />

      {/* Action area */}
      <div className="flex-1 px-4 py-3 space-y-3">

        {!action ? (
          /* Initial state — two clear buttons */
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => confirm('clear')}
              className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300"
            >
              <CheckCircle2 className="h-6 w-6" />
              <span className="text-xs font-semibold">Clear</span>
            </button>
            <button
              type="button"
              onClick={() => confirm('reject')}
              className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-rose-200 bg-rose-50 px-3 py-3 text-rose-600 transition hover:bg-rose-100 hover:border-rose-300"
            >
              <XCircle className="h-6 w-6" />
              <span className="text-xs font-semibold">Reject</span>
            </button>
          </div>
        ) : (
          /* Confirmation state */
          <div className={cn(
            'rounded-xl border-2 p-3 space-y-3',
            action === 'clear' ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50',
          )}>
            <p className={cn('text-sm font-semibold flex items-center gap-1.5', action === 'clear' ? 'text-emerald-700' : 'text-rose-700')}>
              {action === 'clear'
                ? <><CheckCircle2 className="h-4 w-4" /> Marking as Cleared</>
                : <><XCircle className="h-4 w-4" /> Marking as Rejected</>
              }
            </p>

            <Textarea
              rows={2}
              placeholder={
                action === 'clear'
                  ? 'Notes (optional) — e.g. fit to join'
                  : 'Reason (optional) — e.g. requires follow-up tests'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                fullWidth
                variant={action === 'clear' ? undefined : 'danger'}
                isLoading={setMedical.isPending}
                onClick={submit}
              >
                Confirm {action === 'clear' ? 'clearance' : 'rejection'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setAction(null); setNote(''); }}
                disabled={setMedical.isPending}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
