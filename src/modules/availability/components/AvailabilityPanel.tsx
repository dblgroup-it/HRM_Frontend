import { useState } from 'react';
import {
  CalendarClock,
  Check,
  Loader2,
  MapPin,
  UserRoundCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button, Input, Select } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import {
  useAvailability,
  useEndLeave,
  useLeaveHandover,
  useStartLeave,
} from '../hooks/useAvailability';

/** The quick picks. Anything else is a date. */
const QUICK_DAYS = [3, 7, 15] as const;

/**
 * Going away, and coming back.
 *
 * Lives in the profile menu rather than in a control of its own beside the
 * bell: "am I at work today" is a fact about the person, and the person is
 * what the avatar already stands for. The header shows the state as a dot on
 * the avatar; this is where it is changed.
 */
export function AvailabilityPanel({ onDone }: { onDone?: () => void }) {
  const { data: status } = useAvailability();
  const onLeave = Boolean(status?.onLeave);
  const leave = status?.leave ?? null;

  const handover = useLeaveHandover(!onLeave);
  const start = useStartLeave();
  const end = useEndLeave();

  const [days, setDays] = useState<number | null>(7);
  const [until, setUntil] = useState('');
  const [note, setNote] = useState('');
  const [covers, setCovers] = useState<Record<string, string>>({});

  const recruiting = handover.data?.recruiting ?? [];
  const jobAnalyses = handover.data?.jobAnalyses ?? [];

  const confirm = () =>
    start.mutate(
      {
        ...(until ? { until } : days ? { days } : {}),
        note: note.trim() || undefined,
        covers: Object.entries(covers)
          .filter(([, coverRecruiterId]) => coverRecruiterId)
          .map(([requisitionId, coverRecruiterId]) => ({
            requisitionId,
            coverRecruiterId,
          })),
      },
      {
        onSuccess: () => {
          toast.success('You are on leave — your work has been passed on');
          setNote('');
          setCovers({});
          onDone?.();
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );

  return (
    <div>
      {/* Status band — the same two colours as the dot on the avatar. */}
      <div
        className={cn(
          'flex items-start justify-between gap-4 rounded-2xl px-4 py-3.5',
          onLeave
            ? 'bg-gradient-to-r from-amber-50 to-amber-100/60'
            : 'bg-gradient-to-r from-emerald-50 to-emerald-100/50',
        )}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span
              className={cn(
                'relative flex h-2.5 w-2.5 shrink-0 rounded-full',
                onLeave ? 'bg-amber-500' : 'bg-emerald-500',
              )}
            >
              {!onLeave && (
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
              )}
            </span>
            {onLeave ? 'On leave' : 'On duty'}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {onLeave
              ? leave?.endsAt
                ? `Back on ${formatDate(leave.endsAt)}`
                : 'Away until you say otherwise'
              : 'Requisitions are being routed to you'}
          </p>
        </div>
        {onLeave && leave?.daysLeft != null && (
          <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {leave.daysLeft}d left
          </span>
        )}
      </div>

      {onLeave ? (
        // --- already away ---------------------------------------------
        <div className="mt-4">
          {leave?.note && (
            <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs italic text-slate-600">
              &ldquo;{leave.note}&rdquo;
            </p>
          )}
          <Button
            className="mt-3 w-full"
            isLoading={end.isPending}
            leftIcon={<UserRoundCheck className="h-4 w-4" />}
            onClick={() =>
              end.mutate(undefined, {
                onSuccess: () => {
                  toast.success('Welcome back — you are on duty again');
                  onDone?.();
                },
                onError: (e) => toast.error((e as Error).message),
              })
            }
          >
            I&rsquo;m back
          </Button>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Requisitions being covered come back to you. A job analysis that
            moved on stays with whoever picked it up.
          </p>
        </div>
      ) : (
        // --- going away -----------------------------------------------
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              How long
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDays(d);
                    setUntil('');
                  }}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs font-medium transition',
                    !until && days === d
                      ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {d} days
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setDays(null);
                  setUntil('');
                }}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-medium transition',
                  !until && days === null
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                Until I&rsquo;m back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="date"
              label="Or pick the last day away"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
            <Input
              label="Note (optional)"
              placeholder="e.g. annual leave, reachable by phone"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {handover.isLoading && (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking what you&rsquo;re holding…
            </p>
          )}

          {/* Moves by itself — shown, not asked about. */}
          {jobAnalyses.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <CalendarClock className="h-3.5 w-3.5" />
                Passed on automatically
              </p>
              <ul className="mt-2 space-y-1.5">
                {jobAnalyses.map((r) => (
                  <li key={r.id} className="text-xs">
                    <span className="font-medium text-slate-700">{r.code}</span>{' '}
                    <span className="text-slate-500">{r.designation}</span>
                    <span className="mt-0.5 block text-slate-500">
                      →{' '}
                      {r.nextAssignee?.name ??
                        'Head of Talent Acquisition (nobody else in this unit)'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Needs a decision — one per requisition. */}
          {recruiting.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                Who covers your recruitment?
              </p>
              <ul className="mt-2 space-y-2">
                {recruiting.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-slate-200 px-3 py-2.5"
                  >
                    <p className="text-xs">
                      <span className="font-medium text-slate-700">
                        {r.code}
                      </span>{' '}
                      <span className="text-slate-500">{r.designation}</span>
                    </p>
                    <Select
                      className="mt-1.5 h-9 text-xs"
                      value={covers[r.id] ?? ''}
                      onChange={(e) =>
                        setCovers((prev) => ({
                          ...prev,
                          [r.id]: e.target.value,
                        }))
                      }
                      options={[
                        { value: '', label: 'Leave it waiting for me' },
                        ...r.candidates.map((c) => ({
                          value: c.id,
                          label: c.onLeave ? `${c.name} (on leave)` : c.name,
                          disabled: c.onLeave,
                        })),
                      ]}
                    />
                    {r.candidates.length === 0 && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        No other Corporate Recruiter for {r.unitFactory} — Head
                        of Talent Acquisition keeps access either way.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            className="w-full"
            isLoading={start.isPending}
            leftIcon={<Check className="h-4 w-4" />}
            onClick={confirm}
          >
            Confirm leave
          </Button>
        </div>
      )}
    </div>
  );
}
