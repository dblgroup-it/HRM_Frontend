import { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Lock,
  MapPin,
  MessageSquareText,
  Video,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  FullPageSpinner,
  Input,
  PageHeader,
  Textarea,
} from '@shared/components/ui';
import { formatDate } from '@shared/utils';

import { useMyInterviews, useSubmitEvaluation } from '../hooks/useAssessment';
import type {
  InterviewQuestion,
  MyInterviewRound,
} from '../types/assessment.types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function MyInterviewsPage() {
  const { data: rounds = [], isLoading } = useMyInterviews();

  if (isLoading) return <FullPageSpinner label="Loading your interviews…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Interviews"
        description="Candidates you're on the panel for — score each against the rubric."
      />
      {rounds.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title="No interviews assigned"
          description="When Corporate HR adds you to an interview panel, candidates appear here for you to mark."
        />
      ) : (
        <div className="space-y-4">
          {rounds.map((r) => (
            <InterviewMarkCard key={r.id} round={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function InterviewMarkCard({ round }: { round: MyInterviewRound }) {
  const submit = useSubmitEvaluation();
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of round.rubric) {
      init[c.id] =
        round.myEvaluation?.scores?.[c.id] !== undefined
          ? String(round.myEvaluation.scores[c.id])
          : '';
    }
    return init;
  });
  const [comments, setComments] = useState(round.myEvaluation?.comments ?? '');

  const total = round.rubric.reduce(
    (s, c) => s + (Number(scores[c.id]) || 0),
    0,
  );
  const maxTotal = round.rubric.reduce((s, c) => s + c.maxScore, 0);
  const marked = Boolean(round.myEvaluation);

  const save = () => {
    const numScores: Record<string, number> = {};
    for (const c of round.rubric) numScores[c.id] = Number(scores[c.id]) || 0;
    submit.mutate({ roundId: round.id, input: { scores: numScores, comments } });
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">{round.candidate.name}</p>
            <p className="text-sm text-slate-500">
              {round.requisition.designation} · {round.requisition.code} ·{' '}
              {round.requisition.unit}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">
              {cap(round.kind)} · {cap(round.mode)}
            </Badge>
            {marked && (
              <Badge tone="success">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Marked
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            {round.scheduledAt ? formatDate(round.scheduledAt) : 'Time TBD'}
          </span>
          {round.meetLink ? (
            <a
              href={round.meetLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:underline"
            >
              <Video className="h-3.5 w-3.5" /> Join Google Meet
            </a>
          ) : (
            round.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {round.location}
              </span>
            )
          )}
        </div>

        {(round.interviewQuestions?.length ?? 0) > 0 && (
          <QuestionsHint questions={round.interviewQuestions} />
        )}

        {round.rubric.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            No rubric set for this position yet — ask Corporate HR to add scoring
            criteria.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {round.rubric.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-slate-700">{c.label}</span>
                  <div className="w-24">
                    <Input
                      type="number"
                      min={0}
                      max={c.maxScore}
                      disabled={marked}
                      value={scores[c.id]}
                      onChange={(e) =>
                        setScores((p) => ({ ...p, [c.id]: e.target.value }))
                      }
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-slate-400">
                    / {c.maxScore}
                  </span>
                </div>
              ))}
            </div>
            <Textarea
              label="Comments"
              rows={2}
              disabled={marked}
              placeholder="Overall impression, strengths, concerns…"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Total: {total} / {maxTotal}
              </span>
              {marked ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <Lock className="h-3.5 w-3.5" /> Submitted — marks locked
                </span>
              ) : (
                <Button onClick={save} isLoading={submit.isPending}>
                  Submit marks
                </Button>
              )}
            </div>
            {!marked && (
              <p className="text-xs text-slate-400">
                Marks are final once submitted and can&rsquo;t be changed —
                please review before submitting.
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function QuestionsHint({ questions }: { questions: InterviewQuestion[] }) {
  const [open, setOpen] = useState(false);
  const groups = new Map<string, string[]>();
  for (const q of questions) {
    const a = groups.get(q.category) ?? [];
    a.push(q.question);
    groups.set(q.category, a);
  }
  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-violet-700"
      >
        <span className="flex items-center gap-1.5">
          <MessageSquareText className="h-4 w-4" /> Suggested interview questions (
          {questions.length})
        </span>
        <ChevronDown
          className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-3">
          {[...groups.entries()].map(([cat, qs]) => (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">
                {cat}
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {qs.map((q, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-slate-600">
                    <span className="text-slate-300">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
