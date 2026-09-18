import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  RotateCcw,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { useMyPermissions } from '@modules/rbac';

import { onboardingApi } from '../api/onboarding.api';
import { canApproveMedical } from '../access';
import { MedicalExamDetail } from '../components/MedicalExamDetail';
import type { CmoDecision, MedicalApprovalRow } from '../types/onboarding.types';

type Filter = 'all' | 'cleared' | 'rejected';

/** What a pending decision is waiting on — the note the server will demand. */
interface PendingAction {
  decision: Exclude<CmoDecision, 'approve'>;
  ids: string[];
  /** For the dialog's wording; one name reads better than "1 candidate". */
  label: string;
}

/**
 * The Central Medical Officer's queue.
 *
 * Every finding an examining officer has made and nobody has confirmed. A
 * candidate sitting here is blocked — the appointment letter reads
 * `medicalStatus = cleared` — so the page is built to be worked through:
 * oldest first, filterable, selectable, one action for a whole selection.
 *
 * Overturning or sending back opens a dialog rather than relying on a note
 * field elsewhere on the page. The first version put the note only in the bulk
 * bar, so acting on a single row produced "give a reason" with nowhere to type
 * one — a dead end the server was right to enforce and the page gave no way out
 * of.
 */
export function MedicalApprovalsPage() {
  const { data: perms } = useMyPermissions();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');

  const allowed = canApproveMedical(perms);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['medical-approvals'],
    queryFn: () => onboardingApi.medicalApprovalQueue(),
    enabled: allowed,
  });

  const all = useMemo(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      total: all.length,
      fit: all.filter((r) => r.proposed === 'cleared').length,
      unfit: all.filter((r) => r.proposed === 'rejected').length,
    }),
    [all],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(
      (r) =>
        (filter === 'all' || r.proposed === filter) &&
        (!q ||
          r.candidateName.toLowerCase().includes(q) ||
          r.requisition.code.toLowerCase().includes(q) ||
          r.requisition.designation.toLowerCase().includes(q)),
    );
  }, [all, filter, search]);

  // Only rows currently on screen can be swept — selecting through a filter and
  // then acting on hidden rows is how people approve things they never saw.
  const visibleSelected = rows.filter((r) => selected.has(r.onboardingId));
  const allVisibleSelected =
    rows.length > 0 && visibleSelected.length === rows.length;

  const decide = useMutation({
    mutationFn: (input: {
      ids: string[];
      decision: CmoDecision;
      note?: string;
    }) =>
      onboardingApi.decideMedicalMany({
        onboardingIds: input.ids,
        decision: input.decision,
        note: input.note,
      }),
    onSuccess: (result) => {
      // Reported per record: another CMO may have taken a row a moment earlier,
      // and claiming a clean sweep would hide that.
      if (result.decided) toast.success(`${result.decided} decided`);
      if (result.skipped) {
        const first = result.results.find((r) => !r.ok)?.error;
        toast.warning(`${result.skipped} skipped${first ? ` — ${first}` : ''}`);
      }
      setSelected(new Set());
      setPending(null);
      setNote('');
      void qc.invalidateQueries({ queryKey: ['medical-approvals'] });
      void qc.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Could not apply the decision'),
  });

  if (!allowed) {
    return (
      <EmptyState
        title="Not available"
        description="Only the Central Medical Officer can approve medical findings."
      />
    );
  }

  const approve = (ids: string[]) => {
    if (ids.length) decide.mutate({ ids, decision: 'approve' });
  };

  const ask = (decision: PendingAction['decision'], rowsToAct: MedicalApprovalRow[]) => {
    if (!rowsToAct.length) return;
    setNote('');
    setPending({
      decision,
      ids: rowsToAct.map((r) => r.onboardingId),
      label:
        rowsToAct.length === 1
          ? rowsToAct[0].candidateName
          : `${rowsToAct.length} candidates`,
    });
  };

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medical Approvals"
        description="Findings recorded by examining officers, waiting on your confirmation. No candidate is cleared until you sign one off."
      />

      {/* Where the queue stands. Three numbers, not a dashboard — the unfit
          count is the one that changes how the list gets worked. */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Awaiting" value={counts.total} icon={Stethoscope} />
        <Stat label="Proposed fit" value={counts.fit} tone="ok" />
        <Stat label="Proposed unfit" value={counts.unfit} tone="alert" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[13rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, designation or requisition"
              className="pl-9"
            />
          </div>

          <div className="flex rounded-lg border border-slate-200 p-0.5">
            {(
              [
                ['all', `All ${counts.total}`],
                ['cleared', `Fit ${counts.fit}`],
                ['rejected', `Unfit ${counts.unfit}`],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors',
                  filter === value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Spinner className="h-4 w-4" />
            Loading the queue…
          </div>
        ) : isError ? (
          <div className="py-12">
            <EmptyState
              title="Could not load the queue"
              description="Something went wrong fetching submitted medicals. Try again."
            />
          </div>
        ) : all.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Nothing waiting"
              description="Every submitted medical finding has been dealt with."
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No matches"
              description="No submission matches this filter or search."
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 bg-slate-50/70 px-4 py-2.5">
              <Checkbox
                label=""
                checked={allVisibleSelected}
                onChange={() =>
                  setSelected(
                    allVisibleSelected
                      ? new Set()
                      : new Set(rows.map((r) => r.onboardingId)),
                  )
                }
              />
              <span className="text-xs font-medium text-slate-500">
                {visibleSelected.length
                  ? `${visibleSelected.length} selected`
                  : `Select all ${rows.length}`}
              </span>

              {visibleSelected.length > 0 && (
                <div className="ml-auto flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    isLoading={decide.isPending}
                    leftIcon={<Check className="h-3.5 w-3.5" />}
                    onClick={() => approve(visibleSelected.map((r) => r.onboardingId))}
                  >
                    Approve {visibleSelected.length}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => ask('reject', visibleSelected)}
                  >
                    Overturn
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={decide.isPending}
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    onClick={() => ask('return', visibleSelected)}
                  >
                    Send back
                  </Button>
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {rows.map((row) => (
                <Row
                  key={row.onboardingId}
                  row={row}
                  checked={selected.has(row.onboardingId)}
                  open={expanded.has(row.onboardingId)}
                  busy={decide.isPending}
                  onToggle={() => setSelected((p) => toggle(p, row.onboardingId))}
                  onExpand={() => setExpanded((p) => toggle(p, row.onboardingId))}
                  onApprove={() => approve([row.onboardingId])}
                  onReject={() => ask('reject', [row])}
                  onReturn={() => ask('return', [row])}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      <DecisionDialog
        pending={pending}
        note={note}
        busy={decide.isPending}
        onNote={setNote}
        onCancel={() => setPending(null)}
        onConfirm={() =>
          pending &&
          decide.mutate({
            ids: pending.ids,
            decision: pending.decision,
            note: note.trim(),
          })
        }
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'plain',
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: 'plain' | 'ok' | 'alert';
  icon?: typeof Stethoscope;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
        <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
      <p
        className={cn(
          'mt-1 text-[1.75rem] font-semibold leading-none tabular-nums',
          tone === 'ok' && 'text-emerald-600',
          tone === 'alert' && value > 0 ? 'text-rose-600' : '',
          tone === 'plain' && 'text-slate-900',
          tone === 'alert' && value === 0 && 'text-slate-300',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Row({
  row,
  checked,
  open,
  busy,
  onToggle,
  onExpand,
  onApprove,
  onReject,
  onReturn,
}: {
  row: MedicalApprovalRow;
  checked: boolean;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  onReturn: () => void;
}) {
  const fit = row.proposed === 'cleared';
  return (
    <div className={cn('transition-colors', checked && 'bg-brand-50/40')}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="pt-1">
          <Checkbox label="" checked={checked} onChange={onToggle} />
        </div>

        {/* The finding, as a rail. Readable while scanning, unlike a badge
            that has to be found among the other text on the row. */}
        <span
          aria-hidden
          className={cn(
            'mt-1 h-9 w-[3px] shrink-0 rounded-full',
            fit ? 'bg-emerald-500' : 'bg-rose-500',
          )}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="truncate text-sm font-semibold text-slate-900">
              {row.candidateName}
            </p>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide',
                fit
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700',
              )}
            >
              {fit ? 'Fit' : 'Unfit'}
            </span>
          </div>

          <p className="mt-0.5 truncate text-xs text-slate-500">
            {row.requisition.designation} · {row.requisition.unitFactory}
          </p>
          <p className="mt-1 text-[0.6875rem] text-slate-400">
            {row.requisition.code}
            {row.submittedBy ? ` · ${row.submittedBy}` : ''}
            {row.submittedAt ? ` · ${formatDate(row.submittedAt)}` : ''}
          </p>

          {row.note && (
            <p className="mt-2 border-l-2 border-slate-200 pl-2.5 text-xs italic text-slate-600">
              {row.note}
            </p>
          )}

          <button
            type="button"
            onClick={onExpand}
            className="mt-2 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-slate-500 hover:text-slate-800"
          >
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
            />
            {open ? 'Hide findings' : 'View findings'}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconAction
            title="Approve this finding"
            tone="ok"
            disabled={busy}
            onClick={onApprove}
            icon={Check}
          />
          <IconAction
            title="Overturn — this candidate is not cleared"
            tone="alert"
            disabled={busy}
            onClick={onReject}
            icon={X}
          />
          <IconAction
            title="Send back to the examining officer"
            tone="plain"
            disabled={busy}
            onClick={onReturn}
            icon={RotateCcw}
          />
        </div>
      </div>

      {/* Mounted only when opened — the queue can be long and every row
          carries a full clinical record. */}
      {/* The indent aligns the panel under the row's text on a wide screen. It
          is dropped below `sm` — a fixed 3.25rem inset plus the panel's own
          padding pushes the right-hand column off a phone, which is where the
          findings were being clipped. */}
      {open && (
        <div className="px-3 pb-4 sm:px-4 sm:pl-[3.25rem]">
          <MedicalExamDetail exam={row.exam} />
        </div>
      )}
    </div>
  );
}

function IconAction({
  title,
  tone,
  disabled,
  onClick,
  icon: Icon,
}: {
  title: string;
  tone: 'ok' | 'alert' | 'plain';
  disabled?: boolean;
  onClick: () => void;
  icon: typeof Check;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg border p-2 transition-colors disabled:opacity-40',
        tone === 'ok' &&
          'border-slate-200 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
        tone === 'alert' &&
          'border-slate-200 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
        tone === 'plain' &&
          'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * Where the reason gets typed.
 *
 * Overturning or returning reverses a clinician's written finding, so the note
 * is required — and it is asked for at the moment of the decision, next to the
 * name it applies to, rather than in a field elsewhere on the page.
 */
function DecisionDialog({
  pending,
  note,
  busy,
  onNote,
  onCancel,
  onConfirm,
}: {
  pending: PendingAction | null;
  note: string;
  busy: boolean;
  onNote: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const overturn = pending?.decision === 'reject';
  const enough = note.trim().length >= 3;

  return (
    <Modal
      open={Boolean(pending)}
      onClose={onCancel}
      size="md"
      title={overturn ? 'Overturn this finding' : 'Send back for re-check'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!enough} isLoading={busy}>
            {overturn ? 'Overturn' : 'Send back'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          {overturn ? (
            <>
              <span className="font-semibold text-slate-800">
                {pending?.label}
              </span>{' '}
              will be recorded as <strong>not medically cleared</strong>, against
              the examining officer&rsquo;s finding.
            </>
          ) : (
            <>
              <span className="font-semibold text-slate-800">
                {pending?.label}
              </span>{' '}
              will go back to the examining officer. The candidate returns to
              pending and no clearance is recorded.
            </>
          )}
        </p>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {overturn
              ? 'Reason for overturning'
              : 'What should the examining officer re-check?'}
          </span>
          <textarea
            autoFocus
            rows={4}
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder={
              overturn
                ? 'e.g. Blood pressure readings inconsistent with the stated assessment'
                : 'e.g. Re-check vision in the left eye and attach the corrected report'
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>

        <p className="text-xs text-slate-400">
          The examining officer is notified with this note. It is the only
          record of why the finding was {overturn ? 'overturned' : 'returned'}.
        </p>
      </div>
    </Modal>
  );
}
