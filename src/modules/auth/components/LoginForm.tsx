import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { Button, Input } from '@shared/components/ui';
import { ROUTES } from '@app/router/paths';

import { loginSchema, type LoginFormValues } from '../schemas/auth.schema';
import { useLogin } from '../hooks/useLogin';
import { DEMO_CREDENTIALS } from '../api/auth.api';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
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

  const fillDemo = () => {
    setValue('email', DEMO_CREDENTIALS.email);
    setValue('password', DEMO_CREDENTIALS.password);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
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

      <div className="flex items-center justify-between">
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
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
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
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {(login.error as Error).message}
        </p>
      )}

      <Button type="submit" fullWidth size="lg" isLoading={login.isPending}>
        Sign in
      </Button>

      <button
        type="button"
        onClick={fillDemo}
        className="w-full text-center text-xs text-slate-400 hover:text-brand-600"
      >
        Use demo credentials
      </button>
    </form>
  );
}
