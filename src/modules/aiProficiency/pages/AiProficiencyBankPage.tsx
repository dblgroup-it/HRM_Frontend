import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Pencil, Plus, Search, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  FullPageSpinner,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useDebounce } from '@shared/hooks';
import { JOB_GRADES } from '@modules/salaryFixation';
import { useMyPermissions } from '@modules/rbac';
import { canAccessRecruitment } from '@modules/candidates';

import {
  useAddQuestion,
  useAiProficiencyBank,
  useBulkAddQuestions,
  useBulkRemoveQuestions,
  useGenerateQuestions,
  useRemoveQuestion,
  useUpdateQuestion,
} from '../hooks/useAiProficiency';
import type {
  AddQuestionInput,
  AiProficiencyQuestion,
  GeneratedQuestion,
} from '../types/aiProficiency.types';

const OPTION_LETTER_TONE = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

export default function AiProficiencyBankPage() {
  const { data: perms, isLoading: permsLoading } = useMyPermissions();

  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AiProficiencyQuestion | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useAiProficiencyBank({
    search: debouncedSearch || undefined,
    grade: grade || undefined,
    page,
  });
  const remove = useRemoveQuestion();
  const bulkRemove = useBulkRemoveQuestions();

  const questions = data?.questions ?? [];
  const allSelected = questions.length > 0 && questions.every((q) => selected.has(q.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(questions.map((q) => q.id)));

  const runBulkDelete = () => {
    bulkRemove.mutate([...selected], {
      onSuccess: () => {
        setSelected(new Set());
        setConfirmDelete(false);
      },
    });
  };

  if (permsLoading) return <FullPageSpinner label="Loading…" />;

  if (!canAccessRecruitment(perms)) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI Proficiency Question Bank" />
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="Access restricted"
          description="The AI Proficiency question bank is available to Head of Talent Acquisition, CHRO and super users only."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Proficiency Question Bank"
        description="A global pool of MCQ questions tagged by job grade — a random subset is shuffled per candidate for the pre-interview screening test."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Sparkles className="h-4 w-4 text-violet-500" />}
              onClick={() => setGenerateOpen(true)}
            >
              Generate with AI
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
              Add question
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search prompt text…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <Select
          className="w-40"
          value={grade}
          onChange={(e) => { setGrade(e.target.value); setPage(1); }}
          options={JOB_GRADES.map((g) => ({ value: g, label: g }))}
          placeholder="All grades"
        />
        {data && (
          <span className="ml-auto text-xs font-medium text-slate-400">
            {data.meta.total} question{data.meta.total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex animate-rise-in items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 shadow-sm [animation-duration:0.25s]">
          <span className="flex items-center gap-2 text-sm font-medium text-rose-800">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[0.625rem] font-bold text-white">
              {selected.size}
            </span>
            question{selected.size === 1 ? '' : 's'} selected
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
            >
              Clear
            </button>
            <Button size="sm" variant="danger" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirmDelete(true)}>
              Delete selected
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : questions.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="No questions found"
              description={search || grade ? 'Try a different search or grade filter.' : 'Add the first question to the bank.'}
            />
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {allSelected ? 'All selected' : 'Select all on this page'}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {questions.map((q, i) => (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    delay={i * 25}
                    selected={selected.has(q.id)}
                    onToggleSelect={() => toggle(q.id)}
                    onEdit={() => setEditing(q)}
                    onRemove={() => remove.mutate(q.id)}
                  />
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {data && data.meta.totalPages > 1 && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          pageSize={data.meta.pageSize}
          onPageChange={setPage}
        />
      )}

      <QuestionModal open={addOpen} onClose={() => setAddOpen(false)} />
      <QuestionModal open={editing !== null} onClose={() => setEditing(null)} question={editing} />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete selected questions?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" isLoading={bulkRemove.isPending} onClick={runBulkDelete}>
              Delete {selected.size}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-4.5 w-4.5" />
          </span>
          <p className="text-sm text-slate-600">
            This permanently removes {selected.size} question{selected.size === 1 ? '' : 's'} from the bank.
            Candidates with in-progress tests that already include these questions are unaffected.
          </p>
        </div>
      </Modal>
      <GenerateQuestionsModal open={generateOpen} onClose={() => setGenerateOpen(false)} />
    </div>
  );
}

function QuestionRow({
  question,
  delay = 0,
  selected,
  onToggleSelect,
  onEdit,
  onRemove,
}: {
  question: AiProficiencyQuestion;
  delay?: number;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        'flex animate-fade-in items-start gap-3 border-l-2 border-l-transparent px-5 py-4 opacity-0 transition-colors duration-150 [animation-fill-mode:forwards]',
        selected ? 'border-l-brand-500 bg-brand-50/40' : 'hover:bg-slate-50/70',
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{question.prompt}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {question.options.map((o, i) => (
            <span
              key={o}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2.5 text-xs',
                o === question.answer
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-medium'
                  : 'border-slate-200 text-slate-500',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.5625rem] font-bold',
                  o === question.answer
                    ? 'bg-emerald-500 text-white'
                    : OPTION_LETTER_TONE[i % OPTION_LETTER_TONE.length],
                )}
              >
                {o === question.answer ? <Check className="h-2.5 w-2.5" /> : String.fromCharCode(65 + i)}
              </span>
              {o}
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{question.marks} pt{question.marks !== 1 ? 's' : ''}</Badge>
          {question.grades.map((g) => (
            <Badge key={g} tone="brand">{g}</Badge>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-brand-50 hover:text-brand-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function QuestionModal({
  open,
  onClose,
  question,
}: {
  open: boolean;
  onClose: () => void;
  question?: AiProficiencyQuestion | null;
}) {
  const add = useAddQuestion();
  const update = useUpdateQuestion();
  const isEdit = Boolean(question);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState('');
  const [marks, setMarks] = useState('1');
  const [grades, setGrades] = useState<string[]>([]);

  const reset = () => {
    setPrompt('');
    setOptions(['', '', '', '']);
    setAnswer('');
    setMarks('1');
    setGrades([]);
  };

  useEffect(() => {
    if (open && question) {
      setPrompt(question.prompt);
      setOptions(question.options.length >= 2 ? question.options : [...question.options, '', '']);
      setAnswer(question.answer);
      setMarks(String(question.marks));
      setGrades(question.grades);
    } else if (open) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question?.id]);

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit =
    prompt.trim().length > 0 &&
    cleanOptions.length >= 2 &&
    answer.trim().length > 0 &&
    cleanOptions.includes(answer.trim()) &&
    grades.length > 0;

  const submit = () => {
    const input: AddQuestionInput = {
      prompt: prompt.trim(),
      options: cleanOptions,
      answer: answer.trim(),
      marks: Number(marks) || 1,
      grades,
    };
    if (isEdit && question) {
      update.mutate(
        { id: question.id, input },
        { onSuccess: () => { reset(); onClose(); } },
      );
    } else {
      add.mutate(input, {
        onSuccess: () => {
          reset();
          onClose();
        },
      });
    }
  };

  const pending = isEdit ? update.isPending : add.isPending;

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={isEdit ? 'Edit question' : 'Add question'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button disabled={!canSubmit} isLoading={pending} onClick={submit}>
            {isEdit ? 'Save changes' : 'Add question'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Prompt</label>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Question text…"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Options <span className="font-normal text-slate-400">(select the correct one)</span>
          </label>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnswer(o.trim())}
                  disabled={!o.trim()}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold disabled:opacity-30',
                    o.trim() && answer === o.trim()
                      ? 'border-emerald-400 bg-emerald-500 text-white'
                      : 'border-slate-200 text-slate-400',
                  )}
                >
                  {o.trim() && answer === o.trim() ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + i)}
                </button>
                <input
                  value={o}
                  onChange={(e) => {
                    const next = [...options];
                    const prevVal = next[i];
                    next[i] = e.target.value;
                    setOptions(next);
                    if (answer === prevVal) setAnswer(e.target.value.trim());
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setOptions([...options, ''])}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              + Add option
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Marks</label>
            <input
              type="number"
              min={1}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Applicable job grades</label>
          <div className="flex flex-wrap gap-1.5">
            {JOB_GRADES.map((g) => {
              const on = grades.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    setGrades((prev) => (on ? prev.filter((x) => x !== g) : [...prev, g]))
                  }
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium',
                    on
                      ? 'border-brand-500 bg-brand-600 text-white'
                      : 'border-slate-200 text-slate-600',
                  )}
                >
                  {on && <Check className="mr-1 inline h-3 w-3" />}
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function GenerateQuestionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const generate = useGenerateQuestions();
  const bulkAdd = useBulkAddQuestions();
  const [grade, setGrade] = useState('');
  const [count, setCount] = useState('10');
  const [topic, setTopic] = useState('');
  const [items, setItems] = useState<GeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const reset = () => {
    setGrade('');
    setCount('10');
    setTopic('');
    setItems([]);
    setSelected(new Set());
  };

  const close = () => {
    reset();
    onClose();
  };

  const runGenerate = () => {
    if (!grade || !count || Number(count) < 1) return;
    generate.mutate(
      { grade, count: Number(count), topic: topic.trim() || undefined },
      {
        onSuccess: (data) => {
          setItems(data.items);
          setSelected(new Set(data.items.map((_, i) => i)));
        },
      },
    );
  };

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const allSelected = items.length > 0 && selected.size === items.length;

  const addSelected = () => {
    const chosen = items.filter((_, i) => selected.has(i));
    if (chosen.length === 0) return;
    bulkAdd.mutate({ items: chosen }, { onSuccess: close });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Generate questions with AI"
      size="lg"
      footer={
        items.length === 0 ? (
          <>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button
              leftIcon={<Sparkles className="h-4 w-4" />}
              isLoading={generate.isPending}
              disabled={!grade || !count || Number(count) < 1}
              onClick={runGenerate}
            >
              Generate
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setItems([])}>Back</Button>
            <Button variant="outline" isLoading={generate.isPending} onClick={runGenerate}>
              Regenerate
            </Button>
            <Button
              isLoading={bulkAdd.isPending}
              disabled={selected.size === 0}
              onClick={addSelected}
            >
              Add {selected.size} to bank
            </Button>
          </>
        )
      }
    >
      {items.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Generates general MCQ questions calibrated to one job grade's seniority level, applicable
            across common requisition types — not tied to a single department.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Job grade</label>
              <Select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                options={JOB_GRADES.map((g) => ({ value: g, label: g }))}
                placeholder="Select grade…"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">How many</label>
              <input
                type="number"
                min={1}
                max={30}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Focus area <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. basic accounting, safety awareness, communication…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
      ) : (
        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{selected.size} of {items.length} selected · grade {grade}</span>
            <button
              type="button"
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(items.map((_, i) => i)))
              }
              className="font-medium text-brand-600 hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          {items.map((q, i) => (
            <label
              key={i}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                selected.has(i) ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200',
              )}
            >
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggle(i)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{q.prompt}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {q.options.map((o) => (
                    <span
                      key={o}
                      className={cn(
                        'rounded-full border px-2.5 py-0.5 text-xs',
                        o === q.answer
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-medium'
                          : 'border-slate-200 text-slate-500',
                      )}
                    >
                      {o === q.answer && <Check className="mr-1 inline h-3 w-3" />}
                      {o}
                    </span>
                  ))}
                </div>
                <div className="mt-2">
                  <Badge tone="neutral">{q.marks} pt{q.marks !== 1 ? 's' : ''}</Badge>
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
