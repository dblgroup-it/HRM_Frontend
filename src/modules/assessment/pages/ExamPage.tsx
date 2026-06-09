import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';

import { Button, FullPageSpinner, Logo, Textarea } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { assessmentApi } from '../api/assessment.api';
import { usePublicExam } from '../hooks/useAssessment';

export default function ExamPage() {
  const { token = '' } = useParams();
  const { data: exam, isLoading, isError } = usePublicExam(token);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const submit = useMutation({
    mutationFn: () => assessmentApi.submitExam(token, answers),
    onError: () => setError('Something went wrong. Please try again.'),
  });

  if (isLoading) return <FullPageSpinner label="Loading exam…" />;

  const unavailable = isError || !exam || exam.status !== 'pending';
  const totalMarks =
    exam?.questions.reduce((s, q) => s + q.marks, 0) ?? 0;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        {unavailable ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-800">
              Exam not available
            </p>
            <p className="mt-1 text-sm text-slate-500">
              This exam link is invalid or has already been submitted.
            </p>
          </div>
        ) : submit.isSuccess ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">
              Exam submitted
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Thank you, {exam.candidateName}. Your answers have been recorded —
              the recruitment team will be in touch.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-6 text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                {exam.code} · {exam.examType} exam
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{exam.designation}</h1>
              <p className="mt-1 text-sm text-white/90">
                {exam.candidateName} · {exam.questions.length} questions ·{' '}
                {totalMarks} marks
              </p>
            </div>

            <div className="space-y-6 p-6">
              {exam.questions.map((q, i) => (
                <div key={q.id}>
                  <p className="text-sm font-medium text-slate-800">
                    <span className="mr-1.5 text-slate-400">{i + 1}.</span>
                    {q.prompt}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      ({q.marks} {q.marks === 1 ? 'mark' : 'marks'})
                    </span>
                  </p>

                  {q.kind === 'mcq' && q.options ? (
                    <div className="mt-2 space-y-1.5">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition',
                            answers[q.id] === opt
                              ? 'border-brand-400 bg-brand-50 text-brand-800'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                          )}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() =>
                              setAnswers((p) => ({ ...p, [q.id]: opt }))
                            }
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Textarea
                      rows={4}
                      className="mt-2"
                      placeholder="Type your answer…"
                      value={answers[q.id] ?? ''}
                      onChange={(e) =>
                        setAnswers((p) => ({ ...p, [q.id]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  {error}
                </p>
              )}

              <Button
                fullWidth
                size="lg"
                isLoading={submit.isPending}
                onClick={() => {
                  setError('');
                  submit.mutate();
                }}
              >
                Submit exam
              </Button>
              <p className="text-center text-xs text-slate-400">
                You can only submit once. Review your answers before submitting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
