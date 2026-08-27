import { useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  ClipboardList,
  Mail,
  MapPin,
  Stethoscope,
} from 'lucide-react';

import { Avatar, Button, EmptyState, PageHeader, Spinner } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { MedicalExamForm } from '../components/MedicalExamForm';
import { useMedicalQueue } from '../hooks/useOnboarding';
import type { MedicalQueueItem } from '../types/onboarding.types';

function daysWaiting(createdAt: string) {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day';
  return `${diff} days`;
}

export default function MedicalQueuePage() {
  const { data: queue = [], isLoading, isError } = useMedicalQueue();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
              <div
                key={item.id}
                className={cn(expandedId === item.id && 'sm:col-span-2 xl:col-span-3')}
              >
                <MedicalCard
                  item={item}
                  expanded={expandedId === item.id}
                  onToggleExpand={() =>
                    setExpandedId((cur) => (cur === item.id ? null : item.id))
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MedicalCard({
  item,
  expanded,
  onToggleExpand,
}: {
  item: MedicalQueueItem;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const waiting = daysWaiting(item.createdAt ?? new Date().toISOString());
  const urgent = waiting === 'Today';

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-card-hover',
        urgent ? 'border-brand-100' : 'border-amber-100',
      )}
    >
      {/* Header band */}
      <div
        className={cn(
          'relative px-4 pb-5 pt-4',
          urgent
            ? 'bg-gradient-to-br from-brand-50 via-brand-50/60 to-white'
            : 'bg-gradient-to-br from-amber-50 via-amber-50/60 to-white',
        )}
      >
        <span
          className={cn(
            'absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-sm',
            urgent ? 'bg-brand-600' : 'bg-amber-500',
          )}
        >
          <Clock className="h-3 w-3" />
          {waiting}
        </span>
        <Avatar
          name={item.candidate.name}
          size="lg"
          className={cn(
            'ring-4 ring-white text-white shadow',
            urgent ? 'bg-brand-600' : 'bg-amber-500',
          )}
        />
        <p className="mt-3 truncate text-base font-bold text-slate-900">
          {item.candidate.name}
        </p>
        <p className="truncate text-sm text-slate-500">{item.candidate.designation}</p>
      </div>

      {/* Candidate details */}
      <div className="space-y-2 px-4 py-3.5 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{item.candidate.unit}</span>
        </div>
        {item.candidate.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{item.candidate.location}</span>
          </div>
        )}
        {item.candidate.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{item.candidate.email}</span>
          </div>
        )}
      </div>

      {/* Action area */}
      <div className="flex-1 space-y-3 border-t border-slate-100 px-4 py-3">
        <Button
          size="sm"
          variant={expanded ? 'outline' : 'primary'}
          fullWidth
          leftIcon={<ClipboardList className="h-3.5 w-3.5" />}
          rightIcon={
            expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )
          }
          onClick={onToggleExpand}
        >
          {expanded ? 'Hide exam form' : 'Fill medical exam form to decide'}
        </Button>

        {expanded && (
          <MedicalExamForm item={item} onClose={onToggleExpand} />
        )}
      </div>
    </div>
  );
}
