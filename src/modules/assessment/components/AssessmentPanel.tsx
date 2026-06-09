import { useState } from 'react';
import {
  Check,
  ClipboardCheck,
  FileQuestion,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
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
  useRemoveCommitteeMember,
  useSetPlan,
  useSetRubric,
} from '../hooks/useAssessment';
import type {
  AssessmentTypeKey,
  RubricCriterionView,
} from '../types/assessment.types';
import { ExamBankModal } from './ExamBankModal';

const ASSESSMENT_TYPES: {
  key: AssessmentTypeKey;
  label: string;
  mode: string;
}[] = [
  { key: 'written', label: 'Written exam', mode: 'Online' },
  { key: 'excel', label: 'Excel exam', mode: 'Online' },
  { key: 'skill', label: 'Skill / technical test', mode: 'Offline' },
  { key: 'viva', label: 'Viva (interview)', mode: 'Physical' },
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

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-brand-600" />
          Assessment &amp; Interview Committee
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<FileQuestion className="h-4 w-4" />}
          onClick={() => setExamOpen(true)}
        >
          Exam questions
        </Button>
      </CardHeader>
      <CardBody className="space-y-6">
        {/* Assessment plan */}
        <div>
          <SectionLabel>Assessment plan</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {ASSESSMENT_TYPES.map((t) => {
              const on = planTypes.has(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => togglePlan(t.key)}
                  disabled={setPlan.isPending}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition',
                    on
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {t.label}
                  <span className="text-[10px] uppercase tracking-wide opacity-60">
                    {t.mode}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Committee */}
        <div>
          <SectionLabel>
            <Users className="mr-1 inline h-3.5 w-3.5" />
            Interview committee
          </SectionLabel>
          <CommitteePicker
            reqId={reqId}
            existingUserIds={setup.committee.map((m) => m.userId)}
          />
          <div className="mt-3 space-y-2">
            {setup.committee.length === 0 ? (
              <p className="text-sm text-slate-400">
                No committee members yet — search and add interviewers above.
              </p>
            ) : (
              setup.committee.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
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
        </div>

        {/* Rubric */}
        <div>
          <SectionLabel>Interview rubric (scoring criteria)</SectionLabel>
          <RubricEditor reqId={reqId} criteria={setup.rubric} />
        </div>
      </CardBody>

      <ExamBankModal
        reqId={reqId}
        open={examOpen}
        onClose={() => setExamOpen(false)}
      />
    </Card>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </p>
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

  return (
    <div>
      {criteria.length === 0 ? (
        <p className="text-sm text-slate-400">
          No criteria yet — add what committee members will score (e.g. Technical,
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
              <span className="text-xs text-slate-400">/ {c.maxScore}</span>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-end gap-2">
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
