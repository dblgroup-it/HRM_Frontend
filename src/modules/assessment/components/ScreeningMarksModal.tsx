import { useEffect, useState } from 'react';
import { ClipboardCheck, Sparkles } from 'lucide-react';

import { Badge, Button, Modal, Spinner } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { AiProficiencyStep } from '@modules/aiProficiency';

import {
  useSaveScreeningTests,
  useScreeningTests,
} from '../hooks/useAssessment';
import { ExamSheetControl } from './ExamSheetControl';
import type { ScreeningTests } from '../types/assessment.types';

/**
 * Enter the hand-marked screening tests for one candidate.
 *
 * Opened from the first-interview worklist, so whoever ran the session can
 * type the marks while they have them. Head of Talent Acquisition decides which tests apply
 * (Requisition → Pre-Interview Screening Tests); here you fill in what they
 * turned on, and issue the AI Proficiency link if that one applies.
 */
export function ScreeningMarksModal({
  candidate,
  onClose,
}: {
  candidate: { id: string; name: string };
  onClose: () => void;
}) {
  const { data, isLoading, isError, error } = useScreeningTests(candidate.id);
  const save = useSaveScreeningTests(candidate.id);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Test marks — ${candidate.name}`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            Marks feed the pass/fail gate Head of Talent Acquisition sees.
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
          {(error as Error).message}
        </p>
      ) : data ? (
        <div className="space-y-3">
          <ManualTest
            label="Written Test"
            candidateId={candidate.id}
            kind="written"
            sheetUrl={data.writtenTestSheetUrl}
            passPct={data.writtenTestPassPct}
            enabled={data.writtenTestEnabled}
            total={data.writtenTestTotal}
            obtained={data.writtenTestObtained}
            saving={save.isPending}
            onToggle={(on) => save.mutate({ writtenTestEnabled: on })}
            onSave={(patch) =>
              save.mutate({
                writtenTestTotal: patch.total,
                writtenTestObtained: patch.obtained,
              })
            }
          />
          <ManualTest
            label="Computer Literacy"
            candidateId={candidate.id}
            kind="computer"
            sheetUrl={data.computerTestSheetUrl}
            passPct={data.computerTestPassPct}
            enabled={data.computerTestEnabled}
            total={data.computerTestTotal}
            obtained={data.computerTestObtained}
            saving={save.isPending}
            onToggle={(on) => save.mutate({ computerTestEnabled: on })}
            onSave={(patch) =>
              save.mutate({
                computerTestTotal: patch.total,
                computerTestObtained: patch.obtained,
              })
            }
          />
          <AiTestPanel
            candidateId={candidate.id}
            data={data}
            saving={save.isPending}
            onToggle={(on) => save.mutate({ aiTestEnabled: on })}
          />
        </div>
      ) : null}
    </Modal>
  );
}

function verdict(
  total: number | null,
  obtained: number | null,
  passPct: number,
): { label: string; tone: 'success' | 'danger' | 'neutral' } | null {
  if (total == null || obtained == null || total <= 0) return null;
  if (obtained < 0 || obtained > total) return null;
  const pct = (obtained / total) * 100;
  return pct >= passPct
    ? { label: `Pass · ${pct.toFixed(0)}%`, tone: 'success' }
    : { label: `Fail · ${pct.toFixed(0)}%`, tone: 'danger' };
}

function ManualTest({
  label,
  candidateId,
  kind,
  sheetUrl,
  passPct,
  enabled,
  total,
  obtained,
  saving,
  onToggle,
  onSave,
}: {
  label: string;
  candidateId: string;
  kind: 'written' | 'computer';
  sheetUrl: string | null;
  passPct: number;
  enabled: boolean;
  total: number | null;
  obtained: number | null;
  saving: boolean;
  onToggle: (on: boolean) => void;
  onSave: (patch: { total: number | null; obtained: number | null }) => void;
}) {
  const [t, setT] = useState(total?.toString() ?? '');
  const [o, setO] = useState(obtained?.toString() ?? '');

  // Keep in step with a save that came back, or with another tab's edit.
  useEffect(() => setT(total?.toString() ?? ''), [total]);
  useEffect(() => setO(obtained?.toString() ?? ''), [obtained]);

  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  const dirty =
    num(t) !== (total ?? null) || num(o) !== (obtained ?? null);
  const parsedTotal = num(t);
  const parsedObtained = num(o);
  const overMax =
    parsedTotal != null &&
    parsedObtained != null &&
    parsedObtained > parsedTotal;
  const result = verdict(total, obtained, passPct);

  if (!enabled) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-400">
            Skipped for this candidate.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => onToggle(true)}
        >
          Require
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">
          {label}{' '}
          <span className="font-normal text-slate-400">pass ≥ {passPct}%</span>
        </p>
        <div className="flex items-center gap-2">
          {result && <Badge tone={result.tone}>{result.label}</Badge>}
          {/* Not every candidate needs every test — the panel decides on the
              day, so skipping is theirs to do rather than a round trip to
              Head of Talent Acquisition. Marks are kept, so switching back restores them. */}
          <button
            type="button"
            disabled={saving}
            onClick={() => onToggle(false)}
            className="rounded-lg px-2 py-0.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[0.6875rem] font-medium text-slate-500">
            Total marks
          </span>
          <input
            type="number"
            min={0}
            value={t}
            onChange={(e) => setT(e.target.value)}
            className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm tabular-nums focus:border-brand-400 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.6875rem] font-medium text-slate-500">
            Obtained
          </span>
          <input
            type="number"
            min={0}
            value={o}
            onChange={(e) => setO(e.target.value)}
            className={cn(
              'w-24 rounded-lg border px-2.5 py-1.5 text-sm tabular-nums focus:outline-none',
              overMax
                ? 'border-rose-300 focus:border-rose-400'
                : 'border-slate-200 focus:border-brand-400',
            )}
          />
        </label>
        <Button
          size="sm"
          className="mb-0.5"
          disabled={!dirty || overMax || saving}
          isLoading={saving}
          onClick={() => onSave({ total: parsedTotal, obtained: parsedObtained })}
        >
          Save
        </Button>
      </div>

      {overMax && (
        <p className="mt-1.5 text-xs text-rose-600">
          Obtained can't be more than the total.
        </p>
      )}

      {/* The marked script. Whoever may enter the mark may attach it, and
          Corporate HR sees it beside the mark on their own panel. */}
      <ExamSheetControl
        candidateId={candidateId}
        kind={kind}
        sheetUrl={sheetUrl}
        canEdit
        className="mt-2.5 border-t border-slate-100 pt-2.5"
      />
    </div>
  );
}

/**
 * The AI Proficiency test, configured from here.
 *
 * It is an online test, so there is nothing to type in — the work is issuing
 * the link, and whoever runs the first interview needs to be able to do that
 * themselves rather than waiting on Head of Talent Acquisition. The result comes back
 * scored, and shows here beside the hand-marked ones.
 */
function AiTestPanel({
  candidateId,
  data,
  saving,
  onToggle,
}: {
  candidateId: string;
  data: ScreeningTests;
  saving: boolean;
  onToggle: (on: boolean) => void;
}) {
  const result = verdict(
    data.aiTestTotal,
    data.aiTestObtained,
    data.aiTestPassPct,
  );

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          AI Proficiency Test{' '}
          <span className="font-normal text-slate-400">
            pass ≥ {data.aiTestPassPct}%
          </span>
        </p>
        <div className="flex items-center gap-2">
          {result ? (
            <Badge tone={result.tone}>{result.label}</Badge>
          ) : data.aiTestEnabled ? (
            <Badge tone="neutral">
              <ClipboardCheck className="mr-1 h-3 w-3" /> Not taken yet
            </Badge>
          ) : (
            <Badge tone="neutral">Skipped</Badge>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => onToggle(!data.aiTestEnabled)}
            className="rounded-lg px-2 py-0.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            {data.aiTestEnabled ? 'Skip' : 'Require'}
          </button>
        </div>
      </div>

      {data.aiTestEnabled ? (
        <div className="mt-2.5 rounded-lg bg-white p-2.5 ring-1 ring-violet-100">
          <AiProficiencyStep candidateId={candidateId} jobGrade={null} />
        </div>
      ) : (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Skipped for this candidate — no online test will be issued.
        </p>
      )}
    </div>
  );
}
