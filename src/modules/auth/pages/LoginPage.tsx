import { Logo } from '@shared/components/ui';

import { LoginForm } from '../components/LoginForm';

const highlights = ['Live updates', 'Unit aware', 'Fresh data'] as const;

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(241,132,89,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(248,181,142,0.2),transparent_26%),linear-gradient(135deg,#f7efe9_0%,#eef3f9_100%)] text-ink">
      <div
        aria-hidden
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            'linear-gradient(rgba(24,119,192,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(24,119,192,0.05) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid w-full overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_28px_80px_-42px_rgba(31,45,58,0.42)] backdrop-blur-sm lg:min-h-[680px] lg:grid-cols-[1.06fr_0.94fr]">
          <div className="relative overflow-hidden bg-[linear-gradient(145deg,#f0a27f_0%,#f4bf9a_42%,#f8f5ef_100%)] px-6 py-8 sm:px-8 sm:py-10">
            <div
              aria-hidden
              className="absolute -right-16 top-14 h-64 w-64 rounded-full bg-white/18 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -left-20 bottom-2 h-56 w-56 rounded-full bg-brand-600/10 blur-3xl"
            />

            <div className="flex h-full min-h-[420px] items-center justify-center sm:min-h-[520px] lg:min-h-[620px]">
              <div className="max-w-md text-center text-ink-dark">
                <div className="flex justify-center pb-4 sm:pb-5">
                  <div className="relative w-fit">
                    <div
                      aria-hidden
                      className="absolute inset-[-22px] -z-10 rounded-full bg-white/30 blur-3xl"
                    />
                    <Logo
                      withLabel={false}
                      size="lg"
                      className="mx-auto scale-[3.1] drop-shadow-[0_18px_32px_rgba(31,45,58,0.2)] saturate-[1.05] sm:scale-[3.5]"
                    />
                  </div>
                </div>

                <div className="mt-14 space-y-5 sm:mt-16">
                  <div className="space-y-4">
                    <p className="mx-auto max-w-sm text-sm leading-7 text-ink/75 sm:text-base">
                      Requisitions, approvals, and unit-level visibility, all in
                      one place.
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2.5">
                    {highlights.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-xs font-medium text-ink shadow-sm backdrop-blur"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center bg-white px-5 py-6 sm:px-8 sm:py-10">
            <div className="w-full max-w-md">
              <div className="mb-10 space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight text-ink-dark sm:text-3xl">
                  Sign in
                </h2>
                <p className="max-w-sm text-sm leading-7 text-slate-500">
                  Access your workspace with a clean, focused sign-in.
                </p>
              </div>

              <LoginForm />

              <p className="mt-8 text-center text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
                DBL HR Management System
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
