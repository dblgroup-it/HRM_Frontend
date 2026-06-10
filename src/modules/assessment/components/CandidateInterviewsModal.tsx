import { useState } from 'react';
import {
  CalendarClock,
  Check,
  MapPin,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import {
  Avatar,
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
              <Users className="h-4 w-4 text-slate-400" /> Panel for this interview
            </p>

            {/* Selected interviewers for THIS session */}
            {panel.length === 0 ? (
              <p className="text-xs text-slate-400">
                No interviewers added yet — add from the committee or search below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {panel.map((p) => (
                  <span
                    key={p.userId}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-brand-700"
                  >
                    {p.name}
                    <button
                      type="button"
                      onClick={() => removePanelist(p.userId)}
                      className="rounded-full p-0.5 hover:bg-brand-100"
                      title="Remove from this panel"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick-add from the requisition's committee pool */}
            {committee.some((m) => !inPanel(m.userId)) && (
              <div className="mt-2">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Quick add from committee
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {committee
                    .filter((m) => !inPanel(m.userId))
                    .map((m) => (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => addPanelist(m.userId, m.name)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                      >
                        + {m.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Search anyone — adds to this session (and the committee pool for reuse) */}
            <div className="mt-2">
              <PanelMemberPicker
                reqId={reqId}
                existingUserIds={[
                  ...committee.map((m) => m.userId),
                  ...panel.map((p) => p.userId),
                ]}
                onAdded={(userId, name) => addPanelist(userId, name)}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Each session can have different interviewers — or reuse the same
              people.
            </p>
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
