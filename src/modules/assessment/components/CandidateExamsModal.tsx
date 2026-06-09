import { useState } from 'react';
import { Copy, ExternalLink, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Checkbox,
  Modal,
  Select,
  Spinner,
  type BadgeTone,
} from '@shared/components/ui';

import {
  useCandidateExams,
  useCreateExamAttempt,
  useGradeExam,
} from '../hooks/useAssessment';
import type { ExamAttemptView, ExamTypeKey } from '../types/assessment.types';

const EXAM_OPTIONS = [
  { value: 'written', label: 'Written exam' },
  { value: 'excel', label: 'Excel exam' },
];

const STATUS: Record<string, { tone: BadgeTone; label: string }> = {
  pending: { tone: 'warning', label: 'Not taken' },
  submitted: { tone: 'info', label: 'Submitted — needs grading' },
  graded: { tone: 'success', label: 'Graded' },
};

export function CandidateExamsModal({
  candidate,
  open,
  onClose,
}: {
  candidate: { id: string; name: string };
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useCandidateExams(candidate.id, open);
  const create = useCreateExamAttempt(candidate.id);
  const grade = useGradeExam(candidate.id);
  const [examType, setExamType] = useState<ExamTypeKey>('written');
  const [notify, setNotify] = useState(true);

  const aiOn = Boolean(data?.aiProvider);

  const copy = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast.success('Exam link copied');
  };

  return (
    <Modal open={open} onClose={onClose} title={`Exams · ${candidate.name}`} size="lg">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Exam attempts
          </p>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : (data?.attempts.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">No exams sent yet.</p>
          ) : (
            <div className="space-y-2">
              {data?.attempts.map((a) => (
                <AttemptRow
                  key={a.id}
                  attempt={a}
                  aiOn={aiOn}
                  grading={grade.isPending}
                  onCopy={() => copy(a.link)}
                  onGrade={() => grade.mutate(a.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create */}
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="mb-3 text-sm font-medium text-slate-800">
            Send an online exam
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-44">
              <Select
                label="Exam"
                options={EXAM_OPTIONS}
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamTypeKey)}
              />
            </div>
            <Checkbox
              label="Email the candidate the link"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
            />
            <div className="ml-auto">
              <Button
                onClick={() =>
                  create.mutate({ examType, notifyCandidate: notify })
                }
                isLoading={create.isPending}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Create exam link
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Generates a unique link the candidate opens to take the exam (no login
            needed). MCQs are auto-scored; written answers are{' '}
            {aiOn ? 'AI-graded' : 'marked manually (AI off)'}.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function AttemptRow({
  attempt,
  aiOn,
  grading,
  onCopy,
  onGrade,
}: {
  attempt: ExamAttemptView;
  aiOn: boolean;
  grading: boolean;
  onCopy: () => void;
  onGrade: () => void;
}) {
  const status = STATUS[attempt.status] ?? STATUS.pending;
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize text-slate-800">
            {attempt.examType} exam
          </span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {attempt.status !== 'pending' && (
            <span className="text-sm font-semibold text-slate-700">
              {attempt.totalScore ?? 0}
              <span className="text-slate-400"> / {attempt.maxScore}</span>
            </span>
          )}
          {attempt.status === 'submitted' && aiOn && (
            <Button
              size="sm"
              variant="outline"
              isLoading={grading}
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={onGrade}
            >
              Grade with AI
            </Button>
          )}
        </div>
      </div>

      {attempt.status === 'pending' && (
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-slate-50 px-2 py-1 text-xs text-slate-500">
            {attempt.link}
          </code>
          <button
            type="button"
            onClick={onCopy}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
            title="Copy exam link"
          >
            <Copy className="h-4 w-4" />
          </button>
          <a
            href={attempt.link}
            target="_blank"
            rel="noreferrer"
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
            title="Open exam"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {attempt.grades && Object.keys(attempt.grades).length > 0 && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs">
          {Object.values(attempt.grades).map((g, i) => (
            <div key={i} className="flex justify-between gap-2 text-slate-500">
              <span className="truncate">{g.feedback || 'Auto-scored'}</span>
              <span className="shrink-0 font-medium text-slate-600">
                {g.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
