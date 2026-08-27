import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle2, Maximize, Send, ShieldAlert, Timer } from 'lucide-react';

import { cn } from '@shared/lib';
import { Spinner } from '@shared/components/ui';

import {
  useRecordAiProficiencyViolation,
  usePublicAiProficiency,
  useStartAiProficiency,
  useSubmitAiProficiency,
} from '../hooks/useAiProficiency';

/** How long the candidate has to come back after their FIRST violation. */
const GRACE_MS = 30_000;

export default function AiProficiencyExamPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isLoading, isError, error } = usePublicAiProficiency(token);
  const submit = useSubmitAiProficiency(token);
  const start = useStartAiProficiency(token);
  const recordViolation = useRecordAiProficiencyViolation(token);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<{ totalScore: number; maxScore: number } | null>(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  // Non-null while showing the "come back or your test ends" overlay.
  const [violationDeadline, setViolationDeadline] = useState<number | null>(null);
  // True once the candidate's one warning has been used (for the persistent banner).
  const [violationWarned, setViolationWarned] = useState(false);

  // Countdown — the deadline is startedAt + timeLimitMinutes (set server-side
  // the moment the candidate first opened this link), so it survives a page
  // refresh instead of resetting.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const deadline =
    data?.startedAt && data.timeLimitMinutes
      ? new Date(data.startedAt).getTime() + data.timeLimitMinutes * 60_000
      : null;
  const remainingMs = deadline !== null ? Math.max(0, deadline - now) : null;
  const timeUp = remainingMs === 0;

  const autoSubmittedRef = useRef(false);
  // Read the latest answers/status via a ref rather than effect deps, so
  // this only fires exactly once, right when the countdown actually hits 0.
  const latestRef = useRef({ answers, submitted, alreadySubmitted: data?.alreadySubmitted, pending: submit.isPending });
  latestRef.current = { answers, submitted, alreadySubmitted: data?.alreadySubmitted, pending: submit.isPending };
  useEffect(() => {
    if (!timeUp || autoSubmittedRef.current) return;
    const { answers: latestAnswers, submitted: alreadyDone, alreadySubmitted, pending } = latestRef.current;
    if (alreadyDone || alreadySubmitted || pending) return;
    autoSubmittedRef.current = true;
    submit.mutate(
      { answers: latestAnswers, reason: 'time_up' },
      { onSuccess: (result) => setSubmitted(result) },
    );
  }, [timeUp, submit]);

  // --- Focus lock: leaving the tab or exiting fullscreen counts as a
  // violation. 1st time: 30s to come back, or the test ends. 2nd time
  // (ever, for this attempt): ends immediately, no grace period. ---
  const examActive = Boolean(data?.startedAt) && !data?.alreadySubmitted && !submitted;
  const localViolationCountRef = useRef<number | null>(null);
  if (data && localViolationCountRef.current === null) {
    localViolationCountRef.current = data.violationCount;
    if (data.violationCount >= 1 && !violationWarned) setViolationWarned(true);
  }
  const isAwayRef = useRef(false);
  const awayAtRef = useRef<number | null>(null);
  const stateRef = useRef({ examActive, answers });
  stateRef.current = { examActive, answers };

  useEffect(() => {
    const endForViolation = (leftAt: number) => {
      recordViolation.mutate({
        leftAt: new Date(leftAt).toISOString(),
        returnedAt: null,
        endedTest: true,
      });
      setViolationDeadline(null);
      if (autoSubmittedRef.current) return;
      autoSubmittedRef.current = true;
      submit.mutate(
        { answers: stateRef.current.answers, reason: 'violation' },
        { onSuccess: (result) => setSubmitted(result) },
      );
    };

    const handleLeave = () => {
      if (!stateRef.current.examActive || isAwayRef.current) return;
      isAwayRef.current = true;
      const leftAt = Date.now();
      awayAtRef.current = leftAt;

      if ((localViolationCountRef.current ?? 0) >= 1) {
        // Warning already used — this one ends it, no grace period.
        localViolationCountRef.current = (localViolationCountRef.current ?? 0) + 1;
        endForViolation(leftAt);
        return;
      }

      localViolationCountRef.current = 1;
      setViolationWarned(true);
      setViolationDeadline(leftAt + GRACE_MS);
    };

    const handleReturn = () => {
      if (!isAwayRef.current) return;
      isAwayRef.current = false;
      const leftAt = awayAtRef.current ?? Date.now();
      awayAtRef.current = null;
      setViolationDeadline(null);
      if (autoSubmittedRef.current) return;
      recordViolation.mutate({
        leftAt: new Date(leftAt).toISOString(),
        returnedAt: new Date().toISOString(),
        endedTest: false,
      });
    };

    const onVisibility = () => (document.hidden ? handleLeave() : handleReturn());
    const onFullscreenChange = () => {
      if (!fullscreenActive) return;
      // Exiting fullscreen is a violation; re-entering it (e.g. the "Return
      // to test" button) is how they clear it — this event fires for both.
      if (document.fullscreenElement) handleReturn();
      else handleLeave();
    };

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [fullscreenActive, recordViolation, submit]);

  // The 30s grace period expiring is itself a violation-ending event.
  useEffect(() => {
    if (violationDeadline === null || now < violationDeadline) return;
    if (autoSubmittedRef.current) return;
    recordViolation.mutate({
      leftAt: new Date(awayAtRef.current ?? violationDeadline - GRACE_MS).toISOString(),
      returnedAt: null,
      endedTest: true,
    });
    setViolationDeadline(null);
    autoSubmittedRef.current = true;
    submit.mutate(
      { answers: stateRef.current.answers, reason: 'violation' },
      { onSuccess: (result) => setSubmitted(result) },
    );
  }, [now, violationDeadline, recordViolation, submit]);

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-24">
          <Spinner />
          <p className="text-sm text-slate-500">Loading your test…</p>
        </div>
      </Shell>
    );
  }

  if (isError || !data) {
    const msg = (error as { message?: string } | null)?.message ?? 'This test link is invalid or has expired.';
    return (
      <Shell>
        <div className="mx-auto max-w-sm py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Link unavailable</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{msg}</p>
          <p className="mt-5 text-xs text-slate-400">Please contact HR to request a new link.</p>
        </div>
      </Shell>
    );
  }

  if (!data.alreadySubmitted && !data.startedAt) {
    return (
      <Shell>
        <div className="mx-auto max-w-md py-16 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
            <Timer className="h-8 w-8 text-brand-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Ready when you are</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            This test has {data.questions.length} question{data.questions.length === 1 ? '' : 's'}
            {data.timeLimitMinutes ? `, and a ${data.timeLimitMinutes}-minute time limit` : ''}. The
            timer starts as soon as you click Start — make sure you&rsquo;re ready before you begin.
          </p>
          <div className="mx-auto mt-4 flex max-w-xs items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-left text-xs text-amber-700">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This test runs in fullscreen. Leaving the screen once gives you 30 seconds to return
              — a second time ends the test immediately.
            </span>
          </div>
          <button
            type="button"
            disabled={start.isPending}
            onClick={() => {
              const el = document.documentElement;
              if (el.requestFullscreen) {
                el
                  .requestFullscreen()
                  .then(() => setFullscreenActive(true))
                  .catch(() => {});
              }
              start.mutate();
            }}
            className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-200 transition-all hover:from-brand-700 hover:to-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {start.isPending ? (
              <>
                <Spinner /> Starting…
              </>
            ) : (
              'Start Test'
            )}
          </button>
          {start.isError && (
            <p className="mt-3 text-sm text-rose-600">
              {(start.error as { message?: string })?.message ?? 'Could not start the test. Please try again.'}
            </p>
          )}
        </div>
      </Shell>
    );
  }

  if (submitted || data.alreadySubmitted) {
    const total = submitted?.totalScore ?? data.totalScore ?? 0;
    const max = submitted?.maxScore ?? data.maxScore;
    const pct = max > 0 ? Math.round((total / max) * 1000) / 10 : 0;
    return (
      <Shell>
        <div className="mx-auto max-w-md py-16 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Test submitted!</h2>
          <p className="mt-2 text-sm text-slate-500">
            Thank you for completing the test. Your response has been recorded.
          </p>
          <div className="mt-5 inline-block rounded-full bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700">
            {total} / {max} &nbsp;·&nbsp; {pct.toFixed(1)}%
          </div>
        </div>
      </Shell>
    );
  }

  const answered = Object.keys(answers).length;
  const canSubmit = !submit.isPending && !timeUp && answered === data.questions.length;

  const handleSubmit = () =>
    submit.mutate(
      { answers },
      { onSuccess: (result) => setSubmitted(result) },
    );

  const graceRemainingMs = violationDeadline !== null ? Math.max(0, violationDeadline - now) : null;

  return (
    <Shell timer={remainingMs !== null ? <CountdownBadge remainingMs={remainingMs} /> : null}>
      {graceRemainingMs !== null && <ViolationOverlay remainingMs={graceRemainingMs} />}
      <div className="mx-auto max-w-2xl space-y-4 pb-32">
        {violationWarned && graceRemainingMs === null && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-700">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Warning used — leaving the test screen again will end it immediately.
          </div>
        )}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
          <h2 className="text-lg font-bold text-slate-900">Screening Test</h2>
          <p className="mt-1 text-sm text-slate-500">
            Answer all {data.questions.length} questions, then submit. You can only submit once.
          </p>
          {remainingMs !== null && (
            <p className={cn('mt-2 text-xs font-medium', remainingMs < 60_000 ? 'text-rose-600' : 'text-slate-500')}>
              {timeUp
                ? "Time's up — submitting your answers…"
                : `Time remaining: ${formatMs(remainingMs)}`}
            </p>
          )}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${(answered / data.questions.length) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs text-slate-400">
            {answered} / {data.questions.length} answered
          </p>
        </div>

        <div className="space-y-3">
          {data.questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
              <p className="text-sm font-semibold text-slate-800">
                {i + 1}. {q.prompt}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={timeUp}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors',
                        timeUp && 'cursor-not-allowed opacity-60',
                        selected
                          ? 'border-brand-400 bg-brand-50 text-brand-800 font-medium'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          selected ? 'border-brand-500 bg-brand-500' : 'border-slate-300',
                        )}
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all',
            canSubmit
              ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-200 hover:from-brand-700 hover:to-brand-800'
              : 'cursor-not-allowed bg-slate-100 text-slate-400',
          )}
        >
          {submit.isPending ? (
            <>
              <Spinner /> Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit Test
            </>
          )}
        </button>
        {!canSubmit && !submit.isPending && (
          <p className="text-center text-xs text-slate-400">
            {timeUp ? "Time's up — submitting automatically…" : 'Answer every question to submit.'}
          </p>
        )}
        {submit.isError && (
          <p className="text-center text-sm text-rose-600">
            {(submit.error as { message?: string })?.message ?? 'Submission failed. Please try again.'}
          </p>
        )}
      </div>
    </Shell>
  );
}

