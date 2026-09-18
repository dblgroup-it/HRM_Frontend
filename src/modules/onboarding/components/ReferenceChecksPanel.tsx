import { useState } from 'react';
import { ExternalLink, Phone, Plus, Trash2, UserCheck } from 'lucide-react';

import {
  Badge,
  Button,
  Input,
  Modal,
  Spinner,
} from '@shared/components/ui';
import { resolveApiFileUrl } from '@shared/api';
import { cn } from '@shared/lib';

import { referenceCheckApi } from '../api/referenceCheck.api';
import {
  useDeleteReferenceCheck,
  useReferenceChecks,
  useSaveReferenceCheck,
} from '../hooks/useReferenceChecks';
import {
  RATING_QUESTIONS,
  scaleFor,
  type ReferenceCheck,
  type ReferenceCheckInput,
} from '../types/referenceCheck.types';

const EMPTY: ReferenceCheckInput = { refereeName: '', ratings: {} };

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

function toInput(rc: ReferenceCheck): ReferenceCheckInput {
  return {
    refereeName: rc.refereeName,
    refereeDesignation: rc.refereeDesignation ?? '',
    refereeOrganization: rc.refereeOrganization ?? '',
    refereeEmail: rc.refereeEmail ?? '',
    refereePhone: rc.refereePhone ?? '',
    knownDuration: rc.knownDuration ?? '',
    relationship: rc.relationship ?? '',
    strengths: rc.strengths ?? '',
    weaknesses: rc.weaknesses ?? '',
    ratings: { ...rc.ratings },
    handover: rc.handover ?? '',
    rehireEligible: rc.rehireEligible ?? '',
    concerns: rc.concerns ?? '',
    overallComments: rc.overallComments ?? '',
  };
}

/**
 * Pre-employment reference checks — DBL's paper form, filled in by the
 * recruiter on the call.
 *
 * One per referee, because that is how the form is written and how referees
 * are taken. The completed PDF is rendered on request, so what HR opens is
 * always what is on screen.
 */
