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

/** Ambient animated backdrop — three slow-drifting brand-colored blobs plus a
 * faint grid. Sits behind everything, on every breakpoint, so the "modern
 * animated" feel reaches mobile too, not just the desktop brand panel. */
function AnimatedBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(24,119,192,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(24,119,192,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute -left-24 -top-24 h-[26rem] w-[26rem] animate-blob-1 rounded-full bg-brand-300/40 blur-3xl" />
      <div className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] animate-blob-2 rounded-full bg-accent-300/40 blur-3xl" />
      <div className="absolute left-1/2 top-1/3 h-[22rem] w-[22rem] -translate-x-1/2 animate-blob-3 rounded-full bg-brand-200/30 blur-3xl" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-3 sm:p-6">
      <AnimatedBackdrop />

      {/* One floating rounded panel, like the app content area */}
      <div className="relative grid w-full max-w-5xl animate-rise-in overflow-hidden rounded-3xl bg-white/90 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur-xl lg:grid-cols-2">
        {/* Brand side */}
        <section className="relative hidden flex-col justify-center gap-8 overflow-hidden bg-gradient-to-br from-brand-50 via-white to-accent-50 p-12 lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(140,198,63,0.12),transparent)] bg-[length:200%_100%] opacity-80 [animation:gradient-pan_10s_ease_infinite]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(rgba(24,119,192,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(24,119,192,0.05) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />
          <div className="relative">
            <div className="flex justify-center">
              <Logo size="3xl" withLabel={false} />
            </div>

            <span className="mx-auto mt-6 flex w-fit items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand-700 shadow-sm ring-1 ring-brand-100 animate-fade-in [animation-delay:150ms] [animation-fill-mode:both]">
              <Sparkles className="h-3 w-3 text-accent-500" />
              The Future of Hiring
            </span>

            <h1 className="mt-4 text-center text-4xl font-bold leading-[1.05] tracking-tight animate-rise-in [animation-delay:200ms] [animation-fill-mode:both]">
              <span className="bg-[linear-gradient(90deg,#0f4c7a,#1877c0,#8cc63f)] bg-[length:200%_auto] bg-clip-text text-transparent [animation:gradient-pan_6s_ease_infinite]">
                Smarter Sourcing,
              </span>
              <br />
              <span className="text-ink-dark">Seamless Integration.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-center text-sm leading-7 text-slate-500 animate-fade-in [animation-delay:350ms] [animation-fill-mode:both]">
              DBL Group&rsquo;s complete people-management platform — from hiring
              and onboarding to everyday HR.
            </p>
          </div>

          <div className="relative space-y-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                style={{ animationDelay: `${420 + i * 90}ms` }}
                className="flex animate-rise-in items-start gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-sm transition-all duration-300 [animation-fill-mode:both] hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-card-hover"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-sm">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-dark">{f.title}</p>
                  <p className="text-xs leading-5 text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Form side */}
        <section className="flex items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-4 flex flex-col items-center gap-3 lg:hidden">
                <Logo size="xl" withLabel={false} />
                <p className="text-center text-sm font-medium text-slate-500">
                  <span className="bg-[linear-gradient(90deg,#0f4c7a,#1877c0,#8cc63f)] bg-clip-text text-transparent">
                    Smarter Sourcing, Seamless Integration.
                  </span>
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
                Welcome back
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink-dark sm:text-[28px]">
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
      </div>
    </main>
  );
}
