import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CalendarClock,
  ChevronDown,
  GripVertical,
  Info,
  Search,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Avatar,
  Badge,
  Card,
  CardBody,
  FullPageSpinner,
  Input,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import { useHrLayering, useSetLayeringOrder } from '../hooks/useRbac';
import type { LayeringMember } from '../types/rbac.types';
import { priorityLabel } from '../layering';

/**
 * HR layering — who picks up the work, and who picks it up when they are away.
 *
 * Its own page rather than a column in Access Control, because it answers a
 * different question. Access Control is "who may do what"; this is "whose turn
 * is it", and getting that order wrong quietly sends every requisition in a
 * unit to the wrong desk.
 */
export function HrLayeringPanel() {
  const { data, isLoading } = useHrLayering();
  const setOrder = useSetLayeringOrder();
  const [filter, setFilter] = useState('');
  const [showUncovered, setShowUncovered] = useState(false);

  /**
   * Units with somebody in the layering come first and get a card each; the
   * rest are folded into one line at the bottom. Most of DBL's 30-odd units have no
   * Factory HR at all, and a card each for them buries the two or three that
   * this page exists to manage.
   */
  const { staffed, unstaffed } = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const rows = (data?.units ?? []).filter(
      (u) =>
        !term ||
        u.unitName.toLowerCase().includes(term) ||
        u.queue.some((m) => m.name.toLowerCase().includes(term)),
    );
    return {
      staffed: rows.filter((u) => u.queue.length > 0),
      unstaffed: rows.filter((u) => u.queue.length === 0),
    };
  }, [data, filter]);

  if (isLoading) return <FullPageSpinner label="Loading HR layering…" />;

  return (
    <div className="space-y-5">
      {/* What this page decides, in one line. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Info className="h-4 w-4" />
          </span>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">
              A requisition&rsquo;s job analysis goes to the first Factory HR on
              duty in this order.
            </span>{' '}
            Drag to reorder. When everyone in a unit is away it falls to Head of
            Talent Acquisition and the Corporate Recruiters.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by unit or person…"
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Units with a priority order"
          value={staffed.length}
          tone="emerald"
        />
        <SummaryTile
          label="Units covered by Head of Talent Acquisition"
          value={unstaffed.length}
          tone={unstaffed.length > 0 ? 'amber' : 'slate'}
        />
        <SummaryTile
          label="Corporate Recruiters"
          value={data?.recruiters.length ?? 0}
          tone="brand"
        />
      </div>

      {staffed.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
          {filter
            ? 'No unit matches that.'
            : 'No unit has a Factory HR yet — grant the role on People & access, then set the priority order here.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {staffed.map((unit) => (
          <UnitQueue
            key={unit.unitId}
            unitName={unit.unitName}
            queue={unit.queue}
            busy={setOrder.isPending}
            onReorder={(assignmentIds) => {
              const roleId = 'role_factory_hr';
              setOrder.mutate(
                { roleId, unitId: unit.unitId, assignmentIds },
                {
                  onSuccess: () =>
                    toast.success(`Priority order saved for ${unit.unitName}`),
                  onError: (e) => toast.error((e as Error).message),
                },
              );
            }}
          />
        ))}
      </div>

      {unstaffed.length > 0 && (
        <Card>
          <CardBody>
            <button
              type="button"
              onClick={() => setShowUncovered((v) => !v)}
              className="flex w-full items-center gap-2 text-left"
            >
              <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="text-sm font-semibold text-slate-800">
                {unstaffed.length} unit{unstaffed.length === 1 ? '' : 's'} with
                no Factory HR
              </span>
              <ChevronDown
                className={cn(
                  'ml-auto h-4 w-4 text-slate-400 transition',
                  showUncovered && 'rotate-180',
                )}
              />
            </button>
            <p className="mt-1 text-xs text-slate-500">
              Requisitions raised here go straight to Head of Talent Acquisition
              and the Corporate Recruiters. Grant someone Factory HR on People
              &amp; access to give a unit its own queue.
            </p>
            {showUncovered && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {unstaffed.map((u) => (
                  <span
                    key={u.unitId}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500"
                  >
                    {u.unitName}
                  </span>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* The recruiter side: no order to set — a recruiter going on leave
          nominates their own stand-in, per requisition. */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-600" />
            <p className="text-sm font-semibold text-slate-800">
              Corporate Recruiters
            </p>
            <Badge tone="neutral">{data?.recruiters.length ?? 0}</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            No priority order here — a recruiter going on leave picks who
            continues each of their requisitions, one by one.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(data?.recruiters ?? []).map((r) => (
              <span
                key={r.userId}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs',
                  r.onLeave
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-white text-slate-600',
                )}
              >
                <Avatar name={r.name} size="sm" />
                {r.name}
                <PresenceDot onLeave={r.onLeave} endsAt={r.leaveEndsAt} />
              </span>
            ))}
            {(data?.recruiters ?? []).length === 0 && (
              <p className="text-xs text-slate-400">
                Nobody holds the Corporate Recruiter role yet.
              </p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/** One unit's layering, drag-to-reorder with keyboard-reachable arrows. */
function UnitQueue({
  unitName,
  queue,
  onReorder,
  busy,
}: {
  unitName: string;
  queue: LayeringMember[];
  onReorder: (assignmentIds: string[]) => void;
  busy: boolean;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const ids = queue
    .map((m) => m.assignmentId)
    .filter((id): id is string => Boolean(id));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  const onDuty = queue.find((m) => !m.onLeave);

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-sm font-semibold text-slate-800">{unitName}</p>
          </div>
          <Badge tone={queue.length ? 'neutral' : 'warning'}>
            {queue.length
              ? `${queue.length} in line`
              : 'No Factory HR'}
          </Badge>
        </div>

        {queue.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
            Requisitions here go straight to Head of Talent Acquisition and the
            Corporate Recruiters. Grant someone Factory HR to change that.
          </p>
        ) : (
          <>
            <ol className="space-y-1.5">
              {queue.map((m, i) => {
                const label = priorityLabel(m.priority);
                const isNext = onDuty?.userId === m.userId;
                return (
                  <li
                    key={m.userId}
                    draggable={Boolean(m.assignmentId) && !busy}
                    onDragStart={() => setDragging(m.assignmentId)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOver(m.assignmentId);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setOver(null);
                      if (!dragging || !m.assignmentId) return;
                      move(ids.indexOf(dragging), ids.indexOf(m.assignmentId));
                      setDragging(null);
                    }}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition',
                      over === m.assignmentId && dragging !== m.assignmentId
                        ? 'border-brand-400 bg-brand-50/60'
                        : isNext
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-200 bg-white',
                      dragging === m.assignmentId && 'opacity-50',
                    )}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300 group-hover:text-slate-400" />
                    <span
                      className={cn(
                        'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                        m.priority
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-400',
                      )}
                    >
                      {m.priority ?? '–'}
                    </span>
                    <Avatar name={m.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {m.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {/* With one person there is no order to set — they
                            get everything, so say that rather than "not in
                            the order". */}
                        {label ??
                          (queue.length === 1
                            ? 'Only Factory HR here'
                            : 'Not in the order')}{' '}
                        · {m.employeeCode}
                      </p>
                    </div>
                    <PresenceDot onLeave={m.onLeave} endsAt={m.leaveEndsAt} />
                    <span className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        title="Move up"
                        disabled={busy || i === 0}
                        onClick={() => move(i, i - 1)}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        disabled={busy || i === queue.length - 1}
                        onClick={() => move(i, i + 1)}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <UserRoundCheck className="h-3.5 w-3.5 text-emerald-600" />
              {onDuty ? (
                <>
                  Next requisition goes to{' '}
                  <span className="font-medium text-slate-700">
                    {onDuty.name}
                  </span>
                </>
              ) : (
                'Everyone here is away — Head of Talent Acquisition covers'
              )}
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}

/** On duty, or away with the date they are due back. */
function PresenceDot({
  onLeave,
  endsAt,
}: {
  onLeave: boolean;
  endsAt: string | null;
}) {
  if (!onLeave) {
    return (
      <span
        title="On duty"
        className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
      />
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
      <CalendarClock className="h-3 w-3" />
      {endsAt ? `back ${formatDate(endsAt)}` : 'away'}
    </span>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'brand' | 'slate';
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    brand: 'bg-brand-50 text-brand-700',
    slate: 'bg-slate-100 text-slate-500',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-semibold',
          tones[tone],
        )}
      >
        {value}
      </span>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}
