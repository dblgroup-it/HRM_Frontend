import { useEffect, useState } from 'react';

import { Gift, Lock, TrendingUp, Wallet } from 'lucide-react';

import { Button, Modal } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatCurrency } from '@shared/utils';

import { useSetCandidatePackage } from '../hooks/useAssessment';

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
  };
  open: boolean;
  onClose: () => void;
}) {
  const save = useSetCandidatePackage(candidate.id);
  const [present, setPresent] = useState('');
  const [expected, setExpected] = useState('');
  const [benefits, setBenefits] = useState('');

  // Reseed each time it opens: the modal is mounted once per candidate row
  // and reused, so stale values from the last person would otherwise show.
  useEffect(() => {
    if (!open) return;
    setPresent(candidate.presentSalary?.toString() ?? '');
    setExpected(candidate.salaryExpectation?.toString() ?? '');
    setBenefits(candidate.salaryBenefitsNote ?? '');
  }, [
    open,
    candidate.presentSalary,
    candidate.salaryExpectation,
    candidate.salaryBenefitsNote,
  ]);

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
      title={`Salary & benefits — ${candidate.name}`}
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

      <label className="mt-4 block">
        <span className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
          <Gift className="h-3.5 w-3.5" />
          Other benefits they receive now
        </span>
        <textarea
          rows={3}
          value={benefits}
          onChange={(e) => setBenefits(e.target.value)}
          placeholder="Transport, accommodation, festival bonuses, mobile bill — whatever they mentioned."
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <span className="mt-1 block text-[0.6875rem] text-slate-400">
          Free text on purpose — it is what they told you, not a claim we have
          checked.
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
