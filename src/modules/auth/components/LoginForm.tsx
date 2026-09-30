import { useEffect, useState } from 'react';
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
import { loadRememberedEmail, savedPasswordFor } from '../rememberedLogin';
import { ForgotPasswordFlow } from './ForgotPasswordFlow';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const verify = useVerifyTwoFactor();
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [code, setCode] = useState('');
  const [forgot, setForgot] = useState(false);

  // Read once: the email a previous "Remember me" kept.
  const [rememberedEmail] = useState(loadRememberedEmail);
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail ?? '',
      password: '',
      remember: true,
    },
  });

  // Fill the password too, when the browser will hand it over without asking.
  // Otherwise its own autofill does it, keyed on the email above.
  useEffect(() => {
    if (!rememberedEmail) return;
    let live = true;
    void savedPasswordFor(rememberedEmail).then((pw) => {
      if (live && pw && !getValues('password')) {
        setValue('password', pw, { shouldValidate: false });
      }
    });
    return () => {
      live = false;
    };
  }, [rememberedEmail, getValues, setValue]);

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
      {
        onSuccess: () => navigate(redirectTo, { replace: true }),
      },
    );
  };

  // --- Forgot password: its own three steps, inside the same card ---
  if (forgot) {
    return (
      <ForgotPasswordFlow
        initialEmail={getValues('email')}
        onBack={(email) => {
          setForgot(false);
          if (email) setValue('email', email);
          setValue('password', '');
        }}
      />
    );
  }

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
        // "username" is what password managers pair a saved password with;
        // "email" alone is treated as a contact field, not a login.
        autoComplete="username"
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
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-600"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
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
          onClick={() => {
            login.reset();
            setForgot(true);
          }}
          className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          Forgot password?
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
