import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  Lightbulb,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  SendHorizonal,
  Sparkles,
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
  useGenerateEvaluationSummary,
  useRemoveInterview,
  useScheduleInterview,
  useSendInterviewQuestions,
  useUpdateInterview,
} from '../hooks/useAssessment';
import type {
  InterviewKindKey,
  InterviewModeKey,
  InterviewQuestion,
  InterviewRoundView,
} from '../types/assessment.types';

const KIND_OPTIONS: { value: InterviewKindKey; label: string }[] = [
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
  { value: 'final', label: 'Final' },
];

const KIND_ORDER: InterviewKindKey[] = ['first', 'second', 'final'];
const KIND_IDX: Record<InterviewKindKey, number> = { first: 0, second: 1, final: 2 };
const KIND_LABEL: Record<InterviewKindKey, string> = { first: 'First', second: 'Second', final: 'Final' };

function suggestNextKind(rounds: InterviewRoundView[]): InterviewKindKey {
  let highestIdx = -1;
  for (const r of rounds) {
    if (r.status === 'completed') {
      const idx = KIND_IDX[r.kind];
      if (idx > highestIdx) highestIdx = idx;
    }
  }
  if (highestIdx === -1) return 'first';
  return KIND_ORDER[Math.min(highestIdx + 1, KIND_ORDER.length - 1)];
}

/** Duration must match the CSS transition below (ms). */
const ANIM_MS = 260;

