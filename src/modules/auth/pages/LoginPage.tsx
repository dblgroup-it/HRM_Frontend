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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-3 sm:p-6">
      {/* One floating rounded panel, like the app content area */}
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 lg:grid-cols-2">
        {/* Brand side */}
        <section className="relative hidden flex-col justify-center gap-8 bg-gradient-to-br from-brand-50 via-white to-accent-50 p-12 lg:flex">
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
            <h1 className="mt-6 text-center text-4xl font-bold leading-[1.05] tracking-tight">
              <span className="bg-[linear-gradient(90deg,#0f4c7a,#1877c0,#8cc63f)] bg-clip-text text-transparent">
                Hire to retire,
              </span>
              <br />
              <span className="text-ink-dark">in one place.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-center text-sm leading-7 text-slate-500">
              DBL Group&rsquo;s complete people-management platform — from hiring
              and onboarding to everyday HR.
            </p>
          </div>

          <div className="relative space-y-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 backdrop-blur-sm"
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
              <div className="mb-6 lg:hidden">
                <Logo size="xl" withLabel={false} />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
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
