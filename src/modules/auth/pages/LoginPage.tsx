import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
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
 * Artwork geometry, in the 760 x 620 viewBox, traced from the DBL mark
 * (logo.png, scaled 1.2): each wing is a half-disc with two straight edges
 * meeting in a point. Green is round on the left and points right, blue is
 * round on the right and points left, their facing edges parallel with a
 * narrow gap, and the small spike sits above blue's point, parallel to its
 * top edge. Keep these in step with the logo, not redrawn by eye.
 */
const GREEN = { cx: 212, cy: 346, r: 159.6 };
const BLUE = { cx: 546.8, cy: 220, r: 159.6 };
const GREEN_DROP = 'M458 346 L212 186.4 A159.6 159.6 0 0 0 212 505.6 Z';
const BLUE_DROP = 'M299.6 218.8 L546.8 60.4 A159.6 159.6 0 0 1 546.8 379.6 Z';
const SPIKE = 'M327.2 66.4 L352.4 167.2 L284 210.4 Z';

/** Scale a path about a centre, for the drop's inner rims. */
const about = (c: { cx: number; cy: number }, k: number) =>
  `translate(${c.cx} ${c.cy}) scale(${k}) translate(${-c.cx} ${-c.cy})`;

/** A line-art leaf with its midrib and veins, drawn pointing up. */
function Leaf({ transform }: { transform: string }) {
  return (
    <g
      transform={transform}
      className="fill-none stroke-white/30"
      strokeWidth={1.2}
    >
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
      <circle
        cx={badge}
        cy={y + 8}
        r={17}
        className="fill-white/20 stroke-white/45"
        strokeWidth={1}
      />
      <f.icon
        x={badge - 9}
        y={y - 1}
        width={18}
        height={18}
        color="white"
        strokeWidth={1.9}
      />
      <text
        x={x}
        y={y}
        textAnchor={align}
        className="fill-white text-[15px] font-bold tracking-tight"
      >
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
  'M157.4 496 C 175 572, 220 580, 285 580 L 575 580 C 660 580, 690 430, 626.6 358.2';
const ARRIVAL = { x: 626.6, y: 358.2 };
const STAGE_Y = 580;
/** One candidate's trip, in seconds; three are on the path at once. */
const TRIP = 9;
const TRAVELLERS = [0, 3, 6];
/*
 * Stage points, with the share of the trip at which a candidate reaches
 * each (measured along the path). Their pulse is timed to that, so the
 * point lights as somebody passes.
 */
const STAGES = [
  { label: 'Sourcing', x: 310, at: 0.25 },
  { label: 'Screening', x: 397, at: 0.37 },
  { label: 'Interview', x: 483, at: 0.5 },
  { label: 'Offer', x: 570, at: 0.62 },
];
const pulseDelay = (at: number) => `${((at * TRIP) % 3).toFixed(2)}s`;

/** Notices that take turns popping up beside the drops. */
const NOTICES: { icon: LucideIcon; text: string; x: number; y: number }[] = [
  { icon: FileText, text: 'New CV received', x: 0, y: 120 },
  { icon: CalendarCheck, text: 'Interview scheduled', x: 390, y: 404 },
  { icon: Handshake, text: 'Offer accepted', x: 600, y: -22 },
];

/** A candidate: a small person in a white badge. */
function Person({
  x = 0,
  y = 0,
  className,
}: {
  x?: number;
  y?: number;
  className?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`} className={className}>
      <circle
        r={12}
        className="fill-white stroke-brand-500"
        strokeWidth={1.5}
      />
      <circle cy={-3.5} r={3.2} className="fill-brand-600" />
      <path
        d="M-5.5 6.5 C -5.5 1.5, 5.5 1.5, 5.5 6.5 Z"
        className="fill-brand-600"
      />
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

function Notice({ n, delay }: { n: (typeof NOTICES)[number]; delay: number }) {
  const w = 30 + n.text.length * 7.1 + 18;
  return (
    <g
      className="login-notice"
      style={{ animationDelay: `${delay}s` }}
      transform={`translate(${n.x} ${n.y})`}
    >
      <rect width={w} height={36} rx={18} className="fill-white" />
      <circle cx={18} cy={18} r={12} className="fill-brand-50" />
      <n.icon
        x={11}
        y={11}
        width={14}
        height={14}
        className="text-brand-600"
        strokeWidth={2}
      />
      <text x={38} y={22.5} className="fill-ink-dark text-[12px] font-semibold">
        {n.text}
      </text>
    </g>
  );
}

/**
 * A huge "dbl" watermark across the page background, its letters filled with
 * an aerial-forest texture drawn by the SVG itself (fractal noise mapped to
 * greens, a river-blue wash toward one side) rather than a photograph. Faint
 * on purpose: it is atmosphere, not content.
 */
function DblWatermark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `login-wm-${n}-${uid}`;
  return (
    <svg viewBox="0 0 720 420" className={className} aria-hidden>
      <defs>
        <filter id={id('forest')} x="0" y="0" width="100%" height="100%">
          {/* Broad land shapes, then canopy grain on top */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.018"
            numOctaves={3}
            seed={11}
            result="land"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.11"
            numOctaves={2}
            seed={4}
            result="canopy"
          />
          <feBlend in="land" in2="canopy" mode="multiply" result="mix" />
          <feComponentTransfer in="mix" result="contrast">
            <feFuncR type="linear" slope="1.7" intercept="-0.1" />
          </feComponentTransfer>
          <feColorMatrix
            in="contrast"
            type="matrix"
            values="0.45 0 0 0 0.02
                    0.95 0 0 0 0.12
                    0.22 0 0 0 0.03
                    0 0 0 0 1"
          />
          {/* Soften the grain so it reads as texture, not noise */}
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        <linearGradient id={id('river')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1877c0" stopOpacity="0" />
          <stop offset="55%" stopColor="#1877c0" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#1877c0" stopOpacity="0.3" />
        </linearGradient>
        <clipPath id={id('letters')}>
          <text
            x="0"
            y="400"
            fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
            fontSize="470"
            fontWeight={600}
            letterSpacing="-18"
          >
            dbl
          </text>
        </clipPath>
      </defs>
      <g clipPath={`url(#${id('letters')})`}>
        <rect width="720" height="420" fill="#446323" />
        <rect width="720" height="420" filter={`url(#${id('forest')})`} />
        <rect width="720" height="420" fill={`url(#${id('river')})`} />
      </g>
    </svg>
  );
}

/** How far a layer drifts with the mouse, in px at full deflection. */
const depth = (px: number) => ({ '--depth': px }) as CSSProperties;

/**
 * Tilts the artwork toward the mouse and lets its layers drift by depth,
 * through two CSS variables so nothing re-renders. Off for touch and for
 * reduced motion.
 */
function useParallax() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia?.('(pointer: fine)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        el.style.setProperty('--mx', x.toFixed(3));
        el.style.setProperty('--my', y.toFixed(3));
      });
    };
    const onLeave = () => {
      el.style.setProperty('--mx', '0');
      el.style.setProperty('--my', '0');
    };
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  return ref;
}

