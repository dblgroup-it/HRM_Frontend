import { useId, useState } from 'react';
import {
  Bell,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  Handshake,
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
 * Artwork geometry, in the 760 x 620 viewBox. Each drop is a circle with a
 * tangent point 1.55 radii out, the full-bodied drop of the DBL mark. They
 * interlock as in the logo: green low-left pointing right, blue high-right
 * pointing left, their facing edges parallel with a clear gap between.
 */
const GREEN = { cx: 200, cy: 370, r: 150 };
const BLUE = { cx: 550, cy: 165, r: 150 };
const GREEN_DROP = 'M430.2 337.6 L279.9 243.0 A150 150 0 1 0 311.8 470.0 Z';
const BLUE_DROP = 'M319.8 197.4 L470.1 292.0 A150 150 0 1 0 438.2 65.0 Z';

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
  const badge = align === 'start' ? x - 34 : x + 34;
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

/*
 * The hiring journey, drawn beneath the drops: it leaves the green drop's
 * underside, runs level through four stages and climbs to the blue drop.
 * Candidates travel it one after another.
 */
const JOURNEY =
  'M171.4 517.2 C 190 575, 230 582, 285 582 L 575 582 C 660 582, 680 420, 625 294.9';
const ARRIVAL = { x: 625, y: 294.9 };
const STAGE_Y = 582;
/** One candidate's trip, in seconds; three are on the path at once. */
const TRIP = 9;
const TRAVELLERS = [0, 3, 6];
/*
 * Stage points, with the share of the trip at which a candidate reaches
 * each (measured along the path). Their pulse is timed to that, so the
 * point lights as somebody passes.
 */
const STAGES = [
  { label: 'Sourcing', x: 310, at: 0.23 },
  { label: 'Screening', x: 397, at: 0.35 },
  { label: 'Interview', x: 483, at: 0.46 },
  { label: 'Offer', x: 570, at: 0.58 },
];
const pulseDelay = (at: number) => `${((at * TRIP) % 3).toFixed(2)}s`;

/** Notices that take turns popping up beside the drops. */
const NOTICES: { icon: LucideIcon; text: string; x: number; y: number }[] = [
  { icon: FileText, text: 'New CV received', x: 0, y: 120 },
  { icon: CalendarCheck, text: 'Interview scheduled', x: 390, y: 404 },
  { icon: Handshake, text: 'Offer accepted', x: 600, y: -22 },
];

/** A candidate: a small person in a white badge. */
function Person({ x = 0, y = 0, className }: { x?: number; y?: number; className?: string }) {
  return (
    <g transform={`translate(${x} ${y})`} className={className}>
      <circle r={12} className="fill-white stroke-brand-500" strokeWidth={1.5} />
      <circle cy={-3.5} r={3.2} className="fill-brand-600" />
      <path d="M-5.5 6.5 C -5.5 1.5, 5.5 1.5, 5.5 6.5 Z" className="fill-brand-600" />
    </g>
  );
}

function Traveller({ pathId, delay }: { pathId: string; delay: number }) {
  const begin = `${-delay}s`;
  return (
    <g opacity={0}>
      <Person />
      <animateMotion dur={`${TRIP}s`} begin={begin} repeatCount="indefinite">
        <mpath href={`#${pathId}`} />
      </animateMotion>
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.06;0.94;1"
        dur={`${TRIP}s`}
        begin={begin}
        repeatCount="indefinite"
      />
    </g>
  );
}

function Notice({
  n,
  delay,
}: {
  n: (typeof NOTICES)[number];
  delay: number;
}) {
  const w = 30 + n.text.length * 7.1 + 18;
  return (
    <g
      className="login-notice"
      style={{ animationDelay: `${delay}s` }}
      transform={`translate(${n.x} ${n.y})`}
    >
      <rect width={w} height={36} rx={18} className="fill-white" />
      <circle cx={18} cy={18} r={12} className="fill-brand-50" />
      <n.icon x={11} y={11} width={14} height={14} className="text-brand-600" strokeWidth={2} />
      <text x={38} y={22.5} className="fill-ink-dark text-[12px] font-semibold">
        {n.text}
      </text>
    </g>
  );
}

/**
 * DBL's two drops, the page's background artwork: glossy, layered rims,
 * line-art leaves and water beads inside, a streak of light round each
 * edge, both floating out of step. The feature text, journey and
 * notices show from xl up.
 */
function DblArtwork({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `login-${n}-${uid}`;
  // SMIL motion ignores the CSS reduced-motion rule, so honour it here.
  const [still] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  return (
    <svg
      viewBox="0 0 760 620"
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

      {/* A slow dotted orbit behind both drops, and candidates drifting by */}
      <ellipse cx={380} cy={300} rx={365} ry={255} className="login-orbit" />
      <g className="hidden xl:inline">
        <Person x={30} y={250} className="login-bead [animation-delay:-1s]" />
        <Person x={712} y={400} className="login-bead [animation-delay:-3s]" />
        <Person x={250} y={90} className="login-bead [animation-delay:-2s]" />
      </g>

      <g className="login-drop">
        <path d={GREEN_DROP} fill={`url(#${id('green')})`} className="login-drop-shadow" />
        <g clipPath={`url(#${id('gclip')})`}>
          <path d={GREEN_DROP} fill={`url(#${id('gloss')})`} />
          <Leaf transform="translate(88 486) rotate(-30) scale(1.2)" />
          <Leaf transform="translate(122 512) rotate(6) scale(0.85)" />
        </g>
        <path d={GREEN_DROP} transform={about(GREEN, 0.93)} className="fill-none stroke-white/30" />
        <path d={GREEN_DROP} transform={about(GREEN, 0.86)} className="fill-none stroke-white/15" />
        <path d={GREEN_DROP} pathLength={100} className="login-drop-streak" />
        <g className="hidden xl:inline">
          <FeatureItem f={greenFeatures[0]} x={116} y={318} align="start" />
          <line x1={86} x2={330} y1={372} y2={372} className="stroke-white/30" />
          <FeatureItem f={greenFeatures[1]} x={116} y={398} align="start" />
        </g>
        <circle cx={62} cy={300} r={5} fill={`url(#${id('bead')})`} className="login-bead" />
      </g>

      <g className="login-drop login-drop-blue">
        <path d={BLUE_DROP} fill={`url(#${id('blue')})`} className="login-drop-shadow" />
        <g clipPath={`url(#${id('bclip')})`}>
          <path d={BLUE_DROP} fill={`url(#${id('gloss')})`} />
          <Leaf transform="translate(660 60) rotate(-112) scale(1.1)" />
          <Leaf transform="translate(612 44) rotate(-78) scale(0.8)" />
        </g>
        <path d={BLUE_DROP} transform={about(BLUE, 0.93)} className="fill-none stroke-white/30" />
        <path d={BLUE_DROP} transform={about(BLUE, 0.86)} className="fill-none stroke-white/15" />
        <path d={BLUE_DROP} pathLength={100} className="login-drop-streak [animation-delay:-3.5s]" />
        <g className="hidden xl:inline">
          <FeatureItem f={blueFeatures[0]} x={616} y={116} align="end" />
          <line x1={434} x2={650} y1={170} y2={170} className="stroke-white/30" />
          <FeatureItem f={blueFeatures[1]} x={616} y={196} align="end" />
        </g>
        <circle cx={694} cy={236} r={4} fill={`url(#${id('bead')})`} className="login-bead [animation-delay:-2s]" />
      </g>

      <circle cx={300} cy={120} r={3} fill={`url(#${id('bead')})`} className="login-bead [animation-delay:-4s]" />

      {/* The hiring journey (desktop only) */}
      <g className="hidden xl:inline">
        <path id={id('journey')} d={JOURNEY} className="login-journey" />
        {STAGES.map((st) => (
          <g key={st.label}>
            <circle
              cx={st.x}
              cy={STAGE_Y}
              r={6}
              className="login-stage-halo fill-brand-400/40"
              style={{ animationDelay: pulseDelay(st.at) }}
            />
            <circle cx={st.x} cy={STAGE_Y} r={5} className="fill-white stroke-brand-500" strokeWidth={2} />
            <text
              x={st.x}
              y={STAGE_Y + 24}
              textAnchor="middle"
              className="fill-slate-500 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
            >
              {st.label}
            </text>
          </g>
        ))}
        <g transform={`translate(${ARRIVAL.x} ${ARRIVAL.y})`}>
          <circle r={14} className="login-stage-halo fill-accent-400/50" />
          <circle r={11} className="fill-accent-500" />
          <path d="M-4.5 0.5 L-1.2 3.8 L4.8 -3" className="fill-none stroke-white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {!still &&
          TRAVELLERS.map((d) => <Traveller key={d} pathId={id('journey')} delay={d} />)}
        {NOTICES.map((n, i) => (
          <Notice key={n.text} n={n} delay={i * 3} />
        ))}
      </g>
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#eaf2fa_0%,#f8fafc_45%,#eef6e3_100%)] p-4 lg:p-8">
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

      {/* Phones and tablets: the drops sit faintly behind the card */}
      <DblArtwork className="pointer-events-none absolute left-1/2 top-1/2 w-[140vw] max-w-[760px] -translate-x-1/2 -translate-y-1/2 overflow-visible opacity-30 lg:hidden" />

      <div className="relative grid w-full max-w-[1400px] items-center gap-10 lg:grid-cols-[1.45fr_1fr]">
        {/* Desktop: the drops and the hiring journey on the left */}
        <div className="hidden lg:block">
          <DblArtwork className="h-auto max-h-[calc(100vh-4rem)] w-full overflow-visible" />
        </div>

        {/* Sign-in on the right */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative z-10 w-full max-w-sm animate-rise-in rounded-3xl bg-white/80 p-7 shadow-[0_30px_70px_-30px_rgba(15,42,69,0.45)] ring-1 ring-white/80 backdrop-blur-2xl sm:p-9">
            <div className="mb-7 flex flex-col items-center text-center">
              <Logo size="xl" withLabel={false} />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink-dark">
                Sign in to your workspace
              </h2>
              <p className="mt-1.5 text-sm leading-6">
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
      </div>
    </main>
  );
}
