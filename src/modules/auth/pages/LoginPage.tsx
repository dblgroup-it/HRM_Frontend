import {
  Bell,
  ClipboardCheck,
  Network,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { Logo } from '@shared/components/ui';

import { LoginForm } from '../components/LoginForm';

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: ClipboardCheck,
    title: 'Requisitions & approvals',
    desc: 'Digital requisitions with a multi-level sign-off chain.',
  },
  {
    icon: Network,
    title: 'Live organogram',
    desc: 'Unit-wise sanctioned seats with real-time vacancies.',
  },
  {
    icon: Sparkles,
    title: 'AI-assisted hiring',
    desc: 'AI role profiles, document checks and exam grading.',
  },
  {
    icon: Bell,
    title: 'Real-time everywhere',
    desc: 'Instant notifications and live updates across units.',
  },
];

export default function LoginPage() {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:items-center lg:justify-center">
        {/* Animated light brand wash */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[length:220%_220%] bg-[linear-gradient(125deg,#e7f1fb,#f3faef,#e4f0fb,#eef6fc)] animate-gradient-pan motion-reduce:animate-none"
        />
        <div
          aria-hidden
          className="absolute -left-24 top-4 h-96 w-96 rounded-full bg-brand-300/40 blur-[90px] animate-blob-1 motion-reduce:animate-none"
        />
        <div
          aria-hidden
          className="absolute bottom-0 right-2 h-80 w-80 rounded-full bg-accent-300/40 blur-[90px] animate-blob-2 motion-reduce:animate-none"
        />
        <div
          aria-hidden
          className="absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-cyan-200/40 blur-[90px] animate-blob-3 motion-reduce:animate-none"
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(rgba(24,119,192,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(24,119,192,0.05) 1px, transparent 1px)',
            backgroundSize: '58px 58px',
          }}
        />

        {/* Centred hero: big logo + headline + features */}
        <div className="relative max-w-md">
          {/* Big logo with rotating glow halo */}
          <div className="mb-8 flex animate-rise-in justify-center">
            <div className="relative w-fit">
              <div
                aria-hidden
                className="absolute -inset-8 rounded-full bg-[conic-gradient(from_0deg,rgba(24,119,192,0.35),rgba(140,198,63,0.35),rgba(34,211,238,0.35),rgba(24,119,192,0.35))] blur-2xl animate-spin-slow motion-reduce:animate-none"
              />
              <div className="relative animate-float motion-reduce:animate-none">
                <Logo size="3xl" withLabel={false} />
              </div>
            </div>
          </div>

          <h1 className="animate-rise-in text-center text-5xl font-bold leading-[1.05] tracking-tight [animation-delay:60ms]">
            <span className="bg-[length:200%_auto] bg-[linear-gradient(90deg,#0f4c7a,#1877c0,#8cc63f,#1877c0,#0f4c7a)] bg-clip-text text-transparent animate-gradient-pan motion-reduce:animate-none">
              Hire to retire,
            </span>
            <br />
            <span className="text-ink-dark">in one place.</span>
          </h1>
          <p className="mt-5 animate-rise-in text-center text-base leading-7 text-slate-500 [animation-delay:120ms]">
            From hiring and onboarding to everyday HR — DBL Group&rsquo;s
            complete people management platform, all in one place.
          </p>

          <div className="mt-9 space-y-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group flex animate-rise-in items-start gap-4 rounded-2xl border border-white/70 bg-white/55 p-3.5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-100 hover:bg-white/90 hover:shadow-[0_14px_30px_-18px_rgba(24,119,192,0.5)]"
                style={{ animationDelay: `${180 + i * 90}ms` }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-ink-dark">{f.title}</p>
                  <p className="text-sm leading-6 text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-8 left-12 animate-rise-in text-xs text-slate-400 [animation-delay:560ms]">
          © {new Date().getFullYear()} DBL Group · HR Management System
        </p>
      </section>

      {/* Sign-in panel */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 py-10 sm:px-8 lg:min-h-0">
        {/* faint animated accent so the white side isn't dead-flat */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 h-72 w-72 rounded-full bg-brand-50 blur-3xl animate-blob-3 motion-reduce:animate-none lg:hidden"
        />
        <div className="relative w-full max-w-md animate-rise-in">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="relative mb-6 lg:hidden">
              <div
                aria-hidden
                className="absolute -inset-4 rounded-full bg-[conic-gradient(from_0deg,rgba(24,119,192,0.3),rgba(140,198,63,0.3),rgba(24,119,192,0.3))] blur-xl animate-spin-slow motion-reduce:animate-none"
              />
              <div className="relative animate-float motion-reduce:animate-none">
                <Logo size="xl" withLabel={false} />
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
              Welcome back
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-dark">
              Sign in to your workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your credentials to access requisitions, candidates and
              onboarding.
            </p>
          </div>

          <LoginForm />

          <p className="mt-10 text-center text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
            DBL HR Management System
          </p>
        </div>
      </section>
    </main>
  );
}
