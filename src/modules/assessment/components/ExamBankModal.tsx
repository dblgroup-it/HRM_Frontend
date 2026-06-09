import { useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';

import {
  Badge,
  Button,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
} from '@shared/components/ui';
import { cn } from '@shared/lib';

import {
  useAddExamQuestion,
  useExamBank,
  useRemoveExamQuestion,
} from '../hooks/useAssessment';
import type {
  ExamQuestionKindKey,
  ExamTypeKey,
} from '../types/assessment.types';

const EXAM_TABS: { value: ExamTypeKey; label: string }[] = [
  { value: 'written', label: 'Written exam' },
  { value: 'excel', label: 'Excel exam' },
];
const KIND_OPTIONS = [
  { value: 'mcq', label: 'Multiple choice (auto-scored)' },
  { value: 'text', label: 'Written answer (AI-graded)' },
];

export function ExamBankModal({
  reqId,
  open,
  onClose,
}: {
  reqId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: bank, isLoading } = useExamBank(reqId, open);
  const add = useAddExamQuestion(reqId);
  const remove = useRemoveExamQuestion(reqId);

  const [tab, setTab] = useState<ExamTypeKey>('written');
  const [kind, setKind] = useState<ExamQuestionKindKey>('mcq');
  const [prompt, setPrompt] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [answer, setAnswer] = useState('');
  const [marks, setMarks] = useState('1');

  const questions = (bank?.questions ?? []).filter((q) => q.examType === tab);

  const submit = () => {
    if (prompt.trim().length < 1) return;
    const options =
      kind === 'mcq'
        ? optionsText.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined;
    add.mutate(
      {
        examType: tab,
        kind,
        prompt: prompt.trim(),
        options,
        answer: answer.trim() || undefined,
        marks: Number(marks) || 1,
      },
      {
        onSuccess: () => {
          setPrompt('');
          setOptionsText('');
          setAnswer('');
          setMarks('1');
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Online exam questions" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {EXAM_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  tab === t.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Badge tone={bank?.aiProvider ? 'success' : 'neutral'}>
            <Sparkles className="mr-1 h-3 w-3" />
            {bank?.aiProvider
              ? `AI grading: ${bank.aiProvider}`
              : 'AI grading off'}
          </Badge>
        </div>

        {/* Questions list */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : questions.length === 0 ? (
          <p className="text-sm text-slate-400">
            No {tab} questions yet — add the first one below.
          </p>
        ) : (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-700">
                    <span className="mr-1.5 font-semibold text-slate-400">
                      {i + 1}.
                    </span>
                    {q.prompt}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={q.kind === 'mcq' ? 'info' : 'warning'}>
                      {q.kind === 'mcq' ? 'MCQ' : 'Written'}
                    </Badge>
                    <span className="text-xs text-slate-400">{q.marks} pts</span>
                    <button
                      type="button"
                      onClick={() => remove.mutate(q.id)}
                      className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {q.kind === 'mcq' && q.options && (
                  <ul className="mt-1 pl-5 text-xs text-slate-500">
                    {q.options.map((o) => (
                      <li
                        key={o}
                        className={cn(
                          o.toLowerCase() === q.answer.toLowerCase() &&
                            'font-medium text-emerald-600',
                        )}
                      >
                        • {o}
                        {o.toLowerCase() === q.answer.toLowerCase() && ' ✓'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add question */}
        <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
            <Select
              label="Question type"
              options={KIND_OPTIONS}
              value={kind}
              onChange={(e) => setKind(e.target.value as ExamQuestionKindKey)}
            />
            <Input
              label="Marks"
              type="number"
              min={1}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
            />
          </div>
          <Textarea
            label="Question"
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. What does API stand for?"
          />
          {kind === 'mcq' ? (
            <>
              <Textarea
                label="Options (one per line)"
                rows={3}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={'Application Programming Interface\nA Programmable Item\n…'}
              />
              <Input
                label="Correct option (must match one above)"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Application Programming Interface"
              />
            </>
          ) : (
            <Textarea
              label="Model answer (optional — guides AI grading)"
              rows={2}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="An ideal answer the AI compares against."
            />
          )}
          <div className="flex justify-end">
            <Button
              onClick={submit}
              isLoading={add.isPending}
              disabled={prompt.trim().length < 1}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add question
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
