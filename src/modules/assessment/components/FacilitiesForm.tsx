import { useState, type ReactNode } from 'react';
import { Bus, CheckCircle2, Gift, History, PencilLine, Save, TrendingUp, Wallet } from 'lucide-react';

import { Button } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatCurrency } from '@shared/utils';

import { BENEFIT_OPPOSITE, BENEFIT_OPTIONS, type BenefitKey } from './benefits';

/** The facilities record as the server holds it. */
export interface FacilitiesValues {
  presentSalary: number | null;
  salaryExpectation: number | null;
  salaryBenefitsNote: string | null;
  salaryBenefits: string[];
  transportPickup: string | null;
  /** Who last saved it — shared by every HR interviewer on the panel. */
  updatedAt?: string | null;
  updatedByName?: string | null;
}

export interface FacilitiesInput {
  presentSalary: number | null;
  salaryExpectation: number | null;
  salaryBenefitsNote: string | null;
  salaryBenefits: string[];
  transportPickup: string | null;
  /** The stamp of what the form was showing — see the backend's facilities.ts. */
  baseUpdatedAt: string | null;
}

/**
 * The facilities fields, one form for every place they are filled.
 *
 * The recruiter's and Factory HR's modal, and the evaluation form's HR
 * section, all render this — so the fields, the paired benefit ticks and the
 * "asking X% more" line cannot drift between them.
 *
 * Remount it (via `key`) when the server's values change: it seeds its state
 * once, so a background refetch never wipes something being typed.
 */
