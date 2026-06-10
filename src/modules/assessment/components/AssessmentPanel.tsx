import { useState } from 'react';
import {
  Check,
  ClipboardCheck,
  Copy,
  FileQuestion,
  ListChecks,
  MessageSquareText,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useDebounce } from '@shared/hooks';
import { useEmployees } from '@modules/employees';
import type { Requisition } from '@modules/requisition/types/requisition.types';

import {
  useAddCommitteeMember,
  useAssessmentSetup,
  useGenerateQuestions,
  useRemoveCommitteeMember,
  useSetPlan,
  useSetRubric,
} from '../hooks/useAssessment';
import type {
  AssessmentTypeKey,
  InterviewQuestion,
  RubricCriterionView,
} from '../types/assessment.types';
import { ExamBankModal } from './ExamBankModal';

const ASSESSMENT_TYPES: {
  key: AssessmentTypeKey;
  label: string;
  mode: string;
  hint: string;
}[] = [
  { key: 'written', label: 'Written exam', mode: 'Online', hint: 'MCQ + written, AI-graded' },
  { key: 'excel', label: 'Excel exam', mode: 'Online', hint: 'Spreadsheet skills' },
  { key: 'skill', label: 'Skill / technical', mode: 'Offline', hint: 'Hands-on test' },
  { key: 'viva', label: 'Viva / interview', mode: 'Physical', hint: 'Panel interview' },
];

