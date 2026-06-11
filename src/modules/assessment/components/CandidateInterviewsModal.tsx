import { useState } from 'react';
import {
  Bell,
  Building2,
  CalendarCheck,
  CalendarClock,
  Check,
  Mail,
  MapPin,
  Search,
  Trash2,
  Video,
  X,
} from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  BusyOverlay,
  Input,
  Modal,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { useDebounce } from '@shared/hooks';
import { useEmployees } from '@modules/employees';

import {
  useAddCommitteeMember,
  useAssessmentSetup,
  useCandidateInterviews,
  useRemoveInterview,
  useScheduleInterview,
} from '../hooks/useAssessment';
import type {
  InterviewKindKey,
  InterviewModeKey,
  InterviewRoundView,
} from '../types/assessment.types';

const KIND_OPTIONS: { value: InterviewKindKey; label: string }[] = [
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
  { value: 'final', label: 'Final' },
];

export function CandidateInterviewsModal({
  reqId,
  candidate,
  open,
  onClose,
}: {
  reqId: string;
  candidate: { id: string; name: string };
  open: boolean;
  onClose: () => void;
}) {
  const { data: setup } = useAssessmentSetup(reqId, open);
  const { data: rounds = [], isLoading } = useCandidateInterviews(
    candidate.id,
    open,
  );
  const schedule = useScheduleInterview(candidate.id);
  const remove = useRemoveInterview(candidate.id);

  const [kind, setKind] = useState<InterviewKindKey>('first');
  const [mode, setMode] = useState<InterviewModeKey>('physical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('');
  // Online rounds get a Meet link automatically; the link field only appears
  // when HR explicitly wants to use their own (e.g. Teams/Zoom).
  const [customLink, setCustomLink] = useState(false);
  // Panel is per-session: each interview can have a different (or the same) set.
  const [panel, setPanel] = useState<{ userId: string; name: string }[]>([]);
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const [notifyPanel, setNotifyPanel] = useState(true);

  const committee = setup?.committee ?? [];
  const inPanel = (userId: string) => panel.some((p) => p.userId === userId);
  const addPanelist = (userId: string, name: string) =>
    setPanel((prev) =>
      prev.some((p) => p.userId === userId) ? prev : [...prev, { userId, name }],
    );
  const removePanelist = (userId: string) =>
    setPanel((prev) => prev.filter((p) => p.userId !== userId));

  const submit = () => {
    schedule.mutate(
      {
        kind,
        mode,
        scheduledAt: scheduledAt || undefined,
        location: location.trim() || undefined,
        panelistUserIds: panel.map((p) => p.userId),
        notifyCandidate,
        notifyPanel,
      },
      {
        onSuccess: () => {
          setScheduledAt('');
          setLocation('');
          setPanel([]);
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Interviews · ${candidate.name}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Existing rounds */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Scheduled interviews
          </p>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : rounds.length === 0 ? (
            <p className="text-sm text-slate-400">No interviews scheduled yet.</p>
          ) : (
            <div className="space-y-2">
              {rounds.map((r) => (
                <RoundRow
                  key={r.id}
                  round={r}
                  rubric={setup?.rubric ?? []}
                  onRemove={() => remove.mutate(r.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Schedule form */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CalendarClock className="h-4 w-4 text-brand-600" />
              Schedule a new interview
            </p>
          </div>

          <div className="space-y-5 p-4">
            {/* 1 · Type & mode */}
            <FormStep n={1} title="Which interview?">
              <div className="flex flex-wrap items-center gap-3">
                <Segmented
                  options={KIND_OPTIONS.map((k) => ({
                    value: k.value,
                    label: `${k.label} interview`,
                  }))}
                  value={kind}
                  onChange={(v) => setKind(v as InterviewKindKey)}
                />
                <Segmented
                  options={[
                    {
                      value: 'physical',
                      label: 'In-person',
                      icon: <Building2 className="h-3.5 w-3.5" />,
                    },
                    {
                      value: 'online',
                      label: 'Online',
                      icon: <Video className="h-3.5 w-3.5" />,
                    },
                  ]}
                  value={mode === 'online' ? 'online' : 'physical'}
                  onChange={(v) => {
                    setMode(v as InterviewModeKey);
                    setCustomLink(false);
                    setLocation('');
                  }}
                />
              </div>
            </FormStep>

            {/* 2 · When & where */}
            <FormStep n={2} title="When & where?">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                {mode === 'online' && !customLink ? (
                  <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <Video className="h-3.5 w-3.5" /> Google Meet — created
                      automatically
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomLink(true)}
                      className="whitespace-nowrap text-[11px] text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline"
                    >
                      use custom link
                    </button>
                  </div>
                ) : (
                  <div>
                    <Input
                      placeholder={
                        mode === 'online'
                          ? 'https://… (Teams, Zoom…)'
                          : 'Venue — e.g. HQ, Room 3'
                      }
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                    {mode === 'online' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomLink(false);
                          setLocation('');
                        }}
                        className="mt-1 text-[11px] text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline"
                      >
                        ← use auto Google Meet instead
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                Everyone on the panel gets a Google Calendar invite with
                reminders.
              </p>
            </FormStep>

            {/* 3 · Panel */}
            <FormStep n={3} title="Who interviews?">
              {panel.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {panel.map((p) => (
                    <span
                      key={p.userId}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 py-1 pl-1 pr-2 text-xs font-medium text-white"
                    >
                      <Avatar name={p.name} size="sm" />
                      {p.name}
                      <button
                        type="button"
                        onClick={() => removePanelist(p.userId)}
                        className="rounded-full p-0.5 hover:bg-white/20"
                        title="Remove from this panel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {committee.some((m) => !inPanel(m.userId)) && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Committee:
                  </span>
                  {committee
                    .filter((m) => !inPanel(m.userId))
                    .map((m) => (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => addPanelist(m.userId, m.name)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                      >
                        + {m.name}
                      </button>
                    ))}
                </div>
              )}

              <PanelMemberPicker
                reqId={reqId}
                existingUserIds={[
                  ...committee.map((m) => m.userId),
                  ...panel.map((p) => p.userId),
                ]}
                onAdded={(userId, name) => addPanelist(userId, name)}
              />
            </FormStep>
          </div>

          {/* Footer: notify + CTA */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              <ToggleChip
                checked={notifyCandidate}
                onChange={setNotifyCandidate}
                icon={<Mail className="h-3.5 w-3.5" />}
                label="Email candidate"
              />
              <ToggleChip
                checked={notifyPanel}
                onChange={setNotifyPanel}
                icon={<Bell className="h-3.5 w-3.5" />}
                label="Notify panel"
              />
            </div>
            <div className="flex items-center gap-3">
              {panel.length === 0 && (
                <span className="text-xs text-slate-400">
                  Add at least one interviewer
                </span>
              )}
              <Button
                onClick={submit}
                isLoading={schedule.isPending}
                disabled={panel.length === 0}
                leftIcon={<CalendarClock className="h-4 w-4" />}
              >
                Schedule interview
              </Button>
            </div>
          </div>
        </div>
      </div>

      <BusyOverlay
        show={schedule.isPending}
        label="Scheduling interview…"
        sublabel={
          mode === 'online'
            ? 'Creating the calendar invite and Google Meet link.'
            : 'Creating the calendar invite for the panel.'
        }
      />
    </Modal>
  );
}

/** Numbered step row used by the schedule form. */
function FormStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-sm font-medium text-slate-700">{title}</p>
        {children}
      </div>
    </div>
  );
}

/** Pill-style single-choice control (friendlier than a dropdown for 2-3 options). */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
            value === o.value
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Checkbox restyled as a tappable chip. */
function ToggleChip({
  checked,
  onChange,
  icon,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
        checked
          ? 'border-brand-200 bg-brand-50 text-brand-700'
          : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600',
      )}
    >
      {checked ? <Check className="h-3.5 w-3.5" /> : icon}
      {label}
    </button>
  );
}

/** Inline employee search to add interviewers to the committee from the modal. */
function PanelMemberPicker({
  reqId,
  existingUserIds,
  onAdded,
}: {
  reqId: string;
  existingUserIds: string[];
  onAdded: (userId: string, name: string) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(q, 300);
  const { data } = useEmployees({ search: debounced, page: 1, pageSize: 6 });
  const add = useAddCommitteeMember(reqId);

  const results = (data?.items ?? []).filter(
    (e) => e.userId && !existingUserIds.includes(e.userId),
  );

  return (
    <div className="relative">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Add an interviewer to the panel…"
        leftIcon={<Search className="h-4 w-4" />}
      />
      {open && debounced.length > 0 && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {results.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  if (e.userId) {
                    add.mutate({ memberUserId: e.userId });
                    onAdded(e.userId, e.name);
                  }
                  setQ('');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <Avatar name={e.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">
                    {e.name}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {[e.jobTitle, e.department].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const STATUS_TONE = {
  scheduled: 'warning',
  completed: 'success',
  cancelled: 'neutral',
} as const;

function RoundRow({
  round,
  rubric,
  onRemove,
}: {
  round: InterviewRoundView;
  rubric: { id: string; label: string; maxScore: number }[];
  onRemove: () => void;
}) {
  const maxTotal = rubric.reduce((s, c) => s + c.maxScore, 0);
  const avg =
    round.evaluations.length > 0
      ? Math.round(
          round.evaluations.reduce((s, e) => s + e.total, 0) /
            round.evaluations.length,
        )
      : 0;
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize text-slate-800">
            {round.kind} interview
          </span>
          <Badge tone="neutral">{round.mode}</Badge>
          <Badge tone={STATUS_TONE[round.status]}>{round.status}</Badge>
        </div>
        <button
          type="button"
          title="Remove interview"
          onClick={onRemove}
          className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          {round.scheduledAt ? formatDate(round.scheduledAt) : 'Time TBD'}
        </span>
        {round.meetLink ? (
          <a
            href={round.meetLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:underline"
          >
            <Video className="h-3.5 w-3.5" /> Join Google Meet
          </a>
        ) : (
          round.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {round.location}
            </span>
          )
        )}
        {round.calendarSynced && (
          <span
            className="inline-flex items-center gap-1 text-brand-600"
            title="A Google Calendar invitation was sent to the panel"
          >
            <CalendarCheck className="h-3.5 w-3.5" /> Invites sent
          </span>
        )}
      </div>
      {round.panelists.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {round.panelists.map((p) => (
            <span
              key={p.id}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
                p.hasMarked
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-500',
              )}
            >
              {p.hasMarked && <Check className="h-3 w-3" />}
              {p.name}
            </span>
          ))}
        </div>
      )}

      {round.evaluations.length > 0 && (
        <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs">
          <p className="mb-1.5 font-semibold uppercase tracking-wide text-slate-400">
            Evaluation sheet
          </p>
          <div className="space-y-1.5">
            {round.evaluations.map((ev) => (
              <div
                key={ev.evaluatorId}
                className="border-t border-slate-200 pt-1.5 first:border-0 first:pt-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600">
                    {ev.evaluatorName}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {ev.total}
                    {maxTotal > 0 && (
                      <span className="text-slate-400"> / {maxTotal}</span>
                    )}
                  </span>
                </div>
                {ev.comments && (
                  <p className="mt-0.5 text-slate-400">{ev.comments}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1.5">
            <span className="text-slate-500">
              Average ({round.evaluations.length} of {round.panelists.length}{' '}
              marked)
            </span>
            <span className="font-semibold text-brand-700">
              {avg}
              {maxTotal > 0 && (
                <span className="text-slate-400"> / {maxTotal}</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