export function CandidateInterviewsModal({
  reqId,
  candidate,
  open,
  onClose,
  onGoToSetup: goToSetupProp,
}: {
  reqId: string;
  candidate: { id: string; name: string };
  open: boolean;
  onClose: () => void;
  onGoToSetup?: () => void;
}) {
  const navigate = useNavigate();

  /* ── Animation state machine ─────────────────────────────── */
  // `mounted` keeps the portal in the DOM during exit animation.
  // `show` drives the CSS transform (false = off-screen, true = on-screen).
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Two rAF frames to let the element paint in its "hidden" position
      // before starting the enter transition.
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true));
      });
      return () => cancelAnimationFrame(raf1);
    } else {
      setShow(false);
      const t = setTimeout(() => setMounted(false), ANIM_MS + 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* ── Helpers ─────────────────────────────────────────────── */
  const goToSetup = goToSetupProp
    ? () => { onClose(); goToSetupProp(); }
    : () => { onClose(); navigate(`/requisitions/${reqId}?tab=assessment`); };

  /* ── Data ────────────────────────────────────────────────── */
  const { data: setup } = useAssessmentSetup(reqId, open);
  const { data: rounds = [], isLoading } = useCandidateInterviews(candidate.id, open);
  const schedule = useScheduleInterview(candidate.id);
  const remove = useRemoveInterview(candidate.id);
  const evalSummary = useGenerateEvaluationSummary();
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const hasEvaluations = rounds.some((r) => r.evaluations.length > 0);

  /* ── Form state ──────────────────────────────────────────── */
  const [kind, setKind] = useState<InterviewKindKey>('first');
  const [mode, setMode] = useState<InterviewModeKey>('physical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('');
  const [customLink, setCustomLink] = useState(false);
  const [panel, setPanel] = useState<{ userId: string; name: string }[]>([]);
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const [notifyPanel, setNotifyPanel] = useState(true);

  const kindAutoSetRef = useRef(false);
  useEffect(() => {
    if (!open) { kindAutoSetRef.current = false; setKind('first'); setSummaryText(null); }
  }, [open]);

  // Auto-generate summary when modal opens if the setting is on
  useEffect(() => {
    if (open && setup?.autoEvalSummary && hasEvaluations && !summaryText && !evalSummary.isPending) {
      evalSummary.mutate(candidate.id, {
        onSuccess: (data) => setSummaryText(data.summary),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setup?.autoEvalSummary, hasEvaluations]);
  useEffect(() => {
    if (open && !kindAutoSetRef.current && rounds.length > 0) {
      setKind(suggestNextKind(rounds));
      kindAutoSetRef.current = true;
    }
  }, [open, rounds]);

  /* ── Keyboard / body-scroll lock ────────────────────────── */
  const handleEscKey = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleEscKey(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, handleEscKey]);

  /* ── Derived ─────────────────────────────────────────────── */
  const lastCompletedKind = rounds.reduce<InterviewKindKey | null>((best, r) => {
    if (r.status !== 'completed') return best;
    if (!best || KIND_IDX[r.kind] > KIND_IDX[best]) return r.kind;
    return best;
  }, null);

  const committee = setup?.committee ?? [];
  const inPanel = (userId: string) => panel.some((p) => p.userId === userId);
  const addPanelist = (userId: string, name: string) =>
    setPanel((prev) => prev.some((p) => p.userId === userId) ? prev : [...prev, { userId, name }]);
  const removePanelist = (userId: string) =>
    setPanel((prev) => prev.filter((p) => p.userId !== userId));

  const submit = () => {
    schedule.mutate(
      {
        kind, mode,
        scheduledAt: scheduledAt || undefined,
        location: location.trim() || undefined,
        panelistUserIds: panel.map((p) => p.userId),
        notifyCandidate, notifyPanel,
      },
      { onSuccess: () => { setScheduledAt(''); setLocation(''); setPanel([]); } },
    );
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* ── Backdrop ─────────────────────────────────────── */}
      <div
        aria-hidden
        onClick={onClose}
        style={{ transition: `opacity ${ANIM_MS}ms ease` }}
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/40',
          show ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* ── Drawer ───────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          willChange: 'transform',
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.25,0.46,0.45,0.94)`,
        }}
        className={cn(
          // position + sizing
          'fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl ring-1 ring-black/[0.06]',
          // responsive width: full on mobile → wider on larger screens
          'w-full sm:max-w-2xl md:max-w-3xl lg:max-w-[72rem]',
          // animation — transform only (GPU-composited, no repaint)
          show ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={candidate.name} size="sm" />
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold text-slate-900">
                {candidate.name}
              </h2>
              <p className="text-[11px] text-slate-400">Interview management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body (responsive: stacked mobile, columns md+) ── */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:divide-x md:divide-slate-100">

          {/* LEFT — History ─────────────────────────────── */}
          <div className={cn(
            'flex shrink-0 flex-col bg-slate-50/60',
            // mobile: capped height so form is still reachable
            'max-h-52 overflow-y-auto',
            // md+: take up 30% width, full height, independent scroll
            'md:max-h-none md:w-[30%] md:min-h-0 md:flex-1',
          )}>
            <div className="shrink-0 px-4 pb-1 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Scheduled Interviews
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-2">
              {isLoading ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : rounds.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
                  <CalendarClock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                  <p className="text-sm font-medium text-slate-400">No interviews yet</p>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Schedule the first one on the right →
                  </p>
                </div>
              ) : (
                rounds.map((r) => (
                  <RoundRow
                    key={r.id}
                    round={r}
                    candidateId={candidate.id}
                    rubric={setup?.rubric ?? []}
                    questions={setup?.interviewQuestions ?? []}
                    onRemove={() => remove.mutate(r.id)}
                  />
                ))
              )}

              {/* Inline alerts */}
              {setup && setup.rubric.length === 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">No scoring rubric.</span>{' '}
                    Panelists can't score.{' '}
                    <button type="button" onClick={goToSetup}
                      className="font-semibold underline underline-offset-2 hover:text-amber-900">
                      Set up →
                    </button>
                  </p>
                </div>
              )}
              {setup && setup.interviewQuestions.length === 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <p className="text-xs text-emerald-800">
                    <span className="font-semibold">Tip:</span> Generate AI interview questions.{' '}
                    <button type="button" onClick={goToSetup}
                      className="font-semibold underline underline-offset-2 hover:text-emerald-900">
                      Generate →
                    </button>
                  </p>
                </div>
              )}

              {/* AI Evaluation Summary */}
              {hasEvaluations && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/60">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Evaluation Summary
                    </span>
                    <button
                      type="button"
                      disabled={evalSummary.isPending}
                      onClick={() =>
                        evalSummary.mutate(candidate.id, {
                          onSuccess: (data) => setSummaryText(data.summary),
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                    >
                      <RefreshCw className={cn('h-3 w-3', evalSummary.isPending && 'animate-spin')} />
                      {summaryText ? 'Regenerate' : 'Generate'}
                    </button>
                  </div>
                  {evalSummary.isPending && (
                    <div className="border-t border-violet-100 px-3 py-3">
                      <div className="flex items-center gap-2 text-xs text-violet-500">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                        AI is reading panel evaluations…
                      </div>
                    </div>
                  )}
                  {summaryText && !evalSummary.isPending && (
                    <p className="border-t border-violet-100 px-3 py-3 text-xs leading-relaxed text-slate-700">
                      {summaryText}
                    </p>
                  )}
                  {!summaryText && !evalSummary.isPending && (
                    <p className="border-t border-violet-100 px-3 pb-3 pt-2 text-[11px] text-violet-400">
                      Click Generate to get an AI synthesis of all panel marks and comments.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Schedule form ───────────────────────── */}
          <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 md:border-t-0">
            {/* Sub-header */}
            <div className="shrink-0 border-b border-slate-100 bg-white/80 px-5 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CalendarClock className="h-4 w-4 text-brand-600" />
                Schedule a new interview
              </p>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5">

              {/* ① Type & mode */}
              <FormStep n={1} title="Which interview?">
                {lastCompletedKind && (
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] text-brand-600">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                    {lastCompletedKind === 'final'
                      ? 'Final interview completed — re-schedule any round freely'
                      : `${KIND_LABEL[lastCompletedKind]} completed — ${KIND_LABEL[KIND_ORDER[KIND_IDX[lastCompletedKind] + 1]]} pre-selected`}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Segmented
                    options={KIND_OPTIONS.map((k) => ({ value: k.value, label: `${k.label} interview` }))}
                    value={kind}
                    onChange={(v) => setKind(v as InterviewKindKey)}
                  />
                  <Segmented
                    options={[
                      { value: 'physical', label: 'In-person', icon: <Building2 className="h-3.5 w-3.5" /> },
                      { value: 'online',   label: 'Online',    icon: <Video className="h-3.5 w-3.5" /> },
                    ]}
                    value={mode === 'online' ? 'online' : 'physical'}
                    onChange={(v) => { setMode(v as InterviewModeKey); setCustomLink(false); setLocation(''); }}
                  />
                </div>
              </FormStep>

              {/* ② When & where */}
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
                        <Video className="h-3.5 w-3.5" /> Google Meet — auto
                      </span>
                      <button type="button" onClick={() => setCustomLink(true)}
                        className="whitespace-nowrap text-[11px] text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline">
                        custom link
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Input
                        placeholder={mode === 'online' ? 'https://… (Teams, Zoom…)' : 'Venue — e.g. HQ, Room 3'}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                      {mode === 'online' && (
                        <button type="button" onClick={() => { setCustomLink(false); setLocation(''); }}
                          className="mt-1 text-[11px] text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline">
                          ← auto Google Meet
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                  Everyone on the panel gets a Google Calendar invite with reminders.
                </p>
              </FormStep>

              {/* ③ Panel */}
              <FormStep n={3} title="Who interviews?">
                {panel.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {panel.map((p) => (
                      <span key={p.userId}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 py-1 pl-1 pr-2 text-xs font-medium text-white">
                        <Avatar name={p.name} size="sm" />
                        {p.name}
                        <button type="button" onClick={() => removePanelist(p.userId)}
                          className="rounded-full p-0.5 hover:bg-white/20">
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
                    {committee.filter((m) => !inPanel(m.userId)).map((m) => (
                      <button key={m.userId} type="button" onClick={() => addPanelist(m.userId, m.name)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700">
                        + {m.name}
                      </button>
                    ))}
                  </div>
                )}
                <PanelMemberPicker
                  reqId={reqId}
                  existingUserIds={[...committee.map((m) => m.userId), ...panel.map((p) => p.userId)]}
                  onAdded={(userId, name) => addPanelist(userId, name)}
                />
              </FormStep>
            </div>

            {/* Pinned footer */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
              <div className="flex flex-wrap gap-2">
                <ToggleChip checked={notifyCandidate} onChange={setNotifyCandidate}
                  icon={<Mail className="h-3.5 w-3.5" />} label="Email candidate" />
                <ToggleChip checked={notifyPanel} onChange={setNotifyPanel}
                  icon={<Bell className="h-3.5 w-3.5" />} label="Notify panel" />
              </div>
              <div className="flex items-center gap-3">
                {panel.length === 0 && (
                  <span className="text-xs text-slate-400">Add at least one interviewer</span>
                )}
                <Button onClick={submit} isLoading={schedule.isPending}
                  disabled={panel.length === 0}
                  leftIcon={<CalendarClock className="h-4 w-4" />}>
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
      </div>
    </>,
    document.body,
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function FormStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
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
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
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

function ToggleChip({
  checked, onChange, icon, label,
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
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150',
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
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
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
                  if (e.userId) { add.mutate({ memberUserId: e.userId }); onAdded(e.userId, e.name); }
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
  candidateId,
  rubric,
  questions,
  onRemove,
}: {
  round: InterviewRoundView;
  candidateId: string;
  rubric: { id: string; label: string; maxScore: number }[];
  questions: InterviewQuestion[];
  onRemove: () => void;
}) {
  const update = useUpdateInterview(candidateId);
  const sendQ = useSendInterviewQuestions(candidateId);
  const maxTotal = rubric.reduce((s, c) => s + c.maxScore, 0);
  const avg =
    round.evaluations.length > 0
      ? Math.round(
          round.evaluations.reduce((s, e) => s + e.total, 0) / round.evaluations.length,
        )
      : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
      {/* Round header bar */}
      <div className={cn(
        'flex items-center justify-between gap-2 px-3 py-2',
        round.status === 'completed' ? 'bg-emerald-50/70' : 'bg-slate-50/60',
      )}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold capitalize text-slate-800">
            {round.kind} Interview
          </span>
          <Badge tone="neutral">{round.mode}</Badge>
          <Badge tone={STATUS_TONE[round.status]}>{round.status}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {round.status === 'scheduled' && (
            <button type="button"
              onClick={() => update.mutate({ roundId: round.id, status: 'completed' })}
              disabled={update.isPending}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark as complete
            </button>
          )}
          {questions.length > 0 && (
            round.questionsSentAt ? (
              <span
                title={`Questions sent ${formatDate(round.questionsSentAt)}`}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50"
              >
                <SendHorizonal className="h-3 w-3" />
                Questions sent
              </span>
            ) : (
              <button type="button" title="Send interview questions to all panelists"
                onClick={() => sendQ.mutate(round.id)}
                disabled={sendQ.isPending}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-50">
                <SendHorizonal className="h-3.5 w-3.5" />
                Send questions
              </button>
            )
          )}
          <button type="button" title="Remove" onClick={onRemove}
            className="rounded p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="border-t border-slate-100 px-3 py-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {round.scheduledAt ? formatDate(round.scheduledAt) : 'Time TBD'}
          </span>
          {round.meetLink ? (
            <a href={round.meetLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:underline">
              <Video className="h-3 w-3" /> Meet
            </a>
          ) : round.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {round.location}
            </span>
          ) : null}
          {round.calendarSynced && (
            <span className="inline-flex items-center gap-1 text-brand-600" title="Calendar invites sent">
              <CalendarCheck className="h-3 w-3" /> Invites sent
            </span>
          )}
        </div>
        {/* Panelists */}
        {round.panelists.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {round.panelists.map((p) => (
              <span key={p.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  p.hasMarked ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
                )}>
                {p.hasMarked && <Check className="h-2.5 w-2.5" />}
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Evaluations */}
      {round.evaluations.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Evaluation
          </p>
          <div className="space-y-1">
            {round.evaluations.map((ev) => (
              <div key={ev.evaluatorId} className="flex items-center justify-between">
                <span className="truncate font-medium text-slate-600">{ev.evaluatorName}</span>
                <span className="ml-2 shrink-0 font-semibold text-slate-700">
                  {ev.total}
                  {maxTotal > 0 && <span className="text-slate-400"> / {maxTotal}</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1.5">
            <span className="text-slate-500">
              Avg ({round.evaluations.length}/{round.panelists.length} marked)
            </span>
            <span className="font-semibold text-brand-700">
              {avg}
              {maxTotal > 0 && <span className="text-slate-400"> / {maxTotal}</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