export function AssessmentPanel({ requisition }: { requisition: Requisition }) {
  const reqId = requisition.id;
  const { data: setup, isLoading } = useAssessmentSetup(reqId);
  const setPlan = useSetPlan(reqId);
  const removeMember = useRemoveCommitteeMember(reqId);
  const [examOpen, setExamOpen] = useState(false);

  if (isLoading || !setup) {
    return (
      <Card>
        <CardBody className="flex justify-center py-10">
          <Spinner />
        </CardBody>
      </Card>
    );
  }

  const planTypes = new Set(setup.plan.map((p) => p.type));
  const togglePlan = (type: AssessmentTypeKey) => {
    const next = new Set(planTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setPlan.mutate(
      [...next].map((t) => ({
        type: t,
        maxScore: setup.plan.find((p) => p.type === t)?.maxScore ?? 100,
      })),
    );
  };

  const rubricPts = setup.rubric.reduce((s, c) => s + c.maxScore, 0);
  const questions = setup.interviewQuestions ?? [];

  return (
    <div className="space-y-5">
      {/* Overview / readiness */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
                <ClipboardCheck className="h-4 w-4 text-brand-600" />
                Assessment &amp; Interview Setup
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Define how shortlisted candidates are assessed and who interviews
                them. Committee members score each candidate from <em>My
                Interviews</em>.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FileQuestion className="h-4 w-4" />}
              onClick={() => setExamOpen(true)}
            >
              Exam questions
            </Button>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 text-center">
            <Stat label="Assessment types" value={setup.plan.length} />
            <Stat
              label="Committee members"
              value={setup.committee.length}
              border
            />
            <Stat
              label={
                rubricPts > 0
                  ? `Rubric criteria · ${rubricPts} pts`
                  : 'Rubric criteria'
              }
              value={setup.rubric.length}
            />
          </div>
        </CardBody>
      </Card>

      {/* 1 · Committee */}
      <GuidedSection
        n={1}
        icon={Users}
        title="Interview committee"
        desc="Who will interview and score candidates?"
        done={setup.committee.length > 0}
      >
        <CommitteePicker
          reqId={reqId}
          existingUserIds={setup.committee.map((m) => m.userId)}
        />
        <div className="mt-3 space-y-2">
          {setup.committee.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-sm text-slate-400">
              No committee members yet — search and add interviewers above.
            </p>
          ) : (
            setup.committee.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
              >
                <Avatar name={m.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {m.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {[m.designation, m.department].filter(Boolean).join(' · ') ||
                      m.employeeCode}
                  </p>
                </div>
                <Badge tone="neutral">{m.role}</Badge>
                <button
                  type="button"
                  title="Remove from committee"
                  onClick={() => removeMember.mutate(m.id)}
                  className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </GuidedSection>

      {/* 2 · Assessment plan */}
      <GuidedSection
        n={2}
        icon={ListChecks}
        title="Assessment plan"
        desc="Pick what candidates will be assessed on."
        done={setup.plan.length > 0}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {ASSESSMENT_TYPES.map((t) => {
            const on = planTypes.has(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => togglePlan(t.key)}
                disabled={setPlan.isPending}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                  on
                    ? 'border-brand-300 bg-brand-50/70 ring-1 ring-brand-200'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                    on
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-slate-300 text-transparent',
                  )}
                >
                  <Check className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {t.label}
                    </span>
                    <Badge tone={on ? 'brand' : 'neutral'}>{t.mode}</Badge>
                  </span>
                  <span className="block text-xs text-slate-400">{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </GuidedSection>

      {/* 3 · Rubric */}
      <GuidedSection
        n={3}
        icon={ClipboardCheck}
        title="Scoring rubric"
        desc="Criteria each committee member scores a candidate on."
        done={setup.rubric.length > 0}
      >
        <RubricEditor reqId={reqId} criteria={setup.rubric} />
      </GuidedSection>

      {/* 4 · AI interview questions */}
      <GuidedSection
        n={4}
        icon={MessageSquareText}
        title="AI interview questions"
        desc="Role-specific questions for the panel — shown to interviewers in My Interviews."
        done={questions.length > 0}
      >
        <QuestionsBlock
          reqId={reqId}
          questions={questions}
          aiEnabled={Boolean(setup.aiEnabled)}
        />
      </GuidedSection>

      <ExamBankModal
        reqId={reqId}
        open={examOpen}
        onClose={() => setExamOpen(false)}
      />
    </div>
  );
}

/** Group questions by category for display. */
function groupQuestions(questions: InterviewQuestion[]) {
  const map = new Map<string, string[]>();
  for (const q of questions) {
    const arr = map.get(q.category) ?? [];
    arr.push(q.question);
    map.set(q.category, arr);
  }
  return [...map.entries()];
}

function QuestionsBlock({
  reqId,
  questions,
  aiEnabled,
}: {
  reqId: string;
  questions: InterviewQuestion[];
  aiEnabled: boolean;
}) {
  const generate = useGenerateQuestions(reqId);
  const groups = groupQuestions(questions);

  const copyAll = async () => {
    const text = groups
      .map(
        ([cat, qs]) =>
          `${cat}\n${qs.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}`,
      )
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    toast.success('Questions copied');
  };

  return (
    <div className="space-y-3">
      {questions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-sm text-slate-400">
          {aiEnabled
            ? 'Generate role-specific interview questions for the panel.'
            : 'AI is not configured — questions can’t be generated.'}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map(([category, qs]) => (
            <div key={category}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-600">
                {category}
              </p>
              <ul className="space-y-1">
                {qs.map((q, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-slate-600"
                  >
                    <span className="text-slate-300">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={questions.length > 0 ? 'outline' : 'primary'}
          isLoading={generate.isPending}
          disabled={!aiEnabled}
          leftIcon={<Sparkles className="h-4 w-4" />}
          onClick={() => generate.mutate(undefined)}
        >
          {questions.length > 0 ? 'Regenerate' : 'Generate questions'}
        </Button>
        {questions.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Copy className="h-4 w-4" />}
            onClick={copyAll}
          >
            Copy all
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  border,
}: {
  label: string;
  value: string | number;
  border?: boolean;
}) {
  return (
    <div className={cn('px-3 py-3', border && 'border-x border-slate-200')}>
      <p className="text-lg font-semibold text-slate-800">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

function GuidedSection({
  n,
  icon: Icon,
  title,
  desc,
  done,
  children,
}: {
  n: number;
  icon: React.ElementType;
  title: string;
  desc: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              done ? 'bg-emerald-500 text-white' : 'bg-brand-50 text-brand-700',
            )}
          >
            {done ? <Check className="h-4 w-4" /> : n}
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Icon className="h-4 w-4 text-brand-600" />
              {title}
            </h3>
            <p className="text-xs text-slate-400">{desc}</p>
          </div>
        </div>
        <div className="pl-11">{children}</div>
      </CardBody>
    </Card>
  );
}

function CommitteePicker({
  reqId,
  existingUserIds,
}: {
  reqId: string;
  existingUserIds: string[];
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
        placeholder="Search employees to add to the committee…"
        leftIcon={<Search className="h-4 w-4" />}
      />
      {open && debounced.length > 0 && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {results.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  if (e.userId) add.mutate({ memberUserId: e.userId });
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

function RubricEditor({
  reqId,
  criteria,
}: {
  reqId: string;
  criteria: RubricCriterionView[];
}) {
  const setRubric = useSetRubric(reqId);
  const [label, setLabel] = useState('');
  const [maxScore, setMaxScore] = useState('10');

  const persist = (next: { label: string; maxScore: number }[]) =>
    setRubric.mutate(next);

  const add = () => {
    if (label.trim().length < 1) return;
    persist([
      ...criteria.map((c) => ({ label: c.label, maxScore: c.maxScore })),
      { label: label.trim(), maxScore: Number(maxScore) || 10 },
    ]);
    setLabel('');
    setMaxScore('10');
  };

  const remove = (id: string) =>
    persist(
      criteria
        .filter((c) => c.id !== id)
        .map((c) => ({ label: c.label, maxScore: c.maxScore })),
    );

  const total = criteria.reduce((s, c) => s + c.maxScore, 0);

  return (
    <div>
      {criteria.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-sm text-slate-400">
          No criteria yet — add what committee members score (e.g. Technical,
          Communication).
        </p>
      ) : (
        <div className="space-y-1.5">
          {criteria.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            >
              <span className="flex-1 text-slate-700">{c.label}</span>
              <span className="text-xs font-medium text-slate-400">
                / {c.maxScore}
              </span>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <p className="pt-1 text-right text-xs font-medium text-slate-500">
            Total: {total} points
          </p>
        </div>
      )}
      <div className="mt-3 flex items-end gap-2">
        <Input
          label="Criterion"
          placeholder="e.g. Technical knowledge"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <div className="w-20 shrink-0">
          <Input
            label="Max"
            type="number"
            min={1}
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
          />
        </div>
        <Button
          onClick={add}
          isLoading={setRubric.isPending}
          disabled={label.trim().length < 1}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
