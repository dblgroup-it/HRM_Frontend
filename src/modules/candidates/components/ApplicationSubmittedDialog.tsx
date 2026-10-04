import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Check, ClipboardList, Copy, ShieldCheck, X } from 'lucide-react';

import { ROUTES } from '@app/router/paths';

/**
 * What an applicant sees the moment the careers-page form goes through.
 *
 * The wording is DBL's own. The Application ID is the one in their
 * confirmation email, so it can be quoted before that arrives.
 */
export function ApplicationSubmittedDialog({
  open,
  onClose,
  position,
  applicationId,
  email,
}: {
  open: boolean;
  onClose: () => void;
  position: string;
  applicationId?: string | null;
  /** Opens the status page already looking up their applications. */
  email: string;
}) {
  const titleId = useId();
  const bodyId = useId();
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // The first action, not the dialog itself: focusing the container paints
    // the app's focus ring around the whole card.
    primaryRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  if (!open) return null;

  const copyId = () => {
    if (!applicationId) return;
    navigator.clipboard
      ?.writeText(applicationId)
      .then(() => setCopied(true))
      .catch(() => undefined);
  };

  const statusLink = `${ROUTES.applyStatus}?email=${encodeURIComponent(email.trim())}`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl motion-safe:animate-rise-in"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 pb-7 pt-9 text-center sm:px-9">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/25 ring-8 ring-emerald-50 motion-safe:animate-loader-pop">
            <Check className="h-8 w-8 text-white" strokeWidth={3} aria-hidden />
          </div>

          <h2
            id={titleId}
            className="mt-6 text-xl font-bold tracking-tight text-slate-900 sm:text-[1.375rem]"
          >
            Application Submitted Successfully!
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-700">
            Thank you for your interest in DBL Group.
          </p>

          <p id={bodyId} className="mt-4 text-balance text-sm leading-relaxed text-slate-500">
            Your application for{' '}
            <span className="font-semibold text-slate-800">{position}</span> has
            been successfully submitted. Our HR Team will review your profile
            against the position requirements. If your profile is shortlisted,
            you will be contacted regarding the next stage of the recruitment
            process.
          </p>

          {applicationId && (
            <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-3.5 pr-1.5 text-xs">
              <span className="text-slate-500">Application ID</span>
              <span className="truncate text-[0.8125rem] font-bold tabular-nums tracking-wide text-slate-800">
                {applicationId}
              </span>
              <button
                type="button"
                onClick={copyId}
                aria-label={copied ? 'Copied' : 'Copy Application ID'}
                title={copied ? 'Copied' : 'Copy'}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-brand-600"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-[0.8125rem] font-bold tracking-wide text-brand-700">
              <ShieldCheck className="h-4 w-4 text-accent-600" aria-hidden />
              Fair. Transparent. Merit-Based.
            </span>
          </div>

          <p className="mt-5 text-balance text-sm text-slate-500">
            Thank you for choosing to explore your career with DBL Group.
          </p>

          <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
            <Link
              ref={primaryRef}
              to={statusLink}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-200 transition hover:bg-brand-700 active:scale-[0.98]"
            >
              <ClipboardList className="h-4 w-4" aria-hidden />
              Track application
            </Link>
            <Link
              to={ROUTES.careers}
              className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600 active:scale-[0.98]"
            >
              Browse more jobs
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
