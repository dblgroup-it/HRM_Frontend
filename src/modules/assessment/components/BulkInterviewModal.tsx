import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Building2,
  CalendarClock,
  Check,
  Mail,
  Search,
  Video,
  X,
} from 'lucide-react';

import {
  Avatar,
  Button,
  BusyOverlay,
  Input,
  Modal,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useDebounce } from '@shared/hooks';
import { useEmployees } from '@modules/employees';

import {
  useAddCommitteeMember,
  useAssessmentSetup,
  useBulkScheduleInterviews,
} from '../hooks/useAssessment';
import type {
  InterviewKindKey,
  InterviewModeKey,
} from '../types/assessment.types';

type Candidate = { id: string; name: string };
type Panelist = { userId: string; name: string };

const KIND_OPTIONS: { value: InterviewKindKey; label: string }[] = [
  { value: 'first', label: 'First interview' },
  { value: 'second', label: 'Second interview' },
  { value: 'final', label: 'Final interview' },
];

function fmt12(h: number, m: number) {
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function addMinutes(baseH: number, baseM: number, minutes: number) {
  const total = baseH * 60 + baseM + minutes;
  return { h: Math.floor(total / 60) % 24, m: total % 60 };
}

export function BulkInterviewModal({
  reqId,
  candidates: initialCandidates,
  open,
  onClose,
}: {
  reqId: string;
  candidates: Candidate[];
  open: boolean;
  onClose: () => void;
}) {
  const { data: setup } = useAssessmentSetup(reqId, open);
  const bulkSchedule = useBulkScheduleInterviews();

  // --- candidate list (user can remove individuals before submitting) ---
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  useEffect(() => {
    if (open) {
      setCandidates(initialCandidates);
      setKind('first');
      setMode('physical');
      setDate('');
      setStartTime('09:00');
      setIntervalMin(30);
      setSlotsMode('same');
      setPanel([]);
      setNotifyCandidate(true);
      setNotifyPanel(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // --- interview config ---
  const [kind, setKind] = useState<InterviewKindKey>('first');
  const [mode, setMode] = useState<InterviewModeKey>('physical');

  // --- time allocation ---
  const [date, setDate] = useState('');
  const [slotsMode, setSlotsMode] = useState<'same' | 'sequential'>('same');
  const [startTime, setStartTime] = useState('09:00');
  const [intervalMin, setIntervalMin] = useState(30);

  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const [notifyPanel, setNotifyPanel] = useState(true);

  // --- panel ---
  const [panel, setPanel] = useState<Panelist[]>([]);
  const committee = setup?.committee ?? [];
  const inPanel = (uid: string) => panel.some((p) => p.userId === uid);
  const addPanelist = (userId: string, name: string) =>
    setPanel((prev) =>
      prev.some((p) => p.userId === userId) ? prev : [...prev, { userId, name }],
    );
  const removePanelist = (uid: string) =>
    setPanel((prev) => prev.filter((p) => p.userId !== uid));

  // --- computed time slots ---
  const slots = useMemo<(string | null)[]>(() => {
    if (!date) return candidates.map(() => null);
    const [h, m] = startTime.split(':').map(Number);
    return candidates.map((_, i) => {
      const off = slotsMode === 'sequential' ? addMinutes(h, m, i * intervalMin) : { h, m };
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${date}T${pad(off.h)}:${pad(off.m)}:00`;
    });
  }, [date, startTime, slotsMode, intervalMin, candidates]);

  const submit = () => {
    if (candidates.length === 0 || panel.length === 0) return;
    bulkSchedule.mutate(
      {
        candidateIds: candidates.map((c) => c.id),
        kind,
        mode,
        scheduledAts: date ? (slots.filter(Boolean) as string[]) : undefined,
        panelistUserIds: panel.map((p) => p.userId),
        notifyCandidate,
        notifyPanel,
      },
      { onSuccess: onClose },
    );
  };

  const [h0, m0] = startTime.split(':').map(Number);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Interview Day — ${candidates.length} candidate${candidates.length === 1 ? '' : 's'}`}
      size="lg"
    >
      {/* Outer shell: flex column capped at viewport height so footer always shows */}
      <div className="flex max-h-[calc(100vh-12rem)] flex-col">

        {/* ── Scrollable body ── */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">

          {/* Candidates in batch */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Candidates in this batch
            </p>
            <div className="flex flex-wrap gap-1.5">
              {candidates.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-2 text-xs font-medium text-slate-700"
                >
                  <Avatar name={c.name} size="sm" />
                  {c.name}
                  <button
                    type="button"
                    onClick={() => setCandidates((prev) => prev.filter((x) => x.id !== c.id))}
                    className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                    title="Remove from batch"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {candidates.length === 0 && (
              <p className="mt-1 text-sm text-rose-500">No candidates left — add at least one.</p>
            )}
          </div>

          {/* Interview type & mode — flat row, no card header */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <CalendarClock className="h-4 w-4 shrink-0 text-brand-600" />
            <Segmented
              options={KIND_OPTIONS.map((k) => ({ value: k.value, label: k.label }))}
              value={kind}
              onChange={(v) => setKind(v as InterviewKindKey)}
            />
            <div className="hidden h-4 w-px bg-slate-200 sm:block" />
            <Segmented
              options={[
                { value: 'physical', label: 'In-person', icon: <Building2 className="h-3.5 w-3.5" /> },
                { value: 'online', label: 'Online', icon: <Video className="h-3.5 w-3.5" /> },
              ]}
              value={mode === 'online' ? 'online' : 'physical'}
              onChange={(v) => setMode(v as InterviewModeKey)}
            />
          </div>

          {/* Time allocation */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {/* Date + time + slot mode — single compact row */}
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">
                  {slotsMode === 'sequential' ? 'Start time' : 'Time'}
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 block text-[11px] font-medium text-slate-400">Slots</label>
                <div className="flex flex-wrap items-center gap-2">
                  <SlotModeBtn active={slotsMode === 'same'} onClick={() => setSlotsMode('same')} label="Same" />
                  <SlotModeBtn active={slotsMode === 'sequential'} onClick={() => setSlotsMode('sequential')} label="Sequential" />
                  {slotsMode === 'sequential' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">every</span>
                      <select
                        value={intervalMin}
                        onChange={(e) => setIntervalMin(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {[15, 20, 30, 45, 60].map((v) => (
                          <option key={v} value={v}>{v} min</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule preview — only when date is set */}
            {candidates.length > 0 && date && (
              <div className="border-t border-slate-100">
                <p className="bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Preview
                </p>
                <div className="max-h-36 divide-y divide-slate-50 overflow-y-auto">
                  {candidates.map((c, i) => {
                    const off =
                      slotsMode === 'sequential'
                        ? addMinutes(h0, m0, i * intervalMin)
                        : { h: h0, m: m0 };
                    return (
                      <div key={c.id} className="flex items-center justify-between px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-4 text-right text-[11px] text-slate-400">{i + 1}.</span>
                          <Avatar name={c.name} size="sm" />
                          <span className="text-xs font-medium text-slate-700">{c.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-brand-600">
                          {fmt12(off.h, off.m)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Panel */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
              <p className="text-sm font-semibold text-slate-800">
                Panel members <span className="font-normal text-slate-400">(shared across all)</span>
              </p>
            </div>
            <div className="space-y-3 p-3">
              {panel.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
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
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {committee.some((m) => !inPanel(m.userId)) && (
                <div className="flex flex-wrap items-center gap-1.5">
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
              <BulkPanelPicker
                reqId={reqId}
                existingUserIds={[
                  ...committee.map((m) => m.userId),
                  ...panel.map((p) => p.userId),
                ]}
                onAdded={addPanelist}
              />
            </div>
          </div>
        </div>

        {/* ── Pinned footer ── */}
        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap gap-2">
            <ToggleChip
              checked={notifyCandidate}
              onChange={setNotifyCandidate}
              icon={<Mail className="h-3.5 w-3.5" />}
              label="Email candidates"
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
              <span className="text-xs text-slate-400">Add at least one interviewer</span>
            )}
            <Button
              onClick={submit}
              isLoading={bulkSchedule.isPending}
              disabled={candidates.length === 0 || panel.length === 0}
              leftIcon={<CalendarClock className="h-4 w-4" />}
            >
              Schedule {candidates.length} interview{candidates.length === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      </div>

      <BusyOverlay
        show={bulkSchedule.isPending}
        label={`Scheduling ${candidates.length} interviews…`}
        sublabel="Creating calendar invites for each candidate and the shared panel."
      />
    </Modal>
  );
}

// ── Local sub-components ───────────────────────────────────────────────────────

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
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

function SlotModeBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'border-brand-300 bg-brand-50 text-brand-700'
          : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700',
      )}
    >
      <span
        className={cn(
          'h-3.5 w-3.5 rounded-full border-2 transition',
          active ? 'border-brand-600 bg-brand-600' : 'border-slate-300',
        )}
      />
      {label}
    </button>
  );
}

function ToggleChip({
  checked,
  onChange,
  icon,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
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

function BulkPanelPicker({
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
  const [dropRect, setDropRect] = useState<DOMRect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(q, 300);
  const { data } = useEmployees({ search: debounced, page: 1, pageSize: 6 });
  const add = useAddCommitteeMember(reqId);

  const results = (data?.items ?? []).filter(
    (e) => e.userId && !existingUserIds.includes(e.userId),
  );

  const openDropdown = () => {
    if (wrapRef.current) setDropRect(wrapRef.current.getBoundingClientRect());
    setOpen(true);
  };

  return (
    <div ref={wrapRef}>
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); openDropdown(); }}
        onFocus={openDropdown}
        placeholder="Search to add an interviewer…"
        leftIcon={<Search className="h-4 w-4" />}
      />
      {open && debounced.length > 0 && results.length > 0 && dropRect &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[200]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[201] max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
              style={{
                top: dropRect.bottom + 4,
                left: dropRect.left,
                width: dropRect.width,
              }}
            >
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
                    <span className="block truncate font-medium text-slate-800">{e.name}</span>
                    <span className="block truncate text-xs text-slate-400">
                      {[e.jobTitle, e.department].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
