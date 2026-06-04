import { ShieldCheck } from 'lucide-react';

import { APP_META } from '@shared/constants';
import { Logo } from '@shared/components/ui';
import logoUrl from '@assets/logo.png';

import { LoginForm } from '../components/LoginForm';
import { DEMO_CREDENTIALS } from '../api/auth.api';

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5">
            <img
              src={logoUrl}
              alt="DBL Group"
              className="h-full w-full object-contain"
            />
          </span>
          {APP_META.name}
        </div>

        <div className="max-w-md space-y-5">
          <h1 className="text-3xl font-semibold leading-tight">
            From requisition to onboarding, in one place.
          </h1>
          <p className="text-slate-300">
            Raise manpower requisitions, generate AI role profiles, shortlist
            candidates, and run interviews — a single recruitment workspace
            built for {APP_META.company}.
          </p>
          <div className="flex items-center gap-2 text-sm text-accent-300">
            <ShieldCheck className="h-5 w-5" />
            Secure, role-based access across the hiring lifecycle.
          </div>
        </div>

        <p className="text-sm text-slate-400">
          © {new Date().getFullYear()} {APP_META.company}. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-surface-muted px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to access your HR dashboard.
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Demo credentials</p>
            <p className="mt-1">Email: {DEMO_CREDENTIALS.email}</p>
            <p>Password: {DEMO_CREDENTIALS.password}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
