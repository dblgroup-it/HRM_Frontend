import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Search, Send, UserRound, X } from 'lucide-react';

import {
  Button,
  Combobox,
  Input,
  Modal,
  Spinner,
  Textarea,
} from '@shared/components/ui';
import { useDebounce } from '@shared/hooks';
import { cn } from '@shared/lib';
import { useEmployees } from '@modules/employees';
import { useOrganogramUnits } from '@modules/organogram';

import {
  useCandidateDelegations,
  useDelegateInterviews,
  useDelegateWorkload,
} from '../hooks/useAssessment';
import type {
  DelegateWorkload,
  InterviewDelegation,
} from '../types/assessment.types';

/**
 * Hand shortlisted candidates to the people who will run their first interview.
 *
 * Bulk on both axes — several candidates to several people at once — because
 * that is how a recruiter works through a shortlist. Whoever is picked gains
 * rights over these candidates only: schedule the session, form the committee,
 * read the marks. Nothing else in their unit becomes visible.
 */
export function DelegateInterviewsModal({
  candidates,
  onClose,
}: {
  candidates: { id: string; name: string; stage?: string }[];
  onClose: () => void;
}) {
  const delegate = useDelegateInterviews();
  // Only a shortlisted CV goes to an interviewer. Select-all in the pipeline
  // can pick up applied CVs, so split here and say plainly what is being left
  // behind rather than sending them on or refusing the whole batch.
  const eligible = candidates.filter(
    (c) => !c.stage || c.stage === 'shortlisted',
  );
  const skipped = candidates.filter(
    (c) => c.stage && c.stage !== 'shortlisted',
  );
  const [search, setSearch] = useState('');
  const [unit, setUnit] = useState('');
  const debounced = useDebounce(search, 300);
  const { data: orgUnits } = useOrganogramUnits();
  // Narrowing to a factory first is the point: you pick from that unit's own
  // people rather than hunting names across the whole company.
  const { data, isFetching } = useEmployees({
    search: debounced,
    unit: unit || undefined,
    page: 1,
    pageSize: 8,
  });

  // What each person on screen is already carrying. Asked for the visible page
  // only — the point is to inform the click that is about to happen, not to
  // aggregate the whole directory.
  const visibleUserIds = (data?.items ?? [])
    .map((e) => e.userId)
    .filter((id): id is string => Boolean(id));
  const { data: workload } = useDelegateWorkload(visibleUserIds);
  const loadFor = new Map<string, DelegateWorkload>(
    (workload ?? []).map((w) => [w.userId, w]),
  );

  // Who already holds these candidates. Only meaningful for a single
  // candidate; in bulk the answer would be a different set per row.
  const singleCandidateId = eligible.length === 1 ? eligible[0].id : undefined;
  const { data: existing } = useCandidateDelegations(
    singleCandidateId ?? '',
    Boolean(singleCandidateId),
  );
  const alreadyWith = new Map<string, InterviewDelegation>(
    (existing ?? []).map((d) => [d.delegatedTo.id, d]),
  );
  const [picked, setPicked] = useState<Map<string, string>>(new Map());
  const [note, setNote] = useState('');

  // The testing brief. Off by default so a hand-off never quietly imposes a
  // test nobody asked for; switching one on reveals its total-marks box.
  const [written, setWritten] = useState(false);
  const [writtenTotal, setWrittenTotal] = useState('100');
  const [computer, setComputer] = useState(false);
  const [computerTotal, setComputerTotal] = useState('50');
  const [aiTest, setAiTest] = useState(false);

  const results = useMemo(
    () =>
      unit || debounced.trim().length >= 2 ? (data?.items ?? []) : [],
    [unit, debounced, data],
  );

  const toggle = (userId: string, name: string) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(userId)) next.delete(userId);
      else next.set(userId, name);
      return next;
    });

  /**
   * What just went, shown in the dialog before it closes: sending used to
   * shut the dialog with no sign anything had happened, and nothing on the
   * candidate row said so either.
   */
  const [sent, setSent] = useState<{ count: number; to: string[] } | null>(
    null,
  );
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(onClose, 2400);
    return () => clearTimeout(t);
  }, [sent, onClose]);

  const send = () =>
    delegate.mutate(
      {
        candidateIds: eligible.map((c) => c.id),
        delegateUserIds: [...picked.keys()],
        note: note.trim() || undefined,
        tests: {
          writtenTestEnabled: written,
          ...(written ? { writtenTestTotal: Number(writtenTotal) || 100 } : {}),
          computerTestEnabled: computer,
          ...(computer
            ? { computerTestTotal: Number(computerTotal) || 50 }
            : {}),
          aiTestEnabled: aiTest,
        },
      },
      {
        onSuccess: () =>
          setSent({ count: eligible.length, to: [...picked.values()] }),
      },
    );

  if (sent) {
    const names =
      sent.to.length <= 2
        ? sent.to.join(' and ')
        : `${sent.to[0]} and ${sent.to.length - 1} others`;
    return (
      <Modal
        open
        onClose={onClose}
        size="sm"
        title="Sent for interview"
        footer={
          <div className="flex justify-end">
            <Button size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center py-4 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/40" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              {/* The plane leaves, then the check lands where it was. */}
              <Send className="absolute h-7 w-7 animate-plane-away" />
              <Check
                className="h-8 w-8 animate-loader-pop [animation-delay:550ms]"
                strokeWidth={3}
              />
            </span>
          </div>
          <p className="mt-4 text-base font-semibold text-slate-900">
            {sent.count} CV{sent.count === 1 ? '' : 's'} sent to {names}
          </p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            They have been notified and will find{' '}
            {sent.count === 1 ? 'it' : 'them'} under Assigned Candidates. The
            candidate row now shows who has the first interview.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={`Send ${eligible.length} shortlisted CV${eligible.length === 1 ? '' : 's'} for interview`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            {picked.size === 0
              ? 'Pick who should interview them'
              : `${picked.size} selected`}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                picked.size === 0 || eligible.length === 0 || delegate.isPending
              }
              isLoading={delegate.isPending}
              leftIcon={<Send className="h-3.5 w-3.5" />}
              onClick={send}
            >
              Send
            </Button>
          </div>
        </div>
      }
    >
      {/* Two columns once there's room: the brief on the left (who and what),
          the routing on the right (to whom). On a narrow screen it falls back
          to a single stack in the same reading order. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <div className="space-y-4">
        {/* Who is being sent */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
            Candidates
          </p>
          <div className="flex flex-wrap gap-1.5">
            {eligible.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
              >
                <UserRound className="h-3 w-3 text-slate-400" />
                {c.name}
              </span>
            ))}
            {eligible.length === 0 && (
              <span className="text-xs text-slate-400">
                None of the selected CVs are shortlisted yet.
              </span>
            )}
          </div>

          {skipped.length > 0 && (
            <p className="mt-2.5 flex items-start gap-1.5 border-t border-slate-200 pt-2.5 text-xs leading-5 text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {skipped.length} not shortlisted and will not be sent —{' '}
                <span className="font-medium">
                  {skipped
                    .slice(0, 3)
                    .map((c) => c.name)
                    .join(', ')}
                  {skipped.length > 3 ? ` +${skipped.length - 3} more` : ''}
                </span>
                . Shortlist them first if they should be interviewed.
              </span>
            </p>
          )}
        </div>

        {/* What the interviewer is being asked to test for. Set here so the
            brief travels with the hand-off and their worklist already has the
            right boxes waiting. */}
        <div>
          <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
            Tests required
          </p>
          <div className="space-y-1.5">
            <TestToggle
              label="Written Test"
              hint="Marked by hand at the interview"
              on={written}
              onToggle={setWritten}
              total={writtenTotal}
              onTotal={setWrittenTotal}
            />
            <TestToggle
              label="Computer Literacy"
              hint="Marked by hand at the interview"
              on={computer}
              onToggle={setComputer}
              total={computerTotal}
              onTotal={setComputerTotal}
            />
            <TestToggle
              label="AI Proficiency"
              hint="Online test, scored automatically"
              on={aiTest}
              onToggle={setAiTest}
            />
          </div>
          <p className="mt-1.5 text-[0.6875rem] leading-5 text-slate-400">
            Pass marks come from AI Settings and apply to every requisition.
          </p>
        </div>
        </div>

        {/* Who they go to */}
        <div className="space-y-4">
        <div>
          <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
            Send to
          </p>
          <p className="mb-2 text-xs leading-5 text-slate-500">
            They can schedule the first interview, form the committee and enter
            marks — for these candidates only. Sending also gives them sign-in
            access if they had none, so there is no Access Control step.
          </p>

          {picked.size > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[...picked].map(([id, name]) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-brand-700"
                >
                  {name}
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => toggle(id, name)}
                    className="rounded-full p-0.5 hover:bg-brand-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mb-2">
            <Combobox
              label="Factory / unit (optional)"
              placeholder="All units — or narrow to one factory"
              options={(orgUnits ?? []).map((u) => ({
                value: u.unit,
                label: u.unit,
              }))}
              value={unit}
              onChange={(v) => setUnit(v)}
            />
          </div>

          <Input
            placeholder={
              unit
                ? `Search within ${unit}…`
                : 'Search by name, code or designation…'
            }
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {(unit || debounced.trim().length >= 2) && (
            <div className="mt-1.5 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {isFetching && results.length === 0 && (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              )}
              {!isFetching && results.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-slate-400">
                  No matching employee.
                </p>
              )}
              {results.map((emp) => {
                // Only people with a login can act on what they're sent.
                const disabled = !emp.userId;
                const isPicked = emp.userId ? picked.has(emp.userId) : false;
                const load = emp.userId ? loadFor.get(emp.userId) : undefined;
                const prior = emp.userId
                  ? alreadyWith.get(emp.userId)
                  : undefined;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => emp.userId && toggle(emp.userId, emp.name)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors',
                      disabled
                        ? 'cursor-not-allowed opacity-50'
                        : isPicked
                          ? 'bg-brand-50/60'
                          : 'hover:bg-slate-50',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-slate-900">
                          {emp.name}
                        </span>
                        {prior && (
                          <span
                            title={
                              prior.resent
                                ? `Already sent ${prior.sendCount} times — last ${relativeDays(prior.waitingDays)}`
                                : `Already sent ${relativeDays(prior.waitingDays)}`
                            }
                            className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
                          >
                            {prior.resent
                              ? `sent ×${prior.sendCount}`
                              : 'already sent'}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {emp.employeeCode}
                        {emp.jobTitle ? ` · ${emp.jobTitle}` : ''}
                        {disabled ? ' · no sign-in' : ''}
                      </span>
                      {/* The load they are already carrying. Shown before the
                          click, because afterwards it is somebody else's
                          problem to discover. */}
                      {load && load.holds > 0 && (
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                          <span className="font-medium text-slate-600">
                            holds {load.holds}
                          </span>
                          {load.waiting > 0 && (
                            <span
                              className={cn(
                                load.oldestWaitingDays >= 7
                                  ? 'font-medium text-amber-700'
                                  : 'text-slate-500',
                              )}
                            >
                              · {load.waiting} not started
                              {load.oldestWaitingDays > 0 &&
                                ` (oldest ${load.oldestWaitingDays}d)`}
                            </span>
                          )}
                          {load.inProgress > 0 && (
                            <span>· {load.inProgress} in progress</span>
                          )}
                          {load.done > 0 && (
                            <span className="text-emerald-700">
                              · {load.done} done
                            </span>
                          )}
                        </span>
                      )}
                      {load && load.holds === 0 && (
                        <span className="mt-1 block text-[11px] text-slate-400">
                          nothing assigned
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        isPicked
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 text-transparent',
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Textarea
          label="Note (optional)"
          rows={2}
          placeholder="Anything the interviewers should know"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {delegate.isError && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
            {(delegate.error as Error).message}
          </p>
        )}
        </div>
      </div>
    </Modal>
  );
}

function TestToggle({
  label,
  hint,
  on,
  onToggle,
  total,
  onTotal,
}: {
  label: string;
  hint: string;
  on: boolean;
  onToggle: (v: boolean) => void;
  /** Omit for a test whose marks aren't entered by hand. */
  total?: string;
  onTotal?: (v: string) => void;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 transition-colors',
        on ? 'border-brand-200 bg-brand-50/50' : 'border-slate-200 bg-white',
      )}
    >
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-800">
            {label}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">
            {hint}
          </span>
        </span>
      </label>
      {on && total !== undefined && onTotal && (
        <div className="mt-2 flex items-center gap-2 pl-[1.625rem]">
          <span className="text-xs text-slate-500">Out of</span>
          <input
            type="number"
            min={1}
            value={total}
            onChange={(e) => onTotal(e.target.value)}
            className="w-20 rounded-lg border border-slate-200 px-2.5 py-1 text-sm tabular-nums focus:border-brand-400 focus:outline-none"
          />
          <span className="text-xs text-slate-400">marks</span>
        </div>
      )}
    </div>
  );
}

/** "today" / "yesterday" / "9 days ago" — for a tooltip, not a table. */
function relativeDays(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
