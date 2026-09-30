import {
  Bell,
  ClipboardCheck,
  Network,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { useId } from 'react';

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
 * The two drops of the DBL mark, drawn as circle + tangent point. Green sits
 * low-left pointing right, blue high-right pointing left, tips passing each
 * other as in the logo. Coordinates are in the viewBox below.
 */
const GREEN_DROP = 'M351 243 L156.9 148.6 A105 105 0 1 0 156.9 337.4 Z';
const BLUE_DROP = 'M252 144 L460.8 52.4 A100 100 0 1 1 460.8 235.6 Z';

function FeatureText({
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
  const iconX = align === 'start' ? x - 36 : x + 8;
  return (
    <g>
      <circle cx={iconX + 14} cy={y - 4} r={14} className="fill-white/20" />
      <f.icon
        x={iconX + 6}
        y={y - 12}
        width={16}
        height={16}
        color="white"
        strokeWidth={2}
      />
      <text
        x={x}
        y={y}
        textAnchor={align}
        className="fill-white text-[13.5px] font-bold"
      >
        {f.title}
      </text>
      {f.desc.map((line, i) => (
        <text
          key={line}
          x={x}
          y={y + 17 + i * 14.5}
          textAnchor={align}
          className="fill-white/90 text-[11px] font-medium"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/**
 * DBL's drops, glossy and floating, with a streak of light round each rim.
 * The page's background artwork; with `withText` the four features are set
 * inside them.
 */
function DblDrops({
  withText,
  className,
}: {
  withText: boolean;
  className?: string;
}) {
  // Each copy needs its own gradient ids: the phone copy is display:none on
  // desktop, and a gradient defined inside a hidden SVG does not paint.
  const uid = useId().replace(/:/g, '');
  const green = `login-green-${uid}`;
  const blue = `login-blue-${uid}`;
  const gloss = `login-gloss-${uid}`;
  return (
    <svg
      viewBox="-10 -10 630 420"
      className={className}
      role={withText ? 'img' : undefined}
      aria-hidden={withText ? undefined : true}
      aria-label={
        withText
          ? 'Requisitions and approvals, live organogram, AI-assisted hiring, real-time everywhere'
          : undefined
      }
    >
      <defs>
        <linearGradient id={green} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a6d45a" />
          <stop offset="50%" stopColor="#6ea22d" />
          <stop offset="100%" stopColor="#446323" />
        </linearGradient>
        <linearGradient id={blue} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#59a4d8" />
          <stop offset="50%" stopColor="#1877c0" />
          <stop offset="100%" stopColor="#164f7f" />
        </linearGradient>
        <radialGradient id={gloss} cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.28" />
          <stop offset="60%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="login-drop login-drop-green">
        <path d={GREEN_DROP} fill={`url(#${green})`} className="login-drop-shadow" />
        <path d={GREEN_DROP} fill={`url(#${gloss})`} />
        <path
          d={GREEN_DROP}
          transform="translate(111 243) scale(0.9) translate(-111 -243)"
          className="fill-none stroke-white/25"
          strokeWidth={1}
        />
        <path d={GREEN_DROP} pathLength={100} className="login-drop-streak" />
        {withText && greenFeatures.map((f, i) => (
          <FeatureText key={f.title} f={f} x={68} y={214 + i * 64} align="start" />
        ))}
      </g>

      <g className="login-drop login-drop-blue">
        <path d={BLUE_DROP} fill={`url(#${blue})`} className="login-drop-shadow" />
        <path d={BLUE_DROP} fill={`url(#${gloss})`} />
        <path
          d={BLUE_DROP}
          transform="translate(501 144) scale(0.9) translate(-501 -144)"
          className="fill-none stroke-white/25"
          strokeWidth={1}
        />
        <path
          d={BLUE_DROP}
          pathLength={100}
          className="login-drop-streak [animation-delay:-3.5s]"
        />
        {withText && blueFeatures.map((f, i) => (
          <FeatureText key={f.title} f={f} x={544} y={100 + i * 62} align="end" />
        ))}
      </g>

      {/* A few water beads, as on the reference artwork */}
      <circle cx="588" cy="60" r="4" className="login-bead fill-white/50" />
      <circle cx="30" cy="210" r="3" className="login-bead fill-white/40 [animation-delay:-2s]" />
      <circle cx="330" cy="300" r="2.5" className="login-bead fill-white/40 [animation-delay:-4s]" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#eaf2fa_0%,#f8fafc_45%,#eef6e3_100%)]">
      {/* Background: soft glow, a faint dot grid, and DBL's drops */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] animate-blob-1 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[36rem] w-[36rem] animate-blob-2 rounded-full bg-accent-200/50 blur-3xl" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(24,119,192,0.22) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Phones and tablets: the drops sit behind the card, without text */}
      <DblDrops
        withText={false}
        className="pointer-events-none absolute left-1/2 top-1/2 w-[150vw] max-w-[900px] -translate-x-1/2 -translate-y-1/2 overflow-visible opacity-30 lg:hidden"
      />

      {/* Desktop: the drops fill the left of the page, features inside */}
      <DblDrops
        withText
        className="absolute left-[3vw] top-[120px] hidden h-auto w-[min(46vw,calc((100vh-320px)*1.5))] overflow-visible lg:block xl:w-[min(56vw,calc((100vh-320px)*1.5))]"
      />

      <div className="absolute left-10 top-8 hidden animate-fade-in lg:block">
        <Logo size="xl" withLabel={false} />
      </div>

      <div className="absolute bottom-10 left-10 hidden max-w-lg animate-rise-in lg:block">
        <h1 className="text-[2.5rem] font-bold leading-[1.08] tracking-tight text-ink-dark">
          <span className="dev-credit-name">Smarter Sourcing,</span>
          <br />
          Seamless Integration.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          DBL Group&rsquo;s complete people-management platform, from hiring
          and onboarding to everyday HR.
        </p>
      </div>

      {/* Sign-in: a frosted card floating on the right */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-8 lg:justify-end lg:pr-[7vw]">
        <div className="w-full max-w-sm animate-rise-in rounded-3xl bg-white/75 p-7 shadow-[0_30px_70px_-30px_rgba(15,42,69,0.4)] ring-1 ring-white/70 backdrop-blur-2xl sm:p-9">
          <div className="mb-7 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="mb-4 lg:hidden">
              <Logo size="xl" withLabel={false} />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
              Welcome back
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink-dark">
              Sign in to your workspace
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Use your DBL Group email to continue.
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
