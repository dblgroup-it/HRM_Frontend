import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MailCheck,
} from 'lucide-react';

import { Button, Input } from '@shared/components/ui';

import { authApi } from '../api/auth.api';

/** Mirror the backend defaults (PASSWORD_MIN/MAX_LENGTH); the server has the final say. */
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 12;
/** Matches RESET_RESEND_COOLDOWN_MS on the server. */
const RESEND_COOLDOWN_S = 60;

type Step = 'email' | 'code' | 'password' | 'done';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorText(e: unknown): string | null {
  if (!e) return null;
  return (
    (e as { message?: string }).message ??
    'Something went wrong. Please try again.'
  );
}

/**
 * Forgot password, in three steps inside the sign-in card: email → the
 * 6-digit code mailed to it → a new password. Only accounts that can sign in
 * get a code; the screen never says whether an address is registered, so the
 * wording after step 1 is conditional on purpose.
 */
export function ForgotPasswordFlow({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  /** Return to sign-in, with the email to prefill. */
  onBack: (email: string) => void;
}) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const request = useMutation({
    mutationFn: (addr: string) => authApi.requestPasswordReset(addr),
    onSuccess: () => {
      setStep('code');
      setCode('');
      setCooldown(RESEND_COOLDOWN_S);
    },
  });
  const verify = useMutation({
    mutationFn: authApi.verifyResetCode,
    onSuccess: (res) => {
      setResetToken(res.resetToken);
      setStep('password');
    },
  });
  const reset = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => setStep('done'),
  });

  const emailOk = EMAIL_RE.test(email.trim());
  const badLength =
    password.length > 0 &&
    (password.length < MIN_PASSWORD_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH);
  const mismatch = confirm.length > 0 && confirm !== password;
  const passwordReady =
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH &&
    confirm === password;

  const header = (
    icon: React.ReactNode,
    title: string,
    body: React.ReactNode
  ) => (
    <div className="mb-5 flex flex-col items-center text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-ink-dark">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );

  const errorBox = (e: unknown) => {
    const text = errorText(e);
    return text ? (
      <p
        role="alert"
        className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {text}
      </p>
    ) : null;
  };

  const back = (
    <button
      type="button"
      onClick={() => onBack(email.trim())}
      className="mx-auto flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
    >
      <ArrowLeft className="h-4 w-4" /> Back to sign in
    </button>
  );

  if (step === 'email') {
    return (
      <form
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (emailOk) request.mutate(email.trim());
        }}
      >
        {header(
          <KeyRound className="h-6 w-6" />,
          'Forgot your password?',
          'Enter the email you sign in with. If your account has access, we will email you a 6-digit code.'
        )}
        <Input
          label="Email address"
          type="email"
          autoComplete="username"
          placeholder="you@dbl-group.com"
          leftIcon={<Mail className="h-4 w-4" />}
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {errorBox(request.error)}
        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={request.isPending}
          disabled={!emailOk}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Send code
        </Button>
        {back}
      </form>
    );
  }

  if (step === 'code') {
    return (
      <form
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 6) verify.mutate({ email: email.trim(), code });
        }}
      >
        {header(
          <MailCheck className="h-6 w-6" />,
          'Check your email',
          <>
            If{' '}
            <span className="font-medium text-slate-700">{email.trim()}</span>{' '}
            belongs to an account with access, a 6-digit code is on its way. It
            expires in 10 minutes.
          </>
        )}
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
        {errorBox(verify.error)}
        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={verify.isPending}
          disabled={code.length !== 6}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Verify code
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStep('email');
              verify.reset();
            }}
            className="text-slate-500 hover:text-slate-700"
          >
            Use a different email
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || request.isPending}
            onClick={() => request.mutate(email.trim())}
            className="font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
        {back}
      </form>
    );
  }

  if (step === 'password') {
    const toggle = (
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    );
    return (
      <form
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (passwordReady)
            reset.mutate({ resetToken, newPassword: password });
        }}
      >
        {header(
          <Lock className="h-6 w-6" />,
          'Choose a new password',
          `${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters, and not your employee code.`
        )}
        <Input
          label="New password"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          rightElement={toggle}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={
            badLength
              ? `Use ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`
              : undefined
          }
        />
        <Input
          label="Confirm new password"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'The two passwords do not match.' : undefined}
        />
        {errorBox(reset.error)}
        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={reset.isPending}
          disabled={!passwordReady}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Reset password
        </Button>
        {back}
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {header(
        <CheckCircle2 className="h-6 w-6 text-accent-600" />,
        'Password reset',
        'Your password has been changed, and anywhere you were signed in has been signed out. Sign in with your new password.'
      )}
      <Button
        type="button"
        fullWidth
        size="lg"
        onClick={() => onBack(email.trim())}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        Back to sign in
      </Button>
    </div>
  );
}
