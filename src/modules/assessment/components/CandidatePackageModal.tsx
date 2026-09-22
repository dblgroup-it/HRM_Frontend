import { useEffect, useState } from 'react';

import { Bus, Gift, Lock, TrendingUp, Wallet } from 'lucide-react';

import { Button, Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatCurrency } from '@shared/utils';

import { useSetCandidatePackage } from '../hooks/useAssessment';
import { BENEFIT_OPPOSITE, BENEFIT_OPTIONS, type BenefitKey } from './benefits';

/**
 * What the candidate earns now and what they are asking for.
 *
 * Its own modal rather than a section of the Salary Fixation screen, and
 * deliberately so: this is filled in by whoever ran the interview — usually
 * factory HR, who has no business setting anybody's pay — while Salary
 * Fixation is Corporate HR settling the grade, the band and the figure. Two
 * different people, two different moments, two different authorities.
 *
 * There is no field here for the salary DBL will pay. An interviewer writing
 * one would be making a promise nobody authorised; the number they capture
 * shows up on the Salary Fixation screen as context, and Corporate HR decides
 * from there.
 */
export function CandidatePackageModal({
  candidate,
  open,
  onClose,
}: {
  candidate: {
    id: string;
    name: string;
    presentSalary?: number | null;
    salaryExpectation?: number | null;
    salaryBenefitsNote?: string | null;
    salaryBenefits?: string[];
    transportPickup?: string | null;
  };
  open: boolean;
  onClose: () => void;
}) {
  const save = useSetCandidatePackage(candidate.id);
  const [present, setPresent] = useState('');
  const [expected, setExpected] = useState('');
  const [benefits, setBenefits] = useState('');
  const [ticked, setTicked] = useState<string[]>([]);
  const [pickup, setPickup] = useState('');

  // By value: a background refetch hands over a fresh array with the same
  // keys, and reseeding on that would wipe ticks nobody has saved yet.
  const savedTicks = (candidate.salaryBenefits ?? []).join(',');

  // Reseed each time it opens: the modal is mounted once per candidate row
  // and reused, so stale values from the last person would otherwise show.
  useEffect(() => {
    if (!open) return;
    setPresent(candidate.presentSalary?.toString() ?? '');
    setExpected(candidate.salaryExpectation?.toString() ?? '');
    setBenefits(candidate.salaryBenefitsNote ?? '');
    setTicked(savedTicks ? savedTicks.split(',') : []);
    setPickup(candidate.transportPickup ?? '');
  }, [
    open,
    candidate.presentSalary,
    candidate.salaryExpectation,
    candidate.salaryBenefitsNote,
    candidate.transportPickup,
    savedTicks,
  ]);

  // Lunch is full or partial, pick and drop free or paid — ticking one side
  // of a pair clears the other rather than letting the save be refused.
  const toggle = (key: BenefitKey) =>
    setTicked((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      const opposite = BENEFIT_OPPOSITE[key];
      return [...prev.filter((k) => k !== opposite), key];
    });

  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  // Only once both are real numbers — a half-typed pair should not flash a
  // percentage that changes on every keystroke.
  const p0 = Number(present);
  const p1 = Number(expected);
  const jump =
    present.trim() && expected.trim() && p0 > 0 && p1 > 0
      ? { delta: p1 - p0, pct: Math.round(((p1 - p0) / p0) * 100) }
      : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      // Two money fields side by side need the room; at sm they were a
      // cramped pair and the title wrapped onto two lines.
      size="md"
      title={`Facilities & salary — ${candidate.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            isLoading={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  presentSalary: num(present),
                  salaryExpectation: num(expected),
                  salaryBenefitsNote: benefits.trim() || null,
                  salaryBenefits: ticked,
                  transportPickup: pickup.trim() || null,
                },
                { onSuccess: onClose },
              )
            }
          >
            Save
          </Button>
        </>
      }
    >
      <p className="text-xs text-slate-500">
        What the candidate told you in the interview. Corporate HR sees this on
        the Salary Fixation screen when they settle the offer.
      </p>

      {/* The two figures sit side by side with the gap between them worked
          out live — "what do they want" is really "how much more", and an
          interviewer should not have to do that arithmetic in their head
          while the candidate is still in the room. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            jump.pct > 60
              ? 'bg-amber-50 text-amber-700'
              : 'bg-slate-50 text-slate-600',
          )}
        >
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          Asking {jump.pct > 0 ? `${jump.pct}% more` : 'the same or less'}
          {jump.pct > 0 && (
            <span className="font-normal text-slate-400">
              (+{formatCurrency(jump.delta)})
            </span>
          )}
          {jump.pct > 60 && (
            <span className="ml-auto font-normal">worth a note below</span>
          )}
        </div>
      )}

      <fieldset className="mt-4">
        <legend className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
          <Gift className="h-3.5 w-3.5" />
          Other benefits they receive now
        </legend>
        {/* The common ones as ticks, so Corporate HR reads the same eight
            words for every candidate instead of eight ways of saying
            "lunch". Anything else still goes in the note underneath. */}
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
          value={benefits}
          onChange={(e) => setBenefits(e.target.value)}
          aria-label="Other benefits — anything not in the list"
          placeholder="Anything else — festival bonuses, mobile bill, car…"
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <span className="mt-1 block text-[0.6875rem] text-slate-400">
          What they told you, not a claim we have checked.
        </span>
      </fieldset>

      {/* Where they are picked up from.
          The requisition cannot carry this — at requisition time nobody is
          selected, so nobody knows where the person lives. The interview is
          the first moment anybody can ask, and HR reads it back when they go
          through the hire's facility requirements. */}
      <label className="mt-4 block">
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
          Where the run would have to reach them. Not a promise of a seat —
          HR settles that on the facility requirements.
        </span>
      </label>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-slate-500">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        The final salary is not set here. Corporate HR fixes it against the
        grade and the committee&rsquo;s marks.
      </p>
    </Modal>
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
  icon: React.ReactNode;
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
        <span className="pl-3 pr-1 text-xs font-semibold text-slate-400">
          BDT
        </span>
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
