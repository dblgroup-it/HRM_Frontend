import { useId } from 'react';
import {
  Bell,
  ClipboardCheck,
  Network,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { DevCredit, Logo } from '@shared/components/ui';
import { APP_META } from '@shared/constants';

import { LoginForm } from '../components/LoginForm';

interface Feature {
  icon: LucideIcon;
  title: string;
  /** Two lines, broken by hand: SVG text does not wrap. */
  desc: [string, string];
}

const greenFeatures: Feature[] = [
  {
    icon: ClipboardCheck,
    title: 'Requisitions & approvals',
    desc: ['Digital requisitions with a', 'multi-level sign-off chain.'],
  },
  {
    icon: Network,
    title: 'Live organogram',
    desc: ['Unit-wise sanctioned seats', 'with real-time vacancies.'],
  },
];

const blueFeatures: Feature[] = [
  {
    icon: Sparkles,
    title: 'AI-assisted hiring',
    desc: ['AI role profiles, document', 'checks and exam grading.'],
  },
  {
    icon: Bell,
    title: 'Real-time everywhere',
    desc: ['Instant notifications and', 'live updates across units.'],
  },
];

/*
 * Artwork geometry, in the 1200 x 640 viewBox. Each drop is a circle with a
 * tangent point 1.55 radii out, which gives the full-bodied drop of the DBL
 * mark. Green sits left and low, pointing right; blue right and high,
 * pointing left; both tips tuck in behind the centred sign-in card.
 */
const GREEN = { cx: 170, cy: 380, r: 160 };
const BLUE = { cx: 1030, cy: 250, r: 160 };
const GREEN_DROP = 'M412.6 328.4 L245.6 239.0 A160 160 0 1 0 296.4 478.1 Z';
const BLUE_DROP = 'M787.4 301.6 L954.4 391.0 A160 160 0 1 0 903.6 151.9 Z';

/** Scale a path about a centre, for the drop's inner rims. */
const about = (c: { cx: number; cy: number }, k: number) =>
  `translate(${c.cx} ${c.cy}) scale(${k}) translate(${-c.cx} ${-c.cy})`;

/** A line-art leaf with its midrib and veins, drawn pointing up. */
function Leaf({ transform }: { transform: string }) {
  return (
    <g transform={transform} className="fill-none stroke-white/30" strokeWidth={1.2}>
      <path d="M0 0 C 18 -14 20 -44 0 -70 C -20 -44 -18 -14 0 0 Z" />
      <path d="M0 -4 V -64" />
      <path d="M0 -22 L 10 -32 M0 -36 L -10 -46 M0 -48 L 8 -56" />
    </g>
  );
}

function FeatureItem({
  f,
  x,
  y,
  align,
}: {
  f: Feature;
  x: number;
  y: number;
  align: 'start' | 'end';
}) {
  // Icon badge sits on the round side of the drop, text runs toward the tip.
  const badge = align === 'start' ? x - 30 : x + 30;
  return (
    <g>
      <circle cx={badge} cy={y + 8} r={17} className="fill-white/20 stroke-white/45" strokeWidth={1} />
      <f.icon x={badge - 9} y={y - 1} width={18} height={18} color="white" strokeWidth={1.9} />
      <text x={x} y={y} textAnchor={align} className="fill-white text-[15px] font-bold tracking-tight">
        {f.title}
      </text>
      {f.desc.map((line, i) => (
        <text
          key={line}
          x={x}
          y={y + 19 + i * 16}
          textAnchor={align}
          className="fill-white/85 text-[12px] font-medium"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/**
 * DBL's two drops, the page's background artwork: glossy, layered rims,
 * line-art leaves and water beads inside, a streak of light round each
 * edge, both floating out of step. The feature text shows from xl up.
 */
function DblArtwork({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `login-${n}-${uid}`;
  return (
    <svg
      viewBox="0 0 1200 640"
      className={className}
      role="img"
      aria-label="Requisitions and approvals, live organogram, AI-assisted hiring, real-time everywhere"
    >
      <defs>
        <linearGradient id={id('green')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b3da6f" />
          <stop offset="55%" stopColor="#6ea22d" />
          <stop offset="100%" stopColor="#446323" />
        </linearGradient>
        <linearGradient id={id('blue')} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ec4e7" />
          <stop offset="50%" stopColor="#1877c0" />
          <stop offset="100%" stopColor="#164f7f" />
        </linearGradient>
        <radialGradient id={id('gloss')} cx="32%" cy="22%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('bead')} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.95" />
          <stop offset="100%" stopColor="white" stopOpacity="0.15" />
        </radialGradient>
        <clipPath id={id('gclip')}>
          <path d={GREEN_DROP} />
        </clipPath>
        <clipPath id={id('bclip')}>
          <path d={BLUE_DROP} />
        </clipPath>
      </defs>

      <g className="login-drop">
        <path d={GREEN_DROP} fill={`url(#${id('green')})`} className="login-drop-shadow" />
        <g clipPath={`url(#${id('gclip')})`}>
          <path d={GREEN_DROP} fill={`url(#${id('gloss')})`} />
          <Leaf transform="translate(52 520) rotate(-28) scale(1.3)" />
          <Leaf transform="translate(92 548) rotate(8) scale(0.9)" />
        </g>
        <path d={GREEN_DROP} transform={about(GREEN, 0.93)} className="fill-none stroke-white/30" />
        <path d={GREEN_DROP} transform={about(GREEN, 0.86)} className="fill-none stroke-white/15" />
        <path d={GREEN_DROP} pathLength={100} className="login-drop-streak" />
        <g className="hidden xl:inline">
          <FeatureItem f={greenFeatures[0]} x={96} y={322} align="start" />
          <line x1={66} x2={300} y1={378} y2={378} className="stroke-white/30" />
          <FeatureItem f={greenFeatures[1]} x={96} y={404} align="start" />
        </g>
        <circle cx={40} cy={300} r={5} fill={`url(#${id('bead')})`} className="login-bead" />
      </g>

      <g className="login-drop login-drop-blue">
        <path d={BLUE_DROP} fill={`url(#${id('blue')})`} className="login-drop-shadow" />
        <g clipPath={`url(#${id('bclip')})`}>
          <path d={BLUE_DROP} fill={`url(#${id('gloss')})`} />
          <Leaf transform="translate(1150 392) rotate(-40) scale(1.3)" />
          <Leaf transform="translate(1110 420) rotate(-8) scale(0.9)" />
        </g>
        <path d={BLUE_DROP} transform={about(BLUE, 0.93)} className="fill-none stroke-white/30" />
        <path d={BLUE_DROP} transform={about(BLUE, 0.86)} className="fill-none stroke-white/15" />
        <path d={BLUE_DROP} pathLength={100} className="login-drop-streak [animation-delay:-3.5s]" />
        <g className="hidden xl:inline">
          <FeatureItem f={blueFeatures[0]} x={1104} y={192} align="end" />
          <line x1={900} x2={1134} y1={248} y2={248} className="stroke-white/30" />
          <FeatureItem f={blueFeatures[1]} x={1104} y={274} align="end" />
        </g>
        <circle cx={1170} cy={330} r={4} fill={`url(#${id('bead')})`} className="login-bead [animation-delay:-2s]" />
      </g>

      <circle cx={600} cy={40} r={3} fill={`url(#${id('bead')})`} className="login-bead [animation-delay:-4s]" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#eaf2fa_0%,#f8fafc_45%,#eef6e3_100%)] p-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] animate-blob-1 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[36rem] w-[36rem] animate-blob-2 rounded-full bg-accent-200/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(24,119,192,0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* One centred stage: the drops behind, the card in the middle */}
      <div className="relative flex w-full max-w-[1200px] items-center justify-center">
        <DblArtwork className="pointer-events-none absolute left-1/2 top-1/2 w-[max(100%,760px)] -translate-x-1/2 -translate-y-1/2 overflow-visible opacity-40 lg:opacity-100" />

        <div className="relative z-10 w-full max-w-sm animate-rise-in rounded-3xl bg-white/80 p-7 shadow-[0_30px_70px_-30px_rgba(15,42,69,0.45)] ring-1 ring-white/80 backdrop-blur-2xl sm:p-9">
          <div className="mb-7 flex flex-col items-center text-center">
            <Logo size="xl" withLabel={false} />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink-dark">
              Sign in to your workspace
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              <span className="dev-credit-name font-semibold">
                Smarter Sourcing, Seamless Integration.
              </span>
            </p>
          </div>

          <LoginForm />

          <p className="mt-9 text-center text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-slate-400">
            {APP_META.fullName}
          </p>
          <DevCredit
            className="mx-auto mt-5 w-fit max-w-full"
            lines={[
              {
                text: 'Developed by',
                className:
                  'text-[0.59375rem] font-semibold uppercase tracking-[0.14em] text-slate-400',
              },
              {
                text: `IT Team · ${APP_META.company}`,
                className: 'dev-credit-name text-[0.8125rem] font-bold tracking-tight',
              },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
