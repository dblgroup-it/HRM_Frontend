import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ClipboardList,
  Clock,
  RotateCcw,
  Search,
  Stethoscope,
} from 'lucide-react';

import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';

import { MedicalExamForm } from '../components/MedicalExamForm';
import { useMedicalQueue } from '../hooks/useOnboarding';
import type { MedicalQueueItem } from '../types/onboarding.types';

function daysWaiting(createdAt: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000),
  );
}

const waitLabel = (days: number) =>
  days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`;

/**
 * The examining officer's queue.
 *
 * Candidates needing an exam, plus anything the Central Medical Officer has
 * sent back. A returned candidate looks identical to a new one in the data —
 * both are `pending` — so the CMO's note is what distinguishes them, and it is
 * given the most prominent treatment on the page. Someone finding a candidate
 * back in their queue with no explanation is the worst outcome of adding an
 * approval layer.
 */
export default function MedicalQueuePage() {
  const { data: queue = [], isLoading, isError } = useMedicalQueue();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const returned = useMemo(
    () => queue.filter((i) => Boolean(i.medicalCmoNote)),
    [queue],
  );

  const longest = useMemo(
    () =>
      queue.reduce(
        (max, i) => Math.max(max, daysWaiting(i.createdAt ?? '')),
        0,
      ),
    [queue],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter(
      (i) =>
        i.candidate.name.toLowerCase().includes(q) ||
        (i.candidate.designation ?? '').toLowerCase().includes(q) ||
        (i.candidate.unit ?? '').toLowerCase().includes(q),
    );
  }, [queue, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medical Clearance"
        description="Candidates awaiting an examination. Your finding goes to the Central Medical Officer for confirmation."
      />

      {!isLoading && !isError && queue.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Awaiting exam" value={queue.length} icon={Stethoscope} />
          <Stat
            label="Sent back"
            value={returned.length}
            tone={returned.length ? 'alert' : 'muted'}
            icon={RotateCcw}
          />
          <Stat label="Longest wait" value={waitLabel(longest)} icon={Clock} />
        </div>
      )}

      <Card>
        {queue.length > 0 && (
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, designation or unit"
                className="pl-9"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Spinner className="h-4 w-4" />
            Loading the queue…
          </div>
        ) : isError ? (
          <div className="py-12">
            <EmptyState
              icon={<Stethoscope className="h-6 w-6" />}
              title="Not available"
              description="Only a medical officer or super user can view this queue."
            />
          </div>
        ) : queue.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Stethoscope className="h-6 w-6" />}
              title="Queue is clear"
              description="No candidates are awaiting medical clearance right now."
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No matches"
              description="No candidate in the queue matches that search."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((item) => (
              <QueueRow
                key={item.id}
                item={item}
                open={expandedId === item.id}
                onToggle={() =>
                  setExpandedId((cur) => (cur === item.id ? null : item.id))
                }
              />
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'plain',
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone?: 'plain' | 'alert' | 'muted';
  icon?: typeof Clock;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
        <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
      <p
        className={cn(
          'mt-1 truncate text-[1.75rem] font-semibold leading-none tabular-nums',
          tone === 'alert' && 'text-amber-600',
          tone === 'muted' && 'text-slate-300',
          tone === 'plain' && 'text-slate-900',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function QueueRow({
  item,
  open,
  onToggle,
}: {
  item: MedicalQueueItem;
  open: boolean;
  onToggle: () => void;
}) {
  const days = daysWaiting(item.createdAt ?? new Date().toISOString());
  const sentBack = Boolean(item.medicalCmoNote);

  return (
    <div className={cn('transition-colors', open && 'bg-slate-50/60')}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Amber rail marks a candidate the CMO returned — visible while
            scanning, before any text is read. */}
        <span
          aria-hidden
          className={cn(
            'mt-1 h-9 w-[3px] shrink-0 rounded-full',
            sentBack ? 'bg-amber-500' : 'bg-slate-200',
          )}
        />

        <Avatar name={item.candidate.name} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="truncate text-sm font-semibold text-slate-900">
              {item.candidate.name}
            </p>
            {sentBack && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-amber-700">
                <RotateCcw className="h-2.5 w-2.5" />
                Sent back
              </span>
            )}
            <span
              className={cn(
                'text-[0.6875rem] tabular-nums',
                days >= 7 ? 'font-semibold text-rose-600' : 'text-slate-400',
              )}
            >
              {waitLabel(days)} waiting
            </span>
          </div>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {item.candidate.designation} · {item.candidate.unit}
          </p>
          {item.candidate.email && (
            <p className="mt-0.5 truncate text-[0.6875rem] text-slate-400">
              {item.candidate.email}
            </p>
          )}

          {/* The reason it came back. Deliberately the loudest thing on the
              row: it is the only record of what needs re-checking, and the
              officer cannot act sensibly without reading it. */}
          {sentBack && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[0.625rem] font-bold uppercase tracking-wide text-amber-700">
                Returned by the Central Medical Officer
              </p>
              <p className="mt-0.5 text-xs leading-5 text-amber-900">
                {item.medicalCmoNote}
              </p>
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant={open ? 'ghost' : 'outline'}
          className="shrink-0"
          leftIcon={<ClipboardList className="h-3.5 w-3.5" />}
          rightIcon={
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
            />
          }
          onClick={onToggle}
        >
          {open ? 'Hide form' : sentBack ? 'Re-examine' : 'Examine'}
        </Button>
      </div>

      {/* Same reasoning as the approvals panel: the alignment indent is a
          wide-screen nicety, not worth losing the form's right edge for. */}
      {open && (
        <div className="px-3 pb-4 sm:px-4 sm:pl-[4.25rem]">
          <MedicalExamForm item={item} onClose={onToggle} />
        </div>
      )}
    </div>
  );
}
