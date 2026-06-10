import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  Mail,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Input,
  Modal,
  Spinner,
} from '@shared/components/ui';
import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

interface TwoFactorStatus {
  enabled: boolean;
  method: string | null;
  hasEmail: boolean;
}
interface TotpSetup {
  secret: string;
  otpauthUrl: string;
  qr: string;
}

const METHOD_LABEL: Record<string, string> = {
  totp: 'Authenticator app',
  email: 'Email code',
};

export function TwoFactorSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['auth', '2fa'],
    queryFn: () =>
      http.get<ApiResponse<TwoFactorStatus>>('/auth/2fa').then((r) => r.data),
  });
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['auth', '2fa'] });

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
              Two-factor authentication
              {data?.enabled && (
                <Badge tone="success">
                  On · {METHOD_LABEL[data.method ?? ''] ?? data.method}
                </Badge>
              )}
            </p>
            <p className="text-xs text-slate-400">
              Require a one-time code at sign-in for an extra layer of security.
            </p>
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : data?.enabled ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisableOpen(true)}
          >
            Turn off
          </Button>
        ) : (
          <Button size="sm" onClick={() => setSetupOpen(true)}>
            Set up
          </Button>
        )}
      </div>

      <SetupModal
        open={setupOpen}
        hasEmail={Boolean(data?.hasEmail)}
        onClose={() => setSetupOpen(false)}
        onDone={() => {
          setSetupOpen(false);
          refresh();
        }}
      />
      <DisableModal
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        onDone={() => {
          setDisableOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

type Step = 'choose' | 'totp' | 'email';

function SetupModal({
  open,
  hasEmail,
  onClose,
  onDone,
}: {
  open: boolean;
  hasEmail: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<Step>('choose');
  const [totp, setTotp] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setStep('choose');
    setTotp(null);
    setCode('');
    setError('');
  };
  const close = () => {
    reset();
    onClose();
  };

  const startTotp = useMutation({
    mutationFn: () =>
      http
        .post<ApiResponse<TotpSetup>>('/auth/2fa/totp/setup')
        .then((r) => r.data),
    onSuccess: (d) => {
      setTotp(d);
      setStep('totp');
      setCode('');
      setError('');
    },
    onError: (e) => toast.error((e as Error).message || 'Could not start setup'),
  });

  const startEmail = useMutation({
    mutationFn: () =>
      http
        .post<ApiResponse<{ email: string }>>('/auth/2fa/email/start')
        .then((r) => r.data),
    onSuccess: () => {
      setStep('email');
      setCode('');
      setError('');
    },
    onError: (e) => toast.error((e as Error).message || 'Could not send code'),
  });

  const enable = useMutation({
    mutationFn: (path: string) =>
      http
        .post<ApiResponse<{ enabled: boolean }>>(path, { code: code.trim() })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success('Two-factor authentication is on');
      reset();
      onDone();
    },
    onError: (e) => setError((e as Error).message || 'Invalid code'),
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title="Set up two-factor authentication"
      size="sm"
    >
      {step === 'choose' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => startTotp.mutate()}
            disabled={startTotp.isPending}
            className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Smartphone className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-slate-800">
                Authenticator app
              </span>
              <span className="block text-xs text-slate-400">
                Use Google Authenticator, Authy, etc. Works offline. Recommended.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => startEmail.mutate()}
            disabled={!hasEmail || startEmail.isPending}
            className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Mail className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-slate-800">
                Email code
              </span>
              <span className="block text-xs text-slate-400">
                {hasEmail
                  ? 'We email a code each time you sign in.'
                  : 'Add an email to your profile to use this.'}
              </span>
            </span>
          </button>
        </div>
      )}

      {step === 'totp' && totp && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Scan this QR code in your authenticator app, then enter the 6-digit
            code it shows.
          </p>
          <div className="flex justify-center">
            <img
              src={totp.qr}
              alt="2FA QR code"
              className="h-44 w-44 rounded-lg border border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-xs text-slate-500">
              {totp.secret}
            </code>
            <button
              type="button"
              title="Copy secret"
              onClick={async () => {
                await navigator.clipboard.writeText(totp.secret);
                toast.success('Secret copied');
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-brand-600"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <CodeEntry
            code={code}
            setCode={setCode}
            error={error}
            loading={enable.isPending}
            onSubmit={() => enable.mutate('/auth/2fa/totp/enable')}
            onBack={reset}
          />
        </div>
      )}

      {step === 'email' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            We&rsquo;ve emailed you a 6-digit code. Enter it below to turn on
            email two-factor.
          </p>
          <CodeEntry
            code={code}
            setCode={setCode}
            error={error}
            loading={enable.isPending}
            onSubmit={() => enable.mutate('/auth/2fa/email/enable')}
            onBack={reset}
          />
        </div>
      )}
    </Modal>
  );
}

function CodeEntry({
  code,
  setCode,
  error,
  loading,
  onSubmit,
  onBack,
}: {
  code: string;
  setCode: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <Input
        label="Verification code"
        inputMode="numeric"
        placeholder="123456"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        className="text-center text-lg tracking-[0.4em]"
      />
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onSubmit} isLoading={loading} disabled={code.length < 4}>
          Turn on
        </Button>
      </div>
    </div>
  );
}

function DisableModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const disable = useMutation({
    mutationFn: () =>
      http
        .post<ApiResponse<{ enabled: boolean }>>('/auth/2fa/disable', {
          password,
        })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success('Two-factor authentication turned off');
      setPassword('');
      setError('');
      onDone();
    },
    onError: (e) => setError((e as Error).message || 'Could not turn off'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Turn off two-factor authentication"
      size="sm"
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Confirm your password to disable 2FA. Your account will be less secure.
        </p>
        <Input
          type="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => disable.mutate()}
            isLoading={disable.isPending}
            disabled={!password}
          >
            Turn off 2FA
          </Button>
        </div>
      </div>
    </Modal>
  );
}
