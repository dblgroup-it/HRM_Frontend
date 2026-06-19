import { useState } from 'react';
import {
  BarChart3,
  Check,
  ClipboardCheck,
  Copy,
  FileQuestion,
  ListChecks,
  MessageSquareText,
  RefreshCw,
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
  useScorecard,
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
  color: string;
}[] = [
  { key: 'written', label: 'Written exam',     mode: 'Online',   hint: 'MCQ + written, AI-graded', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'excel',   label: 'Excel exam',       mode: 'Online',   hint: 'Spreadsheet skills',        color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { key: 'skill',   label: 'Skill / technical', mode: 'Offline',  hint: 'Hands-on test',            color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { key: 'viva',    label: 'Viva / interview',  mode: 'Physical', hint: 'Panel interview',           color: 'text-violet-600 bg-violet-50 border-violet-200' },
];

const STAGE_COLORS: Record<string, string> = {
  ai_shortlisted: 'bg-violet-100 text-violet-700',
  shortlisted:    'bg-sky-100 text-sky-700',
  interview:      'bg-amber-100 text-amber-700',
  final:          'bg-orange-100 text-orange-700',
  selected:       'bg-emerald-100 text-emerald-700',
  rejected:       'bg-rose-100 text-rose-500',
};

export function AssessmentPanel({ requisition }: { requisition: Requisition }) {
  const reqId = requisition.id;
  const { data: setup, isLoading } = useAssessmentSetup(reqId);
  const setPlan = useSetPlan(reqId);
  const removeMember = useRemoveCommitteeMember(reqId);
  const [examOpen, setExamOpen] = useState(false);

  if (isLoading || !setup) {
    return (
      <Card>
        <CardBody className="flex justify-center py-12">
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

  const questions = setup.interviewQuestions ?? [];

  return (
    <div className="space-y-4">

      {/* ── Top stat strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Committee',       value: setup.committee.length, icon: Users,         ok: setup.committee.length > 0 },
          { label: 'Assessment types', value: setup.plan.length,      icon: ListChecks,    ok: setup.plan.length > 0 },
          { label: 'Rubric criteria',  value: setup.rubric.length,    icon: ClipboardCheck,ok: setup.rubric.length > 0 },
          { label: 'AI questions',     value: questions.length,        icon: MessageSquareText, ok: questions.length > 0 },
        ].map(({ label, value, icon: Icon, ok }) => (
          <div
            key={label}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3',
              ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white',
            )}
          >
            <span className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              ok ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400',
            )}>
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className={cn('text-lg font-bold leading-none', ok ? 'text-emerald-700' : 'text-slate-700')}>{value}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
            </div>
            {ok && <Check className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
          </div>
        ))}
      </div>

      {/* ── Row 1: Committee + Assessment plan ───────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Committee */}
        <Card>
          <CardBody className="space-y-3">
            <SectionHead icon={Users} title="Interview committee" />
            <CommitteePicker
              reqId={reqId}
              existingUserIds={setup.committee.map((m) => m.userId)}
            />
            <div className="space-y-2">
              {setup.committee.length === 0 ? (
                <EmptyHint>Search and add interviewers above.</EmptyHint>
              ) : (
                setup.committee.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                  >
                    <Avatar name={m.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{m.name}</p>
                      <p className="truncate text-[11px] text-slate-400">
                        {[m.designation, m.department].filter(Boolean).join(' · ') || m.employeeCode}
                      </p>
                    </div>
                    <Badge tone="neutral">{m.role}</Badge>
                    <button
                      type="button"
                      title="Remove"
                      onClick={() => removeMember.mutate(m.id)}
                      className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        {/* Assessment plan */}
        <Card>
          <CardBody className="space-y-3">
            <SectionHead icon={ListChecks} title="Assessment plan" />
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
                      'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-150',
                      on
                        ? `${t.color} ring-1`
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <span className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      on ? 'border-current bg-current' : 'border-slate-300',
                    )}>
                      {on && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug">{t.label}</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">{t.hint}</span>
                    </span>
                    <span className={cn(
                      'ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                      on ? 'bg-white/60' : 'bg-slate-100 text-slate-400',
                    )}>
                      {t.mode}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Row 2: Rubric + AI Questions ─────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Scoring rubric */}
        <Card>
          <CardBody className="space-y-3">
            <SectionHead icon={ClipboardCheck} title="Scoring rubric" />
            <RubricEditor reqId={reqId} criteria={setup.rubric} />
          </CardBody>
        </Card>

        {/* AI interview questions */}
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionHead icon={MessageSquareText} title="AI interview questions" />
              <Button
                size="sm"
                variant="outline"
                leftIcon={<FileQuestion className="h-3.5 w-3.5" />}
                onClick={() => setExamOpen(true)}
              >
                Exam bank
              </Button>
            </div>
            <QuestionsBlock
              reqId={reqId}
              questions={questions}
              aiEnabled={Boolean(setup.aiEnabled)}
            />
          </CardBody>
        </Card>
      </div>

      {/* ── Candidate scorecard ───────────────────────────── */}
      <Card>
        <CardBody className="space-y-3">
          <SectionHead icon={BarChart3} title="Candidate scorecard" desc="CV match · exam · interview scores, normalised 0–100" />
          <ScorecardBlock reqId={reqId} />
        </CardBody>
      </Card>

      <ExamBankModal reqId={reqId} open={examOpen} onClose={() => setExamOpen(false)} />
    </div>
  );
}

/* ── Shared section header ─────────────────────────────── */
function SectionHead({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc?: string;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4 text-brand-600" />
        {title}
      </h3>
      {desc && <p className="mt-0.5 text-[11px] text-slate-400">{desc}</p>}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
      {children}
    </p>
  );
}

/* ── AI Questions block ────────────────────────────────── */
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
      .map(([cat, qs]) => `${cat}\n${qs.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    toast.success('Questions copied');
  };

  return (
    <div className="space-y-3">
      {questions.length === 0 ? (
        <EmptyHint>
          {aiEnabled
            ? 'Generate role-specific questions for the interview panel.'
            : 'AI is not configured — questions cannot be generated.'}
        </EmptyHint>
      ) : (
        <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
          {groups.map(([category, qs]) => (
            <div key={category}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-violet-600">
                {category}
              </p>
              <ul className="space-y-1">
                {qs.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600">
                    <span className="shrink-0 text-slate-300">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <Button
          size="sm"
          variant={questions.length > 0 ? 'outline' : 'primary'}
          isLoading={generate.isPending}
          disabled={!aiEnabled}
          leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          onClick={() => generate.mutate(undefined)}
        >
          {questions.length > 0 ? 'Regenerate' : 'Generate questions'}
        </Button>
        {questions.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Copy className="h-3.5 w-3.5" />}
            onClick={copyAll}
          >
            Copy all
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Scorecard ─────────────────────────────────────────── */
function ScoreBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-300">—</span>;
  const color =
    value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-semibold tabular-nums text-slate-600">
        {value}
      </span>
    </div>
  );
}

function ScorecardBlock({ reqId }: { reqId: string }) {
  const { data: rows, isLoading, refetch, isFetching } = useScorecard(reqId);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Spinner /></div>;
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyHint>
        No evaluated candidates yet — scores appear once candidates have been screened, examined, or interviewed.
      </EmptyHint>
    );
  }

  const examTypes = Array.from(new Set(rows.flatMap((r) => Object.keys(r.examScores)))).sort();
  const sorted = [...rows].sort((a, b) => (b.combined ?? -1) - (a.combined ?? -1));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
        >
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Candidate</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Stage</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">CV %</th>
              {examTypes.map((t) => (
                <th key={t} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 capitalize">{t}</th>
              ))}
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Interview</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Combined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {sorted.map((row, idx) => (
              <tr key={row.candidateId} className={cn('transition-colors hover:bg-slate-50/70', idx === 0 && 'bg-emerald-50/30')}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {idx === 0 && (
                      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">#1</span>
                    )}
                    <span className="max-w-[140px] truncate font-medium text-slate-800">{row.candidateName}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
                    STAGE_COLORS[row.stage] ?? 'bg-slate-100 text-slate-600',
                  )}>
                    {row.stage.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-2.5"><ScoreBar value={row.cvScore} /></td>
                {examTypes.map((t) => (
                  <td key={t} className="px-3 py-2.5"><ScoreBar value={row.examScores[t] ?? null} /></td>
                ))}
                <td className="px-3 py-2.5"><ScoreBar value={row.interviewAvg} /></td>
                <td className="px-3 py-2.5"><ScoreBar value={row.combined} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Committee picker ──────────────────────────────────── */
function CommitteePicker({ reqId, existingUserIds }: { reqId: string; existingUserIds: string[] }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(q, 300);
  const { data } = useEmployees({ search: debounced, page: 1, pageSize: 6 });
  const add = useAddCommitteeMember(reqId);

  const results = (data?.items ?? []).filter((e) => e.userId && !existingUserIds.includes(e.userId));

  return (
    <div className="relative">
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search and add committee members…"
        leftIcon={<Search className="h-4 w-4" />}
      />
      {open && debounced.length > 0 && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {results.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  if (e.userId) add.mutate({ memberUserId: e.userId });
                  setQ('');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
              >
                <Avatar name={e.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">{e.name}</span>
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

/* ── Rubric editor ─────────────────────────────────────── */
function RubricEditor({ reqId, criteria }: { reqId: string; criteria: RubricCriterionView[] }) {
  const setRubric = useSetRubric(reqId);
  const [label, setLabel] = useState('');
  const [maxScore, setMaxScore] = useState('10');

  const persist = (next: { label: string; maxScore: number }[]) => setRubric.mutate(next);

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
    persist(criteria.filter((c) => c.id !== id).map((c) => ({ label: c.label, maxScore: c.maxScore })));

  const total = criteria.reduce((s, c) => s + c.maxScore, 0);

  return (
    <div className="space-y-2">
      {criteria.length === 0 ? (
        <EmptyHint>No criteria yet — add what panelists score (e.g. Technical, Communication).</EmptyHint>
      ) : (
        <div className="space-y-1.5">
          {criteria.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-1.5 text-sm">
              <span className="flex-1 text-slate-700">{c.label}</span>
              <span className="text-xs font-semibold text-slate-400">/ {c.maxScore}</span>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="rounded p-0.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <p className="text-right text-[11px] font-semibold text-slate-400">Total: {total} pts</p>
        </div>
      )}
      <div className="flex items-end gap-2 pt-1">
        <Input
          placeholder="e.g. Technical knowledge"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <div className="w-20 shrink-0">
          <Input
            type="number"
            min={1}
            placeholder="Max"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
          />
        </div>
        <Button onClick={add} isLoading={setRubric.isPending} disabled={label.trim().length < 1}>
          Add
        </Button>
      </div>
    </div>
  );
}
