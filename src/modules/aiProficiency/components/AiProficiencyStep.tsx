import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  ListChecks,
  RotateCw,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';

import { Button, Checkbox, Select, Spinner } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { JOB_GRADES } from '@modules/salaryFixation';

import {
  useAiProficiencyReview,
  useAiProficiencyStatus,
  useAssignAiProficiencyTest,
} from '../hooks/useAiProficiency';

/**
 * Salary Fixation's Step 2 — replaces manual mark entry with an online,
 * auto-graded test. Assign once per candidate; the result syncs back into
 * SalaryFixation.aiTestTotal/aiTestObtained automatically on submission.
 */
export function AiProficiencyStep({
  candidateId,
  jobGrade,
}: {
  candidateId: string;
  jobGrade: string | null;
}) {
  const { data: attempt, isLoading } = useAiProficiencyStatus(candidateId);
  const assign = useAssignAiProficiencyTest(candidateId);
  const [formOpen, setFormOpen] = useState(false);
  const [grade, setGrade] = useState(jobGrade ?? '');
  const [count, setCount] = useState('20');
  const [minutes, setMinutes] = useState('30');
  const [notify, setNotify] = useState(true);
  const [copied, setCopied] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  if (isLoading) {
    return <p className="text-xs text-slate-400">Loading test status…</p>;
  }

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const assignForm = (
    <div className="space-y-2.5 rounded-lg bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          options={JOB_GRADES.map((g) => ({ value: g, label: g }))}
          placeholder="Job grade"
        />
        <input
          type="number"
          min={1}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          placeholder="No. of questions"
          className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-[0.6875rem] font-medium text-slate-500">
          Time limit (minutes) — starts once the candidate opens the test
        </label>
        <input
          type="number"
          min={1}
          max={300}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="e.g. 30"
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
        />
      </div>
      <Checkbox
        label="Email the candidate their test link"
        checked={notify}
        onChange={(e) => setNotify(e.target.checked)}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          isLoading={assign.isPending}
          disabled={!grade || !count || Number(count) < 1 || !minutes || Number(minutes) < 1}
          onClick={() =>
            assign.mutate(
              {
                jobGrade: grade,
                questionCount: Number(count),
                notifyCandidate: notify,
                timeLimitMinutes: Number(minutes),
              },
              { onSuccess: () => setFormOpen(false) },
            )
          }
        >
          Assign test
        </Button>
      </div>
    </div>
  );

  if (!attempt) {
    if (!formOpen) {
      return (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">Not yet assigned</span>
          <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
            Assign test
          </Button>
        </div>
      );
    }
    return assignForm;
  }

  if (attempt.status === 'pending') {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Sent — awaiting candidate (grade {attempt.jobGrade}, attempt {attempt.attemptNumber} of{' '}
            {attempt.maxAttempts}
            {attempt.timeLimitMinutes ? `, ${attempt.timeLimitMinutes} min limit` : ''})
          </span>
          <button
            type="button"
            onClick={() => copyLink(attempt.link)}
            className="flex shrink-0 items-center gap-1 font-medium text-amber-800 hover:underline"
          >
            <ClipboardCopy className="h-3 w-3" />
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
        {attempt.violations.length > 0 && (
          <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            Left the test screen {attempt.violations.length}x during this attempt
          </p>
        )}
      </div>
    );
  }

  // Submitted — show the score prominently (with a %), a way to see the full
  // per-question breakdown, and (unless attempts are used up) a retry option.
  const pct = attempt.maxScore > 0 ? Math.round(((attempt.totalScore ?? 0) / attempt.maxScore) * 1000) / 10 : 0;
  const violated = attempt.terminationReason === 'violation';
  const tone = violated
    ? { box: 'bg-rose-50 text-rose-700', label: 'text-rose-600', border: 'border-rose-300 text-rose-700 hover:bg-rose-50' }
    : { box: 'bg-emerald-50 text-emerald-700', label: 'text-emerald-500', border: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' };

  return (
    <div className="space-y-2">
      <div className={cn('rounded-lg px-3 py-2.5', tone.box)}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs">
            {violated ? <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
            {violated ? 'Ended early — left the test screen' : 'Submitted'} (attempt {attempt.attemptNumber} of{' '}
            {attempt.maxAttempts})
          </span>
          {attempt.attemptsRemaining > 0 && !formOpen && (
            <button
              type="button"
              onClick={() => {
                setGrade(attempt.jobGrade);
                setFormOpen(true);
              }}
              className="flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
            >
              <RotateCw className="h-3 w-3" />
              Retry — new attempt
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span>
            <span className="text-lg font-bold tabular-nums">
              {attempt.totalScore} <span className={cn('text-xs font-medium', tone.label)}>/ {attempt.maxScore} marks</span>
              <span className={cn('ml-1.5 text-xs font-semibold', tone.label)}>({pct.toFixed(1)}%)</span>
            </span>
            <span className="block text-[0.6875rem] text-slate-400">
              {attempt.questionCount} question{attempt.questionCount === 1 ? '' : 's'}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className={cn('flex shrink-0 items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-xs font-medium', tone.border)}
          >
            <ListChecks className="h-3.5 w-3.5" />
            See details
          </button>
        </div>
      </div>
      {attempt.attemptsRemaining === 0 && (
        <p className="text-[0.6875rem] text-slate-400">
          Maximum of {attempt.maxAttempts} attempts used for this candidate.
        </p>
      )}
      {formOpen && assignForm}

      {reviewOpen && <ReviewModal candidateId={candidateId} onClose={() => setReviewOpen(false)} />}
    </div>
  );
}

function ReviewModal({ candidateId, onClose }: { candidateId: string; onClose: () => void }) {
  const { data: review, isLoading } = useAiProficiencyReview(candidateId, true);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">AI Proficiency Test — breakdown</h3>
            {review && (
              <p className="text-xs text-slate-400">
                Grade {review.jobGrade} · {review.totalScore} / {review.maxScore} scored
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!isLoading && review && review.violations.length > 0 && (
            <div className="mb-4 space-y-1.5 rounded-lg bg-rose-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                <ShieldAlert className="h-3.5 w-3.5" />
                Left the test screen {review.violations.length}x
                {review.terminationReason === 'violation' ? ' — test ended early' : ''}
              </p>
              <ul className="space-y-0.5 text-[0.6875rem] text-rose-600">
                {review.violations.map((v, i) => (
                  <li key={i}>
                    {new Date(v.leftAt).toLocaleTimeString()}
                    {v.returnedAt
                      ? ` — returned ${new Date(v.returnedAt).toLocaleTimeString()}`
                      : v.endedTest
                        ? " — didn't return, test ended"
                        : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : !review || review.questions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No question detail available.</p>
          ) : (
            <div className="space-y-3">
              {review.questions.map((q, i) => (
                <div
                  key={q.id}
                  className={cn(
                    'rounded-lg border p-3',
                    q.isCorrect ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40',
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-slate-700">
                      {i + 1}. {q.prompt}
                    </p>
                    <span
                      className={cn(
                        'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-bold',
                        q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
                      )}
                    >
                      {q.isCorrect ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {q.isCorrect ? `+${q.marks}` : '0'} / {q.marks}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {q.options.map((opt) => {
                      const isAnswer = opt === q.correctAnswer;
                      const isCandidatePick = opt === q.candidateAnswer;
                      return (
                        <div
                          key={opt}
                          className={cn(
                            'flex items-center justify-between rounded-md px-2.5 py-1 text-xs',
                            isAnswer
                              ? 'bg-emerald-100 font-medium text-emerald-800'
                              : isCandidatePick
                                ? 'bg-rose-100 font-medium text-rose-800'
                                : 'text-slate-500',
                          )}
                        >
                          <span>{opt}</span>
                          <span className="flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wide">
                            {isAnswer && 'Correct answer'}
                            {isCandidatePick && !isAnswer && 'Candidate picked'}
                          </span>
                        </div>
                      );
                    })}
                    {!q.candidateAnswer && (
                      <p className="px-2.5 text-[0.6875rem] italic text-slate-400">No answer given</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