export function FacilitiesForm({
  initial,
  saving,
  onSave,
  renderActions,
  dense = false,
}: {
  initial: FacilitiesValues;
  saving: boolean;
  onSave: (input: FacilitiesInput) => void;
  /** Where the save button goes. Defaults to a full-width button underneath. */
  renderActions?: (save: () => void, state: { dirty: boolean; saved: boolean }) => ReactNode;
  /** Tighter spacing, for the evaluation form's side panel. */
  dense?: boolean;
}) {
  const [present, setPresent] = useState(initial.presentSalary?.toString() ?? '');
  const [expected, setExpected] = useState(initial.salaryExpectation?.toString() ?? '');
  const [note, setNote] = useState(initial.salaryBenefitsNote ?? '');
  const [ticked, setTicked] = useState<string[]>(initial.salaryBenefits ?? []);
  const [pickup, setPickup] = useState(initial.transportPickup ?? '');

  // Lunch is full or partial, pick and drop free or paid — ticking one side
  // of a pair clears the other rather than letting the save be refused.
  const toggle = (key: BenefitKey) =>
    setTicked((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      const opposite = BENEFIT_OPPOSITE[key];
      return [...prev.filter((k) => k !== opposite), key];
    });

  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  const save = () =>
    onSave({
      presentSalary: num(present),
      salaryExpectation: num(expected),
      salaryBenefitsNote: note.trim() || null,
      salaryBenefits: ticked,
      transportPickup: pickup.trim() || null,
      baseUpdatedAt: initial.updatedAt ?? null,
    });

  /**
   * Has anything changed since the values this form opened with?
   *
   * Save is offered only then. Once saved the form is keyed on the new stamp
   * and remounts pristine, so it reads "Saved" instead of inviting the same
   * figures to be sent twice.
   */
  const sameList = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
  const dirty =
    num(present) !== (initial.presentSalary ?? null) ||
    num(expected) !== (initial.salaryExpectation ?? null) ||
    (note.trim() || null) !== (initial.salaryBenefitsNote?.trim() || null) ||
    !sameList(ticked, initial.salaryBenefits ?? []) ||
    (pickup.trim() || null) !== (initial.transportPickup?.trim() || null);
  const saved = Boolean(initial.updatedAt);

  // Only once both are real numbers — a half-typed pair should not flash a
  // percentage that changes on every keystroke.
  const p0 = Number(present);
  const p1 = Number(expected);
  const jump =
    present.trim() && expected.trim() && p0 > 0 && p1 > 0
      ? { delta: p1 - p0, pct: Math.round(((p1 - p0) / p0) * 100) }
      : null;

  const gap = dense ? 'mt-3' : 'mt-4';

  return (
    <div>
      {renderActions && initial.updatedAt && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[0.6875rem] text-slate-500">
          <History className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            Last saved
            {initial.updatedByName ? (
              <>
                {' '}by <span className="font-semibold text-slate-700">{initial.updatedByName}</span>
              </>
            ) : null}{' '}
            ·{' '}
            {new Date(initial.updatedAt).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <MoneyField
          label="Present salary"
          hint="What they earn now"
          value={present}
          onChange={setPresent}
          icon={<Wallet className="h-3.5 w-3.5" />}
        />
        <MoneyField
          label="Expected salary"
          hint="What they are asking for"
          value={expected}
          onChange={setExpected}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          accent
        />
      </div>

      {jump !== null && (
        <div
          className={cn(
            'mt-2.5 flex animate-card-in items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold',
            jump.pct > 60 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600',
          )}
        >
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          Asking {jump.pct > 0 ? `${jump.pct}% more` : 'the same or less'}
          {jump.pct > 0 && (
            <span className="font-normal text-slate-400">(+{formatCurrency(jump.delta)})</span>
          )}
        </div>
      )}

      <fieldset className={gap}>
        <legend className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
          <Gift className="h-3.5 w-3.5" />
          Other benefits they receive now
        </legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {BENEFIT_OPTIONS.map((o) => {
            const on = ticked.includes(o.key);
            return (
              <label
                key={o.key}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors',
                  on
                    ? 'border-brand-200 bg-brand-50/60 text-slate-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(o.key)}
                  className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {o.label}
              </label>
            );
          })}
        </div>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Other benefits — anything not in the list"
          placeholder="Anything else — festival bonuses, mobile bill, car…"
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <span className="mt-1 block text-[0.6875rem] text-slate-400">
          What they told you, not a claim we have checked.
        </span>
      </fieldset>

      <label className={cn(gap, 'block')}>
        <span className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
          <Bus className="h-3.5 w-3.5" />
          Transport pick-up point
        </span>
        <input
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          maxLength={200}
          placeholder="e.g. Signboard, Narayanganj — by the bus stand"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <span className="mt-1 block text-[0.6875rem] text-slate-400">
          Where the run would have to reach them. Not a promise of a seat.
        </span>
      </label>

      {renderActions ? (
        renderActions(save, { dirty, saved })
      ) : (
        <SaveBar
          className={gap}
          dirty={dirty}
          saved={saved}
          saving={saving}
          updatedAt={initial.updatedAt ?? null}
          updatedByName={initial.updatedByName ?? null}
          onSave={save}
        />
      )}
    </div>
  );
}

/**
 * A money input with its unit shown rather than spelled out in the label.
 *
 * "Present salary (BDT)" wastes the label on a currency that never changes;
 * the prefix says it once, in the place the number is actually typed.
 */
function MoneyField({
  label,
  hint,
  value,
  onChange,
  icon,
  accent,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  icon: ReactNode;
  /** The figure under negotiation — given the brand tint. */
  accent?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </span>
      <div
        className={cn(
          'flex items-center rounded-xl border bg-white transition-colors focus-within:ring-2',
          accent
            ? 'border-brand-200 focus-within:border-brand-400 focus-within:ring-brand-100'
            : 'border-slate-200 focus-within:border-slate-400 focus-within:ring-slate-100',
        )}
      >
        <span className="pl-3 pr-1 text-xs font-semibold text-slate-400">BDT</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full bg-transparent py-2.5 pr-3 text-base font-bold tabular-nums text-slate-800 placeholder:font-normal placeholder:text-slate-300 focus:outline-none"
        />
      </div>
      <span className="mt-1 block text-[0.6875rem] text-slate-400">{hint}</span>
    </label>
  );
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * The foot of the form: what state the record is in, and the one action
 * that makes sense in that state.
 *
 * Three states, each saying so in words as well as colour:
 *  - saved and untouched — a green "Saved" with who and when; nothing to press
 *  - changed — "Unsaved changes" and the save button, now the only live thing
 *  - never filled and untouched — a prompt, and a save that waits for input
 */
function SaveBar({
  className,
  dirty,
  saved,
  saving,
  updatedAt,
  updatedByName,
  onSave,
}: {
  className?: string;
  dirty: boolean;
  saved: boolean;
  saving: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
  onSave: () => void;
}) {
  if (saved && !dirty) {
    return (
      <div
        role="status"
        className={cn(
          'flex animate-card-in items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5',
          className,
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-emerald-800">Facilities saved</span>
          <span className="block truncate text-[0.6875rem] text-emerald-700/80">
            {updatedByName ? `By ${updatedByName}` : 'Saved'}
            {updatedAt ? ` · ${stamp(updatedAt)}` : ''} · edit a field to change it
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
        dirty ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200 bg-slate-50',
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'flex items-center gap-1.5 text-xs font-semibold',
            dirty ? 'text-amber-800' : 'text-slate-500',
          )}
        >
          <PencilLine className="h-3.5 w-3.5 shrink-0" />
          {dirty ? (saved ? 'Unsaved changes' : 'Not saved yet') : 'Nothing entered yet'}
        </span>
        <span className="block truncate text-[0.6875rem] text-slate-500">
          {dirty
            ? saved && updatedAt
              ? `Last saved ${stamp(updatedAt)}${updatedByName ? ` by ${updatedByName}` : ''}`
              : 'Save before you leave this page'
            : 'Fill in what the candidate told you'}
        </span>
      </span>
      <Button
        size="sm"
        className="shrink-0"
        isLoading={saving}
        disabled={!dirty}
        leftIcon={<Save className="h-4 w-4" />}
        onClick={onSave}
      >
        {saved ? 'Save changes' : 'Save'}
      </Button>
    </div>
  );
}
