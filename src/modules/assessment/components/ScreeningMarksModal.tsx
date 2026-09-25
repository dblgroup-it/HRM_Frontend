import { useEffect, useState, type ComponentType } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lock,
  Monitor,
  Save,
  Sparkles,
} from 'lucide-react';

import { Badge, Button, Modal, Spinner } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { AiProficiencyStep } from '@modules/aiProficiency';

import {
  useSaveScreeningTests,
  useScreeningTests,
} from '../hooks/useAssessment';
import { ExamSheetControl } from './ExamSheetControl';
import type {
  ScreeningTests,
  ScreeningTestsInput,
} from '../types/assessment.types';

type ManualKind = 'written' | 'computer';

/** What has been typed for one hand-marked test, before it is saved. */
interface Draft {
  total: string;
  obtained: string;
}

const num = (v: string) => (v.trim() === '' ? null : Number(v));

/**
 * Enter the hand-marked screening tests for one candidate.
 *
 * Opened from the first-interview worklist, so whoever ran the session can
 * type the marks while they have them. Head of Talent Acquisition decides
 * which tests apply; here you fill in what they turned on, and issue the AI
 * Proficiency link if that one applies.
 *
 * One save for everything. Each test used to carry its own Save button, so
 * typing both marks and pressing Done quietly threw the second one away. The
 * marks are now drafts until **Save all marks**, which sends every changed
 * test in one request; Skip / Require still apply at once, being a decision
 * about the test rather than a mark.
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

  const [drafts, setDrafts] = useState<Record<ManualKind, Draft>>({
    written: { total: '', obtained: '' },
    computer: { total: '', obtained: '' },
  });
  // Seeded once, when the marks first load. Not again: a Skip on another
  // test, or a live refresh, returns fresh data, and re-seeding then would
  // wipe marks typed here but not yet saved. Saving closes the dialog.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!data || seeded) return;
    setSeeded(true);
    setDrafts({
      written: {
        total: data.writtenTestTotal?.toString() ?? '',
        obtained: data.writtenTestObtained?.toString() ?? '',
      },
      computer: {
        total: data.computerTestTotal?.toString() ?? '',
        obtained: data.computerTestObtained?.toString() ?? '',
      },
    });
  }, [data, seeded]);

  const saved = (k: ManualKind) =>
    k === 'written'
      ? {
          total: data?.writtenTestTotal ?? null,
          obtained: data?.writtenTestObtained ?? null,
        }
      : {
          total: data?.computerTestTotal ?? null,
          obtained: data?.computerTestObtained ?? null,
        };
  const enabled = (k: ManualKind) =>
    k === 'written'
      ? Boolean(data?.writtenTestEnabled)
      : Boolean(data?.computerTestEnabled);
  const locked = (k: ManualKind) =>
    k === 'written'
      ? Boolean(data?.writtenTestLocked)
      : Boolean(data?.computerTestLocked);

  const kinds: ManualKind[] = ['written', 'computer'];
  const changed = kinds.filter((k) => {
    if (!enabled(k) || locked(k)) return false;
    const d = drafts[k];
    const sv = saved(k);
    return num(d.total) !== sv.total || num(d.obtained) !== sv.obtained;
  });
  const invalid = kinds.some((k) => {
    const d = drafts[k];
    const t = num(d.total);
    const o = num(d.obtained);
    return (
      (t != null && (Number.isNaN(t) || t < 0)) ||
      (o != null && (Number.isNaN(o) || o < 0)) ||
      (t != null && o != null && o > t)
    );
  });

  const saveAll = () => {
    if (!changed.length) {
      onClose();
      return;
    }
    const patch: ScreeningTestsInput = {};
    for (const k of changed) {
      const d = drafts[k];
      if (k === 'written') {
        patch.writtenTestTotal = num(d.total);
        patch.writtenTestObtained = num(d.obtained);
      } else {
        patch.computerTestTotal = num(d.total);
        patch.computerTestObtained = num(d.obtained);
      }
    }
    save.mutate(patch, { onSuccess: onClose });
  };

  const close = () => {
    if (
      changed.length &&
      !window.confirm('Close without saving the marks you typed?')
    )
      return;
    onClose();
  };

  return (
    <Modal
      open
      onClose={close}
      size="lg"
      title={`Test marks — ${candidate.name}`}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {invalid
              ? 'Obtained can’t be more than the total.'
              : changed.length
                ? `${changed.length} test${changed.length === 1 ? '' : 's'} with unsaved marks`
                : 'Marks feed the pass/fail gate Head of Talent Acquisition sees.'}
          </span>
          <div className="flex gap-2">
            {changed.length > 0 && (
              <Button variant="ghost" size="sm" onClick={close}>
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              disabled={invalid}
              isLoading={save.isPending}
              leftIcon={
                changed.length ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )
              }
              onClick={saveAll}
            >
              {changed.length ? 'Save all marks' : 'Done'}
            </Button>
          </div>
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
            icon={FileText}
            badge="bg-sky-600"
            candidateId={candidate.id}
            kind="written"
            sheetUrl={data.writtenTestSheetUrl}
            locked={data.writtenTestLocked}
            passPct={data.writtenTestPassPct}
            enabled={data.writtenTestEnabled}
            draft={drafts.written}
            dirty={changed.includes('written')}
            saving={save.isPending}
            onDraft={(d) => setDrafts((cur) => ({ ...cur, written: d }))}
            onToggle={(on) => save.mutate({ writtenTestEnabled: on })}
          />
          <ManualTest
            label="Computer Literacy"
            icon={Monitor}
            badge="bg-indigo-600"
            candidateId={candidate.id}
            kind="computer"
            sheetUrl={data.computerTestSheetUrl}
            locked={data.computerTestLocked}
            passPct={data.computerTestPassPct}
            enabled={data.computerTestEnabled}
            draft={drafts.computer}
            dirty={changed.includes('computer')}
            saving={save.isPending}
            onDraft={(d) => setDrafts((cur) => ({ ...cur, computer: d }))}
            onToggle={(on) => save.mutate({ computerTestEnabled: on })}
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
  passPct: number
): {
  label: string;
  tone: 'success' | 'danger' | 'neutral';
  pct: number;
} | null {
  if (total == null || obtained == null || total <= 0) return null;
  if (obtained < 0 || obtained > total) return null;
  const pct = (obtained / total) * 100;
  return pct >= passPct
    ? { label: `Pass · ${pct.toFixed(0)}%`, tone: 'success', pct }
    : { label: `Fail · ${pct.toFixed(0)}%`, tone: 'danger', pct };
}

/** One hand-marked test: a draft the modal saves with the others. */
function ManualTest({
  label,
  icon: Icon,
  badge,
  candidateId,
  kind,
  sheetUrl,
  locked,
  passPct,
  enabled,
  draft,
  dirty,
  saving,
  onDraft,
  onToggle,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge: string;
  candidateId: string;
  kind: ManualKind;
  sheetUrl: string | null;
  /** Already marked once from here — see screening-lock.ts on the server. */
  locked: boolean;
  passPct: number;
  enabled: boolean;
  draft: Draft;
  dirty: boolean;
  saving: boolean;
  onDraft: (d: Draft) => void;
  onToggle: (on: boolean) => void;
}) {
  const t = num(draft.total);
  const o = num(draft.obtained);
  const overMax = t != null && o != null && o > t;
  // Worked out from what is typed, so the result shows before saving.
  const result = verdict(t, o, passPct);

  if (!enabled) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3.5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="text-xs text-slate-400">Skipped for this candidate.</p>
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

  const field =
    'w-20 rounded-lg border bg-white px-2.5 py-2 text-center text-lg font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500';

  return (
    <div
      className={cn(
        'rounded-xl border bg-white px-4 py-3.5 shadow-card transition-colors',
        dirty ? 'border-brand-300 ring-1 ring-brand-100' : 'border-slate-200'
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white',
            badge
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-xs text-slate-400">Pass mark {passPct}%</p>
        </div>
        {dirty && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.625rem] font-semibold text-brand-700">
            Unsaved
          </span>
        )}
        {result && <Badge tone={result.tone}>{result.label}</Badge>}
        {/* Not every candidate needs every test — the panel decides on the
            day. Marks are kept, so switching back restores them. */}
        <button
          type="button"
          disabled={saving || locked}
          onClick={() => onToggle(false)}
          className="rounded-lg px-2 py-0.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        >
          Skip
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-slate-500">
              Obtained
            </span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={draft.obtained}
              disabled={locked}
              onChange={(e) => onDraft({ ...draft, obtained: e.target.value })}
              className={cn(
                field,
                overMax
                  ? 'border-rose-300 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-brand-400 focus:ring-brand-100'
              )}
            />
          </label>
          <span className="pb-2 text-xl font-light text-slate-300">/</span>
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-slate-500">
              Total
            </span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={draft.total}
              disabled={locked}
              onChange={(e) => onDraft({ ...draft, total: e.target.value })}
              className={cn(
                field,
                'border-slate-200 focus:border-brand-400 focus:ring-brand-100'
              )}
            />
          </label>
        </div>

        {/* The score against the pass line, as it is typed. */}
        <div className="min-w-[10rem] flex-1">
          <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                result?.tone === 'success'
                  ? 'bg-emerald-500'
                  : result?.tone === 'danger'
                    ? 'bg-rose-500'
                    : 'bg-slate-200'
              )}
              style={{ width: `${Math.min(100, result?.pct ?? 0)}%` }}
            />
            <span
              aria-hidden
              className="absolute inset-y-0 w-0.5 bg-slate-500/60"
              style={{ left: `${passPct}%` }}
            />
          </div>
          <p className="mt-1 text-[0.6875rem] text-slate-400">
            {result
              ? `${result.pct.toFixed(0)}% · pass line at ${passPct}%`
              : 'Enter obtained and total marks'}
          </p>
        </div>
      </div>

      {overMax && (
        <p className="mt-1.5 text-xs text-rose-600">
          Obtained can&rsquo;t be more than the total.
        </p>
      )}

      {locked && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
          <Lock className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
          Marks are entered once from here. Ask Corporate HR if a correction is
          needed.
        </p>
      )}

      {/* The marked script. Whoever may enter the mark may attach it, and
          Corporate HR sees it beside the mark on their own panel. */}
      <ExamSheetControl
        candidateId={candidateId}
        kind={kind}
        sheetUrl={sheetUrl}
        canEdit
        className="mt-3 border-t border-slate-100 pt-2.5"
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
    data.aiTestPassPct
  );

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            AI Proficiency Test
          </p>
          <p className="text-xs text-slate-400">
            Online, marked automatically · pass mark {data.aiTestPassPct}%
          </p>
        </div>
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
