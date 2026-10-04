import { useState } from 'react';
import { Bell, CalendarClock, CalendarDays, MapPin, Users, Video } from 'lucide-react';

import { Button, Input, Modal, Textarea } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { dhakaInputToIso, isoToDhakaInput } from '@shared/utils';
import { useMyPermissions } from '@modules/rbac';

import { useRescheduleInterview } from '../hooks/useAssessment';
import type { InterviewRoundView } from '../types/assessment.types';
import { VenueField } from './VenueField';
import { usesRoomList } from './venue';
import { slotLabel } from './slotLabel';


/**
 * "Rescheduled · previously …" on a round that has been moved — so nobody
 * reading the card wonders why the time differs from the invitation they
 * remember.
 */
export function RescheduledNote({ round }: { round: InterviewRoundView }) {
  const r = round.rescheduled;
  if (!r) return null;
  return (
    <div className="flex items-start gap-2 border-t border-amber-100 bg-amber-50/70 px-3 py-2 text-[0.6875rem] text-amber-800">
      <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">
        <p>
          <span className="font-semibold">
            Rescheduled{r.count > 1 ? ` ${r.count}×` : ''}
          </span>
          {r.from && (
            <>
              {' '}· previously{' '}
              <span className="line-through decoration-amber-400">{slotLabel(r.from)}</span>
            </>
          )}
          {r.byName ? ` · by ${r.byName}` : ''}
        </p>
        {r.reason && <p className="mt-0.5 text-amber-700">Reason: {r.reason}</p>}
      </div>
    </div>
  );
}

/**
 * The Reschedule button and its dialog.
 *
 * Offered while the round is still to happen and nobody has marked — the same
 * rule the server holds. The candidate gets an email with the new time, and
 * every panelist a notice with their unchanged marking link; both can be
 * switched off for a correction nobody needs to hear about. So can Google's
 * calendar update — and on an interview arranged without calendar invites,
 * ticking it sends them now.
 */
export function RescheduleButton({
  round,
  candidateId,
}: {
  round: InterviewRoundView;
  candidateId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 active:scale-[0.98]"
      >
        <CalendarClock className="h-4 w-4" />
        Reschedule
      </button>
      {open && (
        <RescheduleDialog
          round={round}
          candidateId={candidateId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function RescheduleDialog({
  round,
  candidateId,
  onClose,
}: {
  round: InterviewRoundView;
  candidateId: string;
  onClose: () => void;
}) {
  const reschedule = useRescheduleInterview(candidateId);
  const { data: perms } = useMyPermissions();
  const roomList = usesRoomList(perms);

  const [when, setWhen] = useState(isoToDhakaInput(round.scheduledAt));
  const [mode, setMode] = useState<'physical' | 'online'>(
    round.mode === 'online' ? 'online' : 'physical',
  );
  const [location, setLocation] = useState(round.location ?? '');
  const [reason, setReason] = useState('');
  const [tellCandidate, setTellCandidate] = useState(true);
  const [tellPanel, setTellPanel] = useState(true);
  // Rounds from before the choice existed were all invited.
  const invited = round.calendarNotify !== false;
  const [tellCalendar, setTellCalendar] = useState(invited);

  const newIso = dhakaInputToIso(when);
  const newAt = newIso ? new Date(newIso) : null;
  const unchanged =
    !!newAt && !!round.scheduledAt && newAt.getTime() === new Date(round.scheduledAt).getTime();
  const inPast = !!newAt && newAt.getTime() <= Date.now();
  const error = !when
    ? 'Choose the new date and time.'
    : inPast
      ? 'The new time has to be in the future.'
      : unchanged
        ? 'That is the time it is already booked for.'
        : null;

  const submit = () => {
    if (error || !newAt) return;
    reschedule.mutate(
      {
        roundId: round.id,
        data: {
          scheduledAt: newIso!,
          mode,
          location: location.trim(),
          reason: reason.trim() || undefined,
          notifyCandidate: tellCandidate,
          notifyPanel: tellPanel,
          notifyCalendar: tellCalendar,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      onClose={reschedule.isPending ? () => undefined : onClose}
      title="Reschedule interview"
      size="md"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">{error ?? 'Marking links stay the same.'}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={reschedule.isPending}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              isLoading={reschedule.isPending}
              disabled={Boolean(error)}
              leftIcon={<CalendarClock className="h-4 w-4" />}
            >
              Reschedule
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
          <p className="font-medium text-slate-800">
            {round.candidateName}{' '}
            <span className="font-normal text-slate-500">· {round.kind} interview</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Now booked for <span className="font-medium text-slate-700">{slotLabel(round.scheduledAt)}</span>
          </p>
        </div>

        <Input
          label="New date and time (GMT+6, Dhaka)"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: 'physical', label: 'In person', icon: MapPin },
                { key: 'online', label: 'Online', icon: Video },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition',
                  mode === m.key
                    ? 'border-brand-300 bg-brand-50 font-semibold text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                <m.icon className="h-4 w-4" />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'physical' ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Venue</p>
            <VenueField value={location} roomList={roomList} onChange={setLocation} />
          </div>
        ) : (
          <Input
            label={mode === 'online' ? 'Meeting link' : 'Venue'}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={
              mode === 'online'
                ? 'Leave blank for an automatic Google Meet link'
                : 'e.g. HR Conference Room, Level 4'
            }
          />
        )}

        <Textarea
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. The panel chair is travelling — printed in the emails"
          rows={2}
          maxLength={300}
        />

        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Bell className="h-3.5 w-3.5" /> Tell them the new time
          </p>
          <Check
            checked={tellCandidate}
            onChange={setTellCandidate}
            label="Email the candidate"
          />
          <Check
            checked={tellPanel}
            onChange={setTellPanel}
            label={`Notify the panel (${round.panelists.length})`}
            icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
          />
          <Check
            checked={tellCalendar}
            onChange={setTellCalendar}
            label={invited ? 'Update the calendar invite' : 'Send calendar invites'}
            icon={<CalendarDays className="h-3.5 w-3.5 text-slate-400" />}
          />
          {!invited && (
            <p className="pl-6 text-xs text-slate-400">
              This interview was arranged without calendar invites.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Check({
  checked,
  onChange,
  label,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      {icon}
      {label}
    </label>
  );
}