/**
 * DBL's two drops, the page's background artwork: glossy, layered rims,
 * line-art leaves and water beads inside, a streak of light round each
 * edge, both floating out of step. The feature text shows from lg up;
 * the journey and notices from xl up.
 */
function DblArtwork({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `login-${n}-${uid}`;
  // SMIL motion ignores the CSS reduced-motion rule, so honour it here.
  const [still] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
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

      {/* A slow dotted orbit behind both drops */}
      <g className="login-parallax" style={depth(4)}>
        <ellipse cx={380} cy={300} rx={365} ry={255} className="login-orbit" />
      </g>

      <g className="login-parallax" style={depth(10)}>
        <g className="login-drop">
          <path
            d={GREEN_DROP}
            fill={`url(#${id('green')})`}
            className="login-drop-shadow"
          />
          <g clipPath={`url(#${id('gclip')})`}>
            <path d={GREEN_DROP} fill={`url(#${id('gloss')})`} />
            <Leaf transform="translate(96 470) rotate(-32) scale(1.15)" />
            <Leaf transform="translate(132 500) rotate(4) scale(0.85)" />
          </g>
          <path
            d={GREEN_DROP}
            transform={about(GREEN, 0.93)}
            className="fill-none stroke-white/30"
          />
          <path
            d={GREEN_DROP}
            transform={about(GREEN, 0.86)}
            className="fill-none stroke-white/15"
          />
          <path d={GREEN_DROP} pathLength={100} className="login-drop-streak" />
          <g className="hidden lg:inline">
            <FeatureItem f={greenFeatures[0]} x={122} y={302} align="start" />
            <line
              x1={90}
              x2={362}
              y1={354}
              y2={354}
              className="stroke-white/30"
            />
            <FeatureItem f={greenFeatures[1]} x={122} y={382} align="start" />
          </g>
          <circle
            cx={80}
            cy={260}
            r={5}
            fill={`url(#${id('bead')})`}
            className="login-bead"
          />
        </g>
      </g>

      <g className="login-parallax" style={depth(18)}>
        <g className="login-drop login-drop-blue">
          <path
            d={BLUE_DROP}
            fill={`url(#${id('blue')})`}
            className="login-drop-shadow"
          />
          <path
            d={SPIKE}
            fill={`url(#${id('blue')})`}
            className="login-drop-shadow"
          />
          <path d={SPIKE} fill={`url(#${id('gloss')})`} />
          <g clipPath={`url(#${id('bclip')})`}>
            <path d={BLUE_DROP} fill={`url(#${id('gloss')})`} />
            <Leaf transform="translate(644 352) rotate(-28) scale(0.9)" />
            <Leaf transform="translate(612 372) rotate(4) scale(0.7)" />
          </g>
          <path
            d={BLUE_DROP}
            transform={about(BLUE, 0.93)}
            className="fill-none stroke-white/30"
          />
          <path
            d={BLUE_DROP}
            transform={about(BLUE, 0.86)}
            className="fill-none stroke-white/15"
          />
          <path
            d={BLUE_DROP}
            pathLength={100}
            className="login-drop-streak [animation-delay:-3.5s]"
          />
          <g className="hidden lg:inline">
            <FeatureItem f={blueFeatures[0]} x={620} y={142} align="end" />
            <line
              x1={440}
              x2={664}
              y1={194}
              y2={194}
              className="stroke-white/30"
            />
            <FeatureItem f={blueFeatures[1]} x={620} y={222} align="end" />
          </g>
          <circle
            cx={712}
            cy={250}
            r={4}
            fill={`url(#${id('bead')})`}
            className="login-bead [animation-delay:-2s]"
          />
        </g>
      </g>

      <circle
        cx={300}
        cy={120}
        r={3}
        fill={`url(#${id('bead')})`}
        className="login-bead [animation-delay:-4s]"
      />

      {/* The hiring journey (desktop only) */}
      <g className="login-parallax hidden xl:inline" style={depth(6)}>
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
            <circle
              cx={st.x}
              cy={STAGE_Y}
              r={5}
              className="fill-white stroke-brand-500"
              strokeWidth={2}
            />
            <text
              x={st.x}
              y={STAGE_Y + 24}
              textAnchor="middle"
              className="login-stage-label text-[10.5px] font-semibold uppercase tracking-[0.14em]"
              style={{ animationDelay: pulseDelay(st.at) }}
            >
              {st.label}
            </text>
          </g>
        ))}
        <g transform={`translate(${ARRIVAL.x} ${ARRIVAL.y})`}>
          <circle r={14} className="login-stage-halo fill-accent-400/50" />
          <circle r={11} className="fill-accent-500" />
          <path
            d="M-4.5 0.5 L-1.2 3.8 L4.8 -3"
            className="fill-none stroke-white"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        {!still &&
          TRAVELLERS.map((d) => (
            <Traveller key={d} pathId={id('journey')} delay={d} />
          ))}
      </g>

      {/* Notices float nearest the viewer */}
      <g className="login-parallax hidden xl:inline" style={depth(26)}>
        {NOTICES.map((n, i) => (
          <Notice key={n.text} n={n} delay={i * 3} />
        ))}
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const parallaxRef = useParallax();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#eaf2fa_0%,#f8fafc_45%,#eef6e3_100%)] p-4 lg:p-6 xl:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] animate-blob-1 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[36rem] w-[36rem] animate-blob-2 rounded-full bg-accent-200/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(rgba(24,119,192,0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Phones and tablets: a faint "dbl" behind the card (desktop has it behind the wings) */}
      <DblWatermark className="pointer-events-none absolute bottom-[3vh] left-1/2 w-[92vw] -translate-x-1/2 opacity-[0.07] lg:hidden" />

      {/* Phones and tablets: the drops sit faintly behind the card */}
      <DblArtwork className="pointer-events-none absolute left-1/2 top-1/2 w-[140vw] max-w-[760px] -translate-x-1/2 -translate-y-1/2 overflow-visible opacity-30 lg:hidden" />

      <div className="relative grid w-full max-w-[1320px] items-center gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-5 xl:grid-cols-[1.45fr_1fr] xl:gap-10">
        {/* Desktop: the drops and the hiring journey on the left */}
        <div ref={parallaxRef} className="login-tilt relative hidden lg:block">
          {/* Desktop: the "dbl" watermark sits behind the wings, a little low,
              and tilts with them */}
          <DblWatermark className="pointer-events-none absolute -bottom-[23%] left-1/2 w-[100%] [@media(max-height:800px)]:-bottom-[7%] -translate-x-[34%] opacity-[0.14]" />
          <DblArtwork className="relative h-auto max-h-[calc(100vh-4rem)] w-full -translate-y-[9%] overflow-visible" />
        </div>

        {/* Sign-in on the right */}
        <div className="flex justify-center">
          <div className="relative z-10 w-full max-w-sm animate-rise-in lg:max-w-[340px] xl:max-w-sm">
            <div
              aria-hidden
              className="login-card-glow pointer-events-none absolute -inset-[2px] rounded-[26px]"
            />
            <div className="relative rounded-3xl bg-white/80 p-7 shadow-[0_30px_70px_-30px_rgba(15,42,69,0.45)] ring-1 ring-white/80 backdrop-blur-2xl sm:p-9">
              <div className="mb-7 flex flex-col items-center text-center">
                <Logo size="xl" markClassName="h-20 w-20" withLabel={false} />
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
                    className:
                      'dev-credit-name text-[0.8125rem] font-bold tracking-tight',
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
