import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';

import { Button, Input } from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';

import { loginSchema, type LoginFormValues } from '../schemas/auth.schema';
import { useLogin, useVerifyTwoFactor } from '../hooks/useLogin';
import {
  isTwoFactorChallenge,
  type TwoFactorChallenge,
} from '../types/auth.types';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const verify = useVerifyTwoFactor();
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [code, setCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? ROUTES.dashboard;

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: (result) => {
        if (isTwoFactorChallenge(result)) {
          setChallenge(result);
          setCode('');
        } else {
          navigate(redirectTo, { replace: true });
        }
      },
    });
  });

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    verify.mutate(
      { challengeToken: challenge.challengeToken, code: code.trim() },
      { onSuccess: () => navigate(redirectTo, { replace: true }) },
    );
  };

  // --- Step 2: two-factor code ---
  if (challenge) {
    return (
      <form onSubmit={submitCode} className="space-y-5" noValidate>
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h3 className="text-lg font-semibold text-ink-dark">
            Two-factor verification
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {challenge.method === 'totp'
              ? 'Enter the 6-digit code from your authenticator app.'
              : `Enter the 6-digit code we emailed to ${challenge.email ?? 'your email'}.`}
          </p>
        </div>

        <Input
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center text-lg tracking-[0.4em]"
        />

        {verify.isError && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {(verify.error as Error).message}
          </p>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={verify.isPending}
          disabled={code.length < 4}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Verify &amp; sign in
        </Button>

        <button
          type="button"
          onClick={() => setChallenge(null)}
          className="mx-auto flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </button>
      </form>
    );
  }

  // --- Step 1: email + password ---
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@dbl-group.com"
        leftIcon={<Mail className="h-4 w-4" />}
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        placeholder="••••••••"
        leftIcon={<Lock className="h-4 w-4" />}
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            {...register('remember')}
          />
          Remember me
        </label>
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      {login.isError && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {(login.error as Error).message}
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        isLoading={login.isPending}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        Sign in
      </Button>
    </form>
  );
}