export function ReferenceChecksPanel({
  candidateId,
  canEdit,
}: {
  candidateId: string;
  canEdit: boolean;
}) {
  const { data, isLoading } = useReferenceChecks(candidateId);
  const save = useSaveReferenceCheck(candidateId);
  const remove = useDeleteReferenceCheck(candidateId);
  const [editing, setEditing] = useState<{
    id?: string;
    input: ReferenceCheckInput;
  } | null>(null);

  const items = data?.items ?? [];

  const set = (patch: Partial<ReferenceCheckInput>) =>
    setEditing((e) => (e ? { ...e, input: { ...e.input, ...patch } } : e));

  const setRating = (key: string, value: string) =>
    setEditing((e) =>
      e
        ? {
            ...e,
            input: {
              ...e.input,
              // Clicking the chosen option again clears it — a rating given by
              // mistake should not be permanent.
              ratings: {
                ...e.input.ratings,
                ...(e.input.ratings?.[key] === value
                  ? { [key]: '' }
                  : { [key]: value }),
              },
            },
          }
        : e,
    );

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-slate-500">
          No reference checks recorded yet.
        </p>
      )}

      {items.map((rc) => (
        <div key={rc.id} className="rounded-xl border border-slate-200 p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {rc.refereeName}
                </span>
                {rc.refereeOrganization && (
                  <Badge tone="neutral">{rc.refereeOrganization}</Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {[rc.refereeDesignation, rc.relationship]
                  .filter(Boolean)
                  .join(' · ') || 'Referee'}
              </p>
              <p className="mt-1 text-[0.6875rem] text-slate-400">
                Checked by {rc.conductedByName} · {fmt(rc.conductedAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={resolveApiFileUrl(
                  referenceCheckApi.pdfPath(candidateId, rc.id),
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open form
              </a>
              {canEdit && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing({ id: rc.id, input: toInput(rc) })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    isLoading={remove.isPending}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => remove.mutate(rc.id)}
                  >
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>
          {(rc.strengths || rc.overallComments) && (
            <p className="mt-2 line-clamp-2 text-xs text-slate-600">
              {rc.overallComments || rc.strengths}
            </p>
          )}
        </div>
      ))}

      {canEdit && (
        <Button
          variant="outline"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setEditing({ input: { ...EMPTY, ratings: {} } })}
        >
          Add reference check
        </Button>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit reference check' : 'Reference check'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              isLoading={save.isPending}
              disabled={!editing?.input.refereeName?.trim()}
              leftIcon={<UserCheck className="h-4 w-4" />}
              onClick={() =>
                editing &&
                save.mutate(
                  { id: editing.id, input: editing.input },
                  { onSuccess: () => setEditing(null) },
                )
              }
            >
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500">
              DBL&rsquo;s pre-employment reference check. Fill it in as you speak
              to the referee — it prints on the company form.
            </p>

            <Section title="Referee">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Name of the referee"
                  value={editing.input.refereeName}
                  onChange={(e) => set({ refereeName: e.target.value })}
                />
                <Input
                  label="Designation"
                  value={editing.input.refereeDesignation ?? ''}
                  onChange={(e) => set({ refereeDesignation: e.target.value })}
                />
                <Input
                  label="Organization"
                  value={editing.input.refereeOrganization ?? ''}
                  onChange={(e) => set({ refereeOrganization: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={editing.input.refereeEmail ?? ''}
                  onChange={(e) => set({ refereeEmail: e.target.value })}
                />
                <Input
                  label="Telephone / Mobile"
                  leftIcon={<Phone className="h-4 w-4" />}
                  value={editing.input.refereePhone ?? ''}
                  onChange={(e) => set({ refereePhone: e.target.value })}
                />
              </div>
            </Section>

            <Section title="1 — Acquaintance">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="a) How long have you known the applicant?"
                  value={editing.input.knownDuration ?? ''}
                  onChange={(v) => set({ knownDuration: v })}
                  rows={2}
                />
                <Field
                  label="b) Your relationship with the applicant?"
                  value={editing.input.relationship ?? ''}
                  onChange={(v) => set({ relationship: v })}
                  rows={2}
                />
              </div>
            </Section>

            <Section title="2 — Observations">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="a) Strengths"
                  value={editing.input.strengths ?? ''}
                  onChange={(v) => set({ strengths: v })}
                />
                <Field
                  label="b) Weaknesses"
                  value={editing.input.weaknesses ?? ''}
                  onChange={(v) => set({ weaknesses: v })}
                />
              </div>
            </Section>

            <Section title="3 — Evaluation">
              <div className="space-y-2">
                {RATING_QUESTIONS.map((q) => (
                  <div
                    key={q.key}
                    className="grid items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 sm:grid-cols-[1fr_auto]"
                  >
                    <span className="text-xs text-slate-700">
                      <span className="mr-1.5 font-semibold text-slate-400">
                        {q.letter}
                      </span>
                      {q.text}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {scaleFor(q.key).map((opt) => {
                        const on = editing.input.ratings?.[q.key] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRating(q.key, opt.value)}
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors',
                              on
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="4–7 — In their words">
              <div className="space-y-3">
                <Field
                  label="4) Did the individual hand over their duties and financial accountabilities before leaving?"
                  value={editing.input.handover ?? ''}
                  onChange={(v) => set({ handover: v })}
                  rows={2}
                />
                <Field
                  label="5) Eligible for rehiring? If not, why not?"
                  value={editing.input.rehireEligible ?? ''}
                  onChange={(v) => set({ rehireEligible: v })}
                  rows={2}
                />
                <Field
                  label="6) Anything in their history (disciplinary or legal) that raises a question of employability?"
                  value={editing.input.concerns ?? ''}
                  onChange={(v) => set({ concerns: v })}
                  rows={2}
                />
                <Field
                  label="7) Overall comments"
                  value={editing.input.overallComments ?? ''}
                  onChange={(v) => set({ overallComments: v })}
                  rows={2}
                />
              </div>
            </Section>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
