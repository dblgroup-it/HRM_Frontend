import { useState } from 'react';
import { CalendarClock, Check, MapPin, Trash2, Users } from 'lucide-react';

import {
  Badge,
  Button,
  Checkbox,
  Input,
  Modal,
  Select,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import {
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

const KIND_OPTIONS = [
  { value: 'first', label: 'First interview' },
  { value: 'second', label: 'Second interview' },
  { value: 'final', label: 'Final interview' },
];
const MODE_OPTIONS = [
  { value: 'physical', label: 'Physical' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
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
  const [panel, setPanel] = useState<string[]>([]);
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const [notifyPanel, setNotifyPanel] = useState(true);

  const committee = setup?.committee ?? [];

  const togglePanelist = (userId: string) =>
    setPanel((prev) =>
      prev.includes(userId)
        ? prev.filter((u) => u !== userId)
        : [...prev, userId],
    );

  const submit = () => {
    schedule.mutate(
      {
        kind,
        mode,
        scheduledAt: scheduledAt || undefined,
        location: location.trim() || undefined,
        panelistUserIds: panel,
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
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-3 text-sm font-medium text-slate-800">
            Schedule an interview
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Interview"
              options={KIND_OPTIONS}
              value={kind}
              onChange={(e) => setKind(e.target.value as InterviewKindKey)}
            />
            <Select
              label="Mode"
              options={MODE_OPTIONS}
              value={mode}
              onChange={(e) => setMode(e.target.value as InterviewModeKey)}
            />
            <Input
              label="Date & time"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <Input
              label={mode === 'online' ? 'Meeting link' : 'Venue'}
              placeholder={mode === 'online' ? 'https://…' : 'e.g. HQ, Room 3'}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Users className="h-4 w-4 text-slate-400" /> Panel (committee
              members)
            </p>
            {committee.length === 0 ? (
              <p className="text-xs text-amber-600">
                No committee yet — add members in the requisition&rsquo;s
                Assessment &amp; Committee panel first.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {committee.map((m) => (
                  <Checkbox
                    key={m.userId}
                    label={`${m.name}${m.designation ? ` · ${m.designation}` : ''}`}
                    checked={panel.includes(m.userId)}
                    onChange={() => togglePanelist(m.userId)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Checkbox
              label="Email the candidate"
              checked={notifyCandidate}
              onChange={(e) => setNotifyCandidate(e.target.checked)}
            />
            <Checkbox
              label="Notify the panel"
              checked={notifyPanel}
              onChange={(e) => setNotifyPanel(e.target.checked)}
            />
          </div>

          <div className="mt-4 flex justify-end">
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
    </Modal>
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
        {round.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {round.location}
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