/** Full-screen blocking warning shown the moment the candidate leaves the
 * test tab/window or exits fullscreen for the first time — they have
 * GRACE_MS to come back before the test ends automatically. */
function ViolationOverlay({ remainingMs }: { remainingMs: number }) {
  const seconds = Math.ceil(remainingMs / 1000);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
          <ShieldAlert className="h-7 w-7 text-rose-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">You left the test screen</h2>
        <p className="mt-2 text-sm text-slate-500">
          Return to this tab in fullscreen within
        </p>
        <p className="my-2 text-4xl font-bold tabular-nums text-rose-600">{seconds}s</p>
        <p className="text-sm text-slate-500">or your test will be submitted automatically.</p>
        <p className="mt-3 text-xs font-medium text-amber-600">
          This is your only warning — leaving a second time ends the test immediately.
        </p>
        <button
          type="button"
          onClick={() => {
            const el = document.documentElement;
            if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
          }}
          className="mx-auto mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Maximize className="h-4 w-4" /> Return to test
        </button>
      </div>
    </div>
  );
}

function Shell({ children, timer }: { children: React.ReactNode; timer?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3">
          <img
            src="/logo.png"
            alt="DBL"
            className="h-7 w-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">DBL HRM · Screening Test</span>
          {timer && <div className="ml-auto">{timer}</div>}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}

function CountdownBadge({ remainingMs }: { remainingMs: number }) {
  const low = remainingMs < 60_000;
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tabular-nums',
        low ? 'animate-pulse bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600',
      )}
    >
      <Timer className="h-3.5 w-3.5" />
      {formatMs(remainingMs)}
    </span>
  );
}

function formatMs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
