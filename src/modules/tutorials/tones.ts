/**
 * The Tutorials page's colours: one soft tint per stage of the hiring
 * workflow, so a guide's stage reads at a glance — the tinted-card look the
 * owner chose on 2026-10-12. Whole class strings, so Tailwind keeps them.
 */
export interface Tone {
  /** A card: its wash, border and hover border. */
  card: string;
  /** Small type on a card — the kicker and "Open". */
  text: string;
  dot: string;
  /** Chapter numbers. */
  badge: string;
  /** A stage on the journey that holds guides… */
  node: string;
  /** …and the stage chosen. */
  nodeOn: string;
}

/** The stages, in the order the hiring workflow runs. */
export const STAGES = [
  'Requisition',
  'Approvals',
  'Recruitment & interviews',
  'Onboarding',
  'Administration',
] as const;

export const TONES: Record<string, Tone> = {
  Overview: {
    card: 'border-brand-100 bg-brand-50/50 hover:border-brand-200',
    text: 'text-brand-700',
    dot: 'bg-brand-400',
    badge: 'bg-brand-50 text-brand-700 ring-brand-100',
    node: 'border-brand-200 bg-white text-brand-800 hover:border-brand-300',
    nodeOn: 'border-brand-300 bg-brand-100 text-brand-900 ring-2 ring-brand-200/70',
  },
  Requisition: {
    card: 'border-sky-100 bg-sky-50/60 hover:border-sky-200',
    text: 'text-sky-700',
    dot: 'bg-sky-400',
    badge: 'bg-sky-50 text-sky-700 ring-sky-100',
    node: 'border-sky-200 bg-white text-sky-800 hover:border-sky-300',
    nodeOn: 'border-sky-300 bg-sky-100 text-sky-900 ring-2 ring-sky-200/70',
  },
  Approvals: {
    card: 'border-violet-100 bg-violet-50/60 hover:border-violet-200',
    text: 'text-violet-700',
    dot: 'bg-violet-400',
    badge: 'bg-violet-50 text-violet-700 ring-violet-100',
    node: 'border-violet-200 bg-white text-violet-800 hover:border-violet-300',
    nodeOn: 'border-violet-300 bg-violet-100 text-violet-900 ring-2 ring-violet-200/70',
  },
  'Recruitment & interviews': {
    card: 'border-amber-100 bg-amber-50/60 hover:border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 ring-amber-100',
    node: 'border-amber-200 bg-white text-amber-800 hover:border-amber-300',
    nodeOn: 'border-amber-300 bg-amber-100 text-amber-900 ring-2 ring-amber-200/70',
  },
  Onboarding: {
    card: 'border-emerald-100 bg-emerald-50/60 hover:border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    node: 'border-emerald-200 bg-white text-emerald-800 hover:border-emerald-300',
    nodeOn: 'border-emerald-300 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-200/70',
  },
  Administration: {
    card: 'border-slate-200 bg-slate-50 hover:border-slate-300',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
    node: 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
    nodeOn: 'border-slate-400 bg-slate-100 text-slate-900 ring-2 ring-slate-200',
  },
};

export const toneOf = (group: string): Tone => TONES[group] ?? TONES.Administration;
