import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { Button, Input } from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';
import { DEMO_CREDENTIALS } from '../api/auth.api';

import { loginSchema, type LoginFormValues } from '../schemas/auth.schema';
import { useLogin } from '../hooks/useLogin';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

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
      onSuccess: () => navigate(redirectTo, { replace: true }),
    });
  });

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

      <div className="rounded-2xl border border-slate-200 bg-surface-muted/70 px-4 py-3 text-xs text-slate-500">
        <div className="font-medium text-slate-700">Demo login</div>
        <div className="mt-1 space-y-0.5 font-mono text-[11px] leading-5 text-slate-600">
          <p>{DEMO_CREDENTIALS.email}</p>
          <p>{DEMO_CREDENTIALS.password}</p>
        </div>
      </div>
    </form>
  );
}
