import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2, MailCheck, X } from 'lucide-react';

import { cn } from '@shared/lib';
import { candidatesApi } from '../api/candidates.api';
import { keepProof } from '../applyEmailProof';

const LENGTH = 6;

function errorText(e: unknown, fallback: string): string {
  const m = (e as { message?: unknown } | null)?.message;
  return typeof m === 'string' && m ? m : fallback;
}

/**
 * Six boxes over one real input: typing, pasting a whole code (or a sentence
 * with the code in it), deleting and the phone's one-time-code suggestion all
 * work as they do in any text box, because they are one.
 */
function CodeBoxes({
  value,
  onChange,
  disabled,
  invalid,
  inputRef,
  describedBy,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  invalid: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  describedBy: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, LENGTH - 1);
  return (
    <div className="relative mx-auto w-full max-w-[21rem]">
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5" aria-hidden>
        {Array.from({ length: LENGTH }, (_, i) => {
          const ch = value[i] ?? '';
          const isActive = focused && !disabled && i === active;
          return (
            <div
              key={i}
              className={cn(
                'flex h-12 items-center justify-center rounded-xl border bg-white text-xl font-bold tabular-nums text-slate-900 transition sm:h-14 sm:text-2xl',
                invalid
                  ? 'border-rose-300 bg-rose-50/40'
                  : isActive
                    ? 'border-brand-500 ring-4 ring-brand-100'
                    : ch
                      ? 'border-slate-300'
                      : 'border-slate-200',
                disabled && 'bg-slate-50 text-slate-400',
              )}
            >
              {ch ||
                (isActive && (
                  <span className="h-6 w-px bg-brand-500 motion-safe:animate-pulse" />
                ))}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // Read-only, not disabled: disabling drops the keyboard focus, and
        // after a wrong code they would have to click back in to type.
        readOnly={disabled}
        aria-disabled={disabled || undefined}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={LENGTH}
        aria-label="6-digit code"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        // 16px so iOS does not zoom the page on focus; the boxes show the digits.
        className="absolute inset-0 h-full w-full cursor-text text-base text-transparent caret-transparent opacity-0"
      />
    </div>
  );
}

/**
 * The last step of a careers-page application: prove the email address is
 * theirs. Opening it mails a code; the right six digits submit the
 * application straight away — the applicant never presses Submit twice.
 */
export function VerifyEmailDialog({
  open,
  reqId,
  email,
  name,
  submitting,
  onVerified,
  onChangeEmail,
  onClose,
}: {
  open: boolean;
  reqId: string;
  email: string;
  /** For the greeting in the letter. */
  name: string;
  /** The application itself is on its way, after a code was accepted. */
  submitting: boolean;
  onVerified: (verificationToken: string) => void;
  onChangeEmail: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const lastTried = useRef('');

  const send = useMutation({
    mutationFn: () => candidatesApi.sendApplyEmailCode(reqId, { email, name: name.trim() || undefined }),
    onSuccess: (r) => {
      setCooldown(r.resendInSeconds);
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    },
  });

  const verify = useMutation({
    mutationFn: (c: string) => candidatesApi.verifyApplyEmailCode(reqId, { email, code: c }),
    onSuccess: (r) => {
      keepProof(email, r.verificationToken, r.expiresAt);
      onVerified(r.verificationToken);
    },
    // Empty boxes, still focused: they type the code again; the message stays
    // until they do.
    onError: () => {
      setCode('');
      lastTried.current = '';
      inputRef.current?.focus({ preventScroll: true });
    },
  });

  // One code per opening. A ref, so React's development double-run of
  // effects does not ask twice (the server would keep the first anyway).
  const sentFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      sentFor.current = null;
      return;
    }
    if (sentFor.current === email) return;
    sentFor.current = email;
    setCode('');
    lastTried.current = '';
    verify.reset();
    send.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening, per address
  }, [open, email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // The sixth digit checks the code — once per code typed.
  useEffect(() => {
    if (code.length === LENGTH && code !== lastTried.current && !verify.isPending) {
      lastTried.current = code;
      verify.mutate(code);
    }
  }, [code, verify]);

  const busy = verify.isPending || verify.isSuccess || submitting;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const problem = verify.isError
    ? errorText(verify.error, 'That code could not be checked. Please try again.')
    : send.isError
      ? errorText(send.error, 'We could not send a code just now. Please try again.')
      : null;

  const clock = `${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={busy ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl motion-safe:animate-rise-in"
      >
        {!busy && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <form
          className="px-5 pb-7 pt-9 text-center sm:px-9"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === LENGTH && !busy) {
              lastTried.current = code;
              verify.mutate(code);
            }
          }}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <MailCheck className="h-7 w-7" aria-hidden />
          </div>

          <h2 id={titleId} className="mt-5 text-xl font-bold tracking-tight text-slate-900">
            Verify your email
          </h2>
          <p id={bodyId} className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            {send.isPending ? 'Sending a 6-digit code to' : 'We sent a 6-digit code to'}
            <span className="mt-0.5 block break-all font-semibold text-slate-800">{email}</span>
          </p>

          <div className="mt-6">
            <CodeBoxes
              value={code}
              onChange={(v) => {
                setCode(v);
                if (verify.isError) verify.reset();
              }}
              disabled={busy || send.isPending}
              invalid={verify.isError}
              inputRef={inputRef}
              describedBy={problem ? errorId : bodyId}
            />
          </div>

          <p
            id={errorId}
            role={problem ? 'alert' : undefined}
            className={cn('mt-3 min-h-[1.25rem] text-sm', problem ? 'text-rose-600' : 'text-transparent')}
          >
            {problem ?? ' '}
          </p>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
            <button
              type="button"
              disabled={cooldown > 0 || send.isPending || busy}
              onClick={() => {
                setCode('');
                lastTried.current = '';
                verify.reset();
                send.mutate();
              }}
              className="font-semibold text-brand-600 transition hover:text-brand-700 disabled:cursor-not-allowed disabled:font-medium disabled:text-slate-400"
            >
              {send.isPending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend code in ${clock}`
                  : 'Resend code'}
            </button>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={onChangeEmail}
              className="font-medium text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Wrong address?
            </button>
          </div>

          <button
            type="submit"
            // A refused code stays refused: change a digit to try again, rather
            // than spend another attempt on the same six.
            disabled={code.length !== LENGTH || busy || send.isPending || verify.isError}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-200 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting || verify.isSuccess ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting your application…
              </>
            ) : verify.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              'Verify & submit application'
            )}
          </button>

          <p className="mx-auto mt-4 max-w-xs text-balance text-xs leading-relaxed text-slate-400">
            The code expires in 10 minutes. Can&rsquo;t find it? Check your spam or
            promotions folder.
          </p>
        </form>
      </div>
    </div>,
    document.body,
  );
}
