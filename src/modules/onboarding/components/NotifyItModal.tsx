import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  AtSign,
  CalendarDays,
  Check,
  Eye,
  History,
  IdCard,
  Loader2,
  MailPlus,
  PenLine,
  Search,
  Send,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { Avatar, Portal, Spinner } from '@shared/components/ui';
import { useDebounce } from '@shared/hooks';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { useEmployees } from '@modules/employees';

import {
  useItRequestDraft,
  useItRequestPreview,
  useSendItRequest,
} from '../hooks/useItRequest';
import type { ItCcLookup, ItRequestInput } from '../types/itRequest.types';

/** Loose on purpose — the server checks too, and names the bad address. */
const EMAIL = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()".]{2,}$/;
const isEmail = (v: string) => EMAIL.test(v.trim());

/** As many as the API takes. */
const MAX_CC = 10;

interface Leaver {
  name: string;
  code: string | null;
  email: string;
  reason: string | null;
  include: boolean;
  found: boolean;
}

/**
 * Where one CC pick stands. Every pick ends in one of the settled states —
 * `waiting` lasts only while the preview is on its way, never past an answer
 * or a failure.
 */
type CcState =
  | { kind: 'waiting' }
  | { kind: 'ok'; email: string }
  | { kind: 'none' }
  | { kind: 'to'; email: string }
  | { kind: 'duplicate'; email: string }
  | { kind: 'failed' };

/** Somebody HR chose to copy — the address is the server's to look up. */
interface CcPick {
  code: string;
  name: string;
  designation: string | null;
  avatarUrl?: string | null;
}

/**
 * "Notify IT" — ask IT for the new hire's work email, in DBL's own format.
 *
 * Form on the left, the email exactly as IT will receive it on the right, so
 * nobody sends a request they have not read (on a phone the two are tabs).
 * For a replacement hire the leavers are listed too, switched on for deletion
 * when the directory knows their address (a transfer is not: they are still
 * with the group). Nobody is copied unless HR adds them from the directory —
 * the requester included (owner's decision, 2026-10-13).
 */
export function NotifyItModal({
  candidateId,
  open,
  onClose,
}: {
  candidateId: string;
  open: boolean;
  onClose: () => void;
}) {
  const draft = useItRequestDraft(candidateId, open);
  const send = useSendItRequest(candidateId);

  const [preferredEmail, setPreferredEmail] = useState('');
  const [platform, setPlatform] = useState('Google');
  const [purpose, setPurpose] = useState('');
  const [leavers, setLeavers] = useState<Leaver[]>([]);
  const [cc, setCc] = useState<CcPick[]>([]);
  const [picking, setPicking] = useState(false);
  const [ready, setReady] = useState(false);
  const [pane, setPane] = useState<'form' | 'preview'>('form');

  // Start from the server's draft each time the dialog opens.
  const d = draft.data;
  useEffect(() => {
    if (!open) {
      setReady(false);
      setPicking(false);
      setPane('form');
      return;
    }
    if (!d) return;
    setPreferredEmail(d.preferredEmail);
    setPlatform(d.platform);
    setPurpose(d.purpose);
    setLeavers(d.deletions.map((l) => ({ ...l })));
    setCc(
      d.cc.map(({ code, name, designation }) => ({ code, name, designation }))
    );
    setReady(true);
  }, [open, d]);

  const busy = send.isPending;
  const close = () => {
    if (!busy) onClose();
  };

  // Escape closes (the directory search takes it first), and the page behind
  // does not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  const input: ItRequestInput = useMemo(
    () => ({
      preferredEmail: preferredEmail.trim() || undefined,
      platform,
      purpose: purpose.trim() || undefined,
      deletions: leavers
        .filter((l) => l.include)
        .map(({ name, code, email, reason }) => ({
          name,
          code,
          email,
          reason,
        })),
      ccCodes: cc.length ? cc.map((c) => c.code) : undefined,
    }),
    [preferredEmail, platform, purpose, leavers, cc]
  );
  const debounced = useDebounce(input, 350);
  // Only once the form holds the draft, and only once typing has paused —
  // the last preview stays on screen in between.
  const preview = useItRequestPreview(
    candidateId,
    open && ready && debounced === input ? debounced : null
  );

  /** code → the server's answer for that pick. */
  const lookups = useMemo(() => {
    const m = new Map<string, ItCcLookup>();
    for (const c of d?.cc ?? []) m.set(c.code, { ...c, skip: null });
    for (const c of preview.data?.cc ?? []) m.set(c.code, c);
    return m;
  }, [d, preview.data]);
  // The preview for exactly this form has come back (or failed): from here a
  // pick with no answer is a failure, not something still to wait for.
  const lookupFailed = preview.isError && !preview.isFetching;
  const lookupDone =
    debounced === input &&
    !preview.isFetching &&
    (preview.isError || (preview.isSuccess && !preview.isPlaceholderData));
  const ccState = (code: string): CcState => {
    const l = lookups.get(code);
    if (l) {
      if (!l.email) return { kind: 'none' };
      if (l.skip) return { kind: l.skip, email: l.email };
      return { kind: 'ok', email: l.email };
    }
    return lookupFailed || lookupDone
      ? { kind: 'failed' }
      : { kind: 'waiting' };
  };
  const ccStates = cc.map((c) => ({ ...c, state: ccState(c.code) }));
  const onCcCount = ccStates.filter(
    (c) => c.state.kind !== 'to' && c.state.kind !== 'duplicate'
  ).length;

  const preferredBad =
    Boolean(preferredEmail.trim()) && !isEmail(preferredEmail);
  const leaverBad = leavers.some((l) => l.include && !isEmail(l.email));
  const ccNoEmail = ccStates.find((c) => c.state.kind === 'none');
  const ccFailed = ccStates.some((c) => c.state.kind === 'failed');
  const canSend =
    Boolean(d?.deliverable) &&
    !preferredBad &&
    !leaverBad &&
    !ccNoEmail &&
    !ccFailed &&
    !busy;

  const blocker = !d
    ? null
    : !d.deliverable
      ? 'Outgoing email is switched off'
      : preferredBad
        ? 'The preferred address is not an email address'
        : leaverBad
          ? 'Enter the leaver’s email address, or switch it off'
          : ccNoEmail
            ? `${ccNoEmail.name} has no email on file — remove them from CC`
            : ccFailed
              ? 'Could not look up a CC address — try again'
              : null;

  const setLeaver = (i: number, patch: Partial<Leaver>) =>
    setLeavers((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const addCc = (p: CcPick) =>
    setCc((list) =>
      list.some((c) => c.code === p.code) || list.length >= MAX_CC
        ? list
        : [...list, p]
    );

  const resend = Boolean(d?.previous);
  const deleting = leavers.filter((l) => l.include).length;

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div
          aria-hidden
          onClick={close}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-safe:animate-fade-in"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notify-it-title"
          className="relative flex h-[calc(100dvh-1rem)] w-full max-w-[80rem] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 motion-safe:animate-rise-in sm:h-[min(54rem,calc(100dvh-2rem))]"
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-3 border-b border-slate-100 px-4 py-3.5 sm:gap-x-3.5 sm:px-6 sm:py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 motion-safe:animate-float sm:h-11 sm:w-11">
              <MailPlus className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.625rem] font-semibold uppercase tracking-widest text-slate-400 sm:text-[0.6875rem]">
                Onboarding · work email
              </p>
              <h2
                id="notify-it-title"
                className="truncate text-base font-semibold text-slate-900 sm:text-lg"
              >
                {resend ? 'Send the request to IT again' : 'Notify IT'}
                {d && (
                  <span className="hidden font-normal text-slate-400 sm:inline">
                    {' '}
                    · {d.employee.name}
                  </span>
                )}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              aria-label="Close"
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
            {d && <PaneSwitch value={pane} onChange={setPane} />}
          </header>

          {/* ── Body ───────────────────────────────────────────────── */}
          {draft.isLoading || !d ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-8">
              {draft.isError ? (
                <p className="flex items-center gap-2 text-sm text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                  {(draft.error as Error)?.message ||
                    'Could not load the request.'}
                </p>
              ) : (
                <Spinner />
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              {/* The form */}
              <div
                className={cn(
                  'min-h-0 w-full overflow-y-auto overscroll-contain lg:block lg:w-[27rem] lg:shrink-0 lg:border-r lg:border-slate-100 xl:w-[29rem]',
                  pane === 'preview' && 'hidden'
                )}
              >
                <div className="space-y-6 px-4 py-5 sm:px-6">
                  {!d.deliverable && (
                    <div className="flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800 motion-safe:animate-card-in">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Outgoing email is switched off, so IT would not receive
                        this. Turn on the master email switch on Integrations,
                        or record the work email by hand.
                      </span>
                    </div>
                  )}

                  {resend && d.previous && (
                    <div className="flex gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-xs leading-5 text-slate-600 motion-safe:animate-card-in">
                      <History className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        Last sent{' '}
                        {formatDate(d.previous.lastSentAt, 'dd MMM yyyy, p')} by{' '}
                        <span className="font-medium text-slate-700">
                          {d.previous.sentByName}
                        </span>
                        . Sending again gives IT a new link; the old one stops
                        working.
                      </span>
                    </div>
                  )}

                  {/* The hire */}
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-4 shadow-sm motion-safe:animate-card-in">
                    <div className="flex items-center gap-3">
                      <Avatar name={d.employee.name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {d.employee.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {[d.employee.designation, d.employee.department]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {d.employee.unit}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Fact
                        icon={<IdCard className="h-3.5 w-3.5" />}
                        warn={!d.employee.employeeId}
                      >
                        {d.employee.employeeId
                          ? `ID ${d.employee.employeeId}`
                          : 'No employee ID yet'}
                      </Fact>
                      {d.employee.joiningDate && (
                        <Fact icon={<CalendarDays className="h-3.5 w-3.5" />}>
                          Joins{' '}
                          {formatDate(d.employee.joiningDate, 'dd MMM yyyy')}
                        </Fact>
                      )}
                    </div>
                  </div>

                  {/* ① The new account */}
                  <Section n={1} title="New email account" delay={40}>
                    <div className="space-y-4">
                      <Field
                        label="Preferred address"
                        hint="optional"
                        error={
                          preferredBad ? 'Not an email address' : undefined
                        }
                        note={
                          preferredBad
                            ? undefined
                            : 'Leave blank and IT will choose the address.'
                        }
                      >
                        <div
                          className={cn(
                            'flex items-center rounded-xl border bg-white transition focus-within:ring-2 focus-within:ring-brand-500/25',
                            preferredBad
                              ? 'border-rose-300'
                              : 'border-slate-200 focus-within:border-brand-400'
                          )}
                        >
                          <AtSign className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
                          <input
                            type="email"
                            value={preferredEmail}
                            onChange={(e) => setPreferredEmail(e.target.value)}
                            placeholder="e.g. quality.accessories@glory-dbl.com"
                            className="h-10 min-w-0 flex-1 rounded-xl bg-transparent px-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </div>
                      </Field>

                      <Field label="Email platform">
                        <div
                          role="radiogroup"
                          className="grid grid-cols-2 gap-2"
                        >
                          {d.platforms.map((p) => {
                            const on = platform === p;
                            return (
                              <button
                                key={p}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => setPlatform(p)}
                                className={cn(
                                  'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200',
                                  on
                                    ? 'border-brand-400 bg-brand-50/60 text-slate-900 shadow-sm ring-2 ring-brand-400/25'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm motion-safe:hover:-translate-y-px'
                                )}
                              >
                                <span className="truncate">{p}</span>
                                <span
                                  className={cn(
                                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
                                    on
                                      ? 'scale-100 border-brand-600 bg-brand-600 text-white'
                                      : 'scale-90 border-slate-300 text-transparent'
                                  )}
                                >
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </Field>

                      <Field label="Purpose">
                        <textarea
                          rows={3}
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25 focus-visible:ring-offset-0"
                        />
                      </Field>
                    </div>
                  </Section>

                  {/* ② Who else sees it */}
                  <Section n={2} title="Add on CC" hint="optional" delay={80}>
                    {cc.length === 0 && !picking && (
                      <p className="mb-3 text-xs leading-5 text-slate-500">
                        Nobody is on CC. Add colleagues from the employee
                        directory if they should see this request — or skip it.
                      </p>
                    )}

                    {cc.length > 0 && (
                      <ul className="mb-2.5 space-y-2">
                        {ccStates.map((c) => {
                          const st = c.state;
                          return (
                            <li
                              key={c.code}
                              className={cn(
                                'flex items-center gap-3 rounded-2xl border bg-white px-3 py-2 motion-safe:animate-card-in',
                                st.kind === 'none' || st.kind === 'failed'
                                  ? 'border-rose-200'
                                  : st.kind === 'to' || st.kind === 'duplicate'
                                    ? 'border-amber-200'
                                    : 'border-slate-200'
                              )}
                            >
                              <Avatar
                                name={c.name}
                                src={c.avatarUrl}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">
                                  {c.name}
                                  {c.designation && (
                                    <span className="font-normal text-slate-400">
                                      {' '}
                                      · {c.designation}
                                    </span>
                                  )}
                                </p>
                                <CcStatus
                                  state={st}
                                  onRetry={() => void preview.refetch()}
                                />
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove ${c.name} from CC`}
                                onClick={() =>
                                  setCc((list) =>
                                    list.filter((x) => x.code !== c.code)
                                  )
                                }
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <Reveal open={picking}>
                      <CcPicker
                        active={picking}
                        picked={cc.map((c) => c.code)}
                        onPick={(p) => addCc(p)}
                        onDone={() => setPicking(false)}
                      />
                    </Reveal>

                    {!picking && cc.length < MAX_CC && (
                      <button
                        type="button"
                        onClick={() => setPicking(true)}
                        className="group flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-left transition-all duration-200 hover:border-brand-300 hover:bg-brand-50/40"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200 transition-transform duration-200 group-hover:-translate-y-0.5">
                          <UserPlus className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-800">
                            {cc.length
                              ? 'Add another on CC'
                              : 'Add from employee directory'}
                          </span>
                          <span className="block text-xs text-slate-500">
                            Search by name, code or designation
                          </span>
                        </span>
                      </button>
                    )}
                  </Section>

                  {/* ③ The leavers */}
                  {leavers.length > 0 && (
                    <Section
                      n={3}
                      title="Leaver’s email"
                      hint={`replaces ${leavers.length > 1 ? `${leavers.length} people` : 'one person'}`}
                      delay={120}
                    >
                      <div className="space-y-2">
                        {leavers.map((l, i) => {
                          const bad = l.include && !isEmail(l.email);
                          return (
                            <div
                              key={`${l.code ?? l.name}-${i}`}
                              className={cn(
                                'rounded-2xl border p-3 transition-colors duration-200',
                                l.include
                                  ? 'border-slate-200 bg-white'
                                  : 'border-slate-200 bg-slate-50/60'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
                                    l.include
                                      ? 'bg-rose-50 text-rose-600'
                                      : 'bg-slate-100 text-slate-400'
                                  )}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-800">
                                    {l.name}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">
                                    {[
                                      l.code ? `Code ${l.code}` : null,
                                      l.reason,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ') || 'No reason recorded'}
                                  </p>
                                </div>
                                <Switch
                                  on={l.include}
                                  label={`Ask IT to delete ${l.name}'s email account`}
                                  onChange={(v) => setLeaver(i, { include: v })}
                                />
                              </div>
                              <Reveal open={l.include}>
                                <div className="pt-3">
                                  <p className="mb-1 text-xs font-medium text-slate-600">
                                    Delete this account
                                  </p>
                                  <input
                                    type="email"
                                    value={l.email}
                                    placeholder="name@dbl-group.com"
                                    onChange={(e) =>
                                      setLeaver(i, { email: e.target.value })
                                    }
                                    className={cn(
                                      'h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-500/25 focus-visible:ring-offset-0',
                                      bad
                                        ? 'border-rose-300'
                                        : 'border-slate-200 focus:border-brand-400'
                                    )}
                                  />
                                  {bad ? (
                                    <p className="mt-1 text-[0.6875rem] text-rose-600">
                                      Enter their email address
                                    </p>
                                  ) : !l.found ? (
                                    <p className="mt-1 text-[0.6875rem] text-slate-400">
                                      Not in the directory — type it.
                                    </p>
                                  ) : null}
                                </div>
                              </Reveal>
                              {!l.include &&
                                /transfer/i.test(l.reason ?? '') && (
                                  <p className="mt-2 pl-11 text-[0.6875rem] text-slate-400">
                                    Still with the group — their account is
                                    kept.
                                  </p>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </Section>
                  )}
                </div>
              </div>

              {/* The email, as IT will see it */}
              <div
                className={cn(
                  'min-h-0 flex-1 flex-col bg-slate-50/80 p-3 sm:p-5 lg:flex',
                  pane === 'form' ? 'hidden' : 'flex'
                )}
              >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm motion-safe:animate-card-in">
                  <div className="shrink-0 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400">
                        <Eye className="h-3.5 w-3.5" /> As IT will receive it
                      </span>
                      {preview.isFetching ? (
                        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium text-slate-400">
                          <Loader2 className="h-3 w-3 animate-spin" /> Updating
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium text-emerald-600">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                          Live preview
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[0.9375rem] font-semibold leading-snug text-slate-900">
                      {preview.data?.subject ?? '…'}
                    </p>
                    <dl className="mt-2.5 space-y-1.5 text-xs">
                      <Recipients label="To">
                        {d.recipients.map((r) => (
                          <AddressChip key={r}>{r}</AddressChip>
                        ))}
                      </Recipients>
                      {onCcCount > 0 && (
                        <Recipients label="Cc">
                          {ccStates
                            .filter(
                              (c) =>
                                c.state.kind !== 'to' &&
                                c.state.kind !== 'duplicate'
                            )
                            .map((c) => (
                              <AddressChip
                                key={c.code}
                                muted={
                                  c.state.kind === 'none' ||
                                  c.state.kind === 'failed'
                                }
                              >
                                {c.name}
                                {c.state.kind === 'ok' ? (
                                  <span className="hidden text-slate-400 sm:inline">
                                    {' '}
                                    &lt;{c.state.email}&gt;
                                  </span>
                                ) : null}
                              </AddressChip>
                            ))}
                        </Recipients>
                      )}
                    </dl>
                  </div>
                  <div className="relative min-h-0 flex-1">
                    {preview.isFetching && (
                      <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
                        <div className="h-full w-full bg-[linear-gradient(90deg,transparent,theme(colors.brand.400),transparent)] bg-[length:200%_100%] motion-safe:animate-shimmer" />
                      </div>
                    )}
                    {preview.data ? (
                      <iframe
                        title="Email preview"
                        sandbox=""
                        srcDoc={`<!doctype html><html><body style="margin:0;padding:20px 22px;background:#fff">${preview.data.html}</body></html>`}
                        className={cn(
                          'h-full min-h-[24rem] w-full transition-opacity duration-300',
                          preview.isFetching && 'opacity-60'
                        )}
                      />
                    ) : lookupFailed ? (
                      <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-3 px-6 text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                          <AlertTriangle className="h-5 w-5" />
                        </span>
                        <p className="max-w-sm text-sm text-slate-600">
                          {(preview.error as Error)?.message ||
                            'The preview could not be loaded.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => void preview.refetch()}
                          className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Try again
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[24rem] items-center justify-center">
                        <Spinner />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────────── */}
          <footer className="relative shrink-0 border-t border-slate-100 bg-white/90 px-4 py-3.5 backdrop-blur sm:px-6">
            {busy && (
              <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-slate-100">
                <div className="h-full w-full bg-[linear-gradient(90deg,transparent,theme(colors.brand.500),transparent)] bg-[length:200%_100%] motion-safe:animate-shimmer" />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
              <p className="min-w-0 flex-1 basis-60 text-xs leading-5 text-slate-500 sm:text-sm">
                {busy ? (
                  'Sending to IT…'
                ) : blocker ? (
                  <span className="inline-flex items-start gap-1.5 text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {blocker}
                  </span>
                ) : d ? (
                  <>
                    To{' '}
                    <span className="font-medium text-slate-700">
                      {d.recipients.join(', ')}
                    </span>
                    {' · '}
                    {onCcCount ? `${onCcCount} on CC` : 'nobody on CC'}
                    {deleting > 0 &&
                      ` · ${deleting} account${deleting > 1 ? 's' : ''} to delete`}
                    <span className="hidden md:inline">
                      {' '}
                      · IT confirms from the link in the email
                    </span>
                  </>
                ) : null}
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={() =>
                    send.mutate(input, { onSuccess: () => onClose() })
                  }
                  className={cn(
                    'group inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200',
                    canSend
                      ? 'bg-brand-600 shadow-brand-600/25 hover:-translate-y-px hover:bg-brand-700 hover:shadow-md active:translate-y-0 active:scale-[0.98]'
                      : busy
                        ? 'bg-brand-500'
                        : 'cursor-not-allowed bg-slate-300'
                  )}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  )}
                  {resend ? 'Send again' : 'Send to IT'}
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </Portal>
  );
}

/** The line under a CC pick's name: its address, or why it is not on CC. */
function CcStatus({ state, onRetry }: { state: CcState; onRetry: () => void }) {
  switch (state.kind) {
    case 'waiting':
      return (
        <p className="inline-flex items-center gap-1 text-xs text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" /> Looking up the address…
        </p>
      );
    case 'ok':
      return <p className="truncate text-xs text-slate-500">{state.email}</p>;
    case 'none':
      return (
        <p className="truncate text-xs text-rose-600">
          No email address on file — cannot be added on CC
        </p>
      );
    case 'to':
      return (
        <p className="text-xs text-amber-700" title={state.email}>
          Already receives it as To — not added on CC
        </p>
      );
    case 'duplicate':
      return (
        <p className="text-xs text-amber-700" title={state.email}>
          Same address as someone above — added once
        </p>
      );
    case 'failed':
      return (
        <p className="text-xs text-rose-600">
          Could not look up the address ·{' '}
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </p>
      );
  }
}

/**
 * Search the directory and add people to Cc, one click each.
 *
 * Only names, codes and designations come back from the listing — never
 * addresses, which the server looks up for the ones picked.
 */
function CcPicker({
  active,
  picked,
  onPick,
  onDone,
}: {
  active: boolean;
  picked: string[];
  onPick: (p: CcPick) => void;
  onDone: () => void;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const q = debounced.trim();
  const { data, isFetching } = useEmployees(
    { search: q, page: 1, pageSize: 6 },
    { enabled: active && q.length >= 2 }
  );
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!active) {
      setSearch('');
      return;
    }
    // After the panel has slid open, so the focus does not jump the scroll.
    const t = window.setTimeout(
      () => ref.current?.focus({ preventScroll: true }),
      220
    );
    return () => window.clearTimeout(t);
  }, [active]);

  const results = q.length >= 2 ? (data?.items ?? []) : [];

  return (
    <div className="mb-2.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-xl border border-slate-200 bg-slate-50/60 transition focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/25">
          <Search className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={ref}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                // Close the search, not the whole dialog.
                e.stopPropagation();
                onDone();
              }
            }}
            placeholder="Name, code or designation…"
            aria-label="Search the employee directory"
            className="h-10 min-w-0 flex-1 bg-transparent px-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {isFetching && (
            <Loader2 className="mr-3 h-4 w-4 shrink-0 animate-spin text-slate-400" />
          )}
        </div>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Done
        </button>
      </div>

      {q.length >= 2 ? (
        <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
          {!isFetching && results.length === 0 && (
            <li className="px-2 py-3 text-xs text-slate-400">
              No matching employee.
            </li>
          )}
          {results.map((emp, i) => {
            const added = picked.includes(emp.employeeCode);
            return (
              <li
                key={emp.id}
                style={{ animationDelay: `${i * 30}ms` }}
                className="motion-safe:animate-card-in"
              >
                <button
                  type="button"
                  disabled={added}
                  onClick={() =>
                    onPick({
                      code: emp.employeeCode,
                      name: emp.name,
                      designation: emp.jobTitle || null,
                      avatarUrl: emp.avatarUrl,
                    })
                  }
                  className={cn(
                    'group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors duration-150',
                    added
                      ? 'cursor-default'
                      : 'hover:bg-brand-50/60 focus-visible:bg-brand-50/60'
                  )}
                >
                  <Avatar name={emp.name} src={emp.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {emp.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {emp.employeeCode}
                      {emp.jobTitle ? ` · ${emp.jobTitle}` : ''}
                      {emp.department ? ` · ${emp.department}` : ''}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all duration-150',
                      added
                        ? 'text-emerald-600'
                        : 'text-brand-600 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                    )}
                  >
                    {added ? (
                      <>
                        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Added
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" /> Cc
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="flex items-center gap-1.5 px-1 pt-2 text-xs text-slate-400">
          <Users className="h-3.5 w-3.5" /> Type two letters or more to search.
        </p>
      )}
    </div>
  );
}

/** Details / Preview — the two panes as tabs, on a row of their own below the width that fits both. */
function PaneSwitch({
  value,
  onChange,
}: {
  value: 'form' | 'preview';
  onChange: (v: 'form' | 'preview') => void;
}) {
  const tabs = [
    { key: 'form' as const, label: 'Details', icon: PenLine },
    { key: 'preview' as const, label: 'Preview', icon: Eye },
  ];
  return (
    <div className="basis-full lg:hidden">
      <div
        role="tablist"
        className="relative mx-auto flex max-w-sm rounded-xl bg-slate-100 p-0.5"
      >
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-[0.625rem] bg-white shadow-sm transition-transform duration-300 ease-out',
            value === 'preview' && 'translate-x-full'
          )}
        />
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={value === key}
            onClick={() => onChange(key)}
            className={cn(
              'relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-[0.625rem] py-1.5 text-xs font-semibold transition-colors duration-200',
              value === key
                ? 'text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({
  n,
  title,
  hint,
  delay = 0,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className="motion-safe:animate-card-in"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[0.6875rem] font-bold text-brand-700 ring-1 ring-brand-100">
          {n}
        </span>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  note,
  error,
  children,
}: {
  label: string;
  hint?: string;
  note?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 flex items-baseline gap-1.5 text-xs font-medium text-slate-600">
        {label}
        {hint && <span className="font-normal text-slate-400">· {hint}</span>}
      </p>
      {children}
      {error ? (
        <p className="mt-1 text-[0.6875rem] text-rose-600">{error}</p>
      ) : note ? (
        <p className="mt-1 text-[0.6875rem] text-slate-400">{note}</p>
      ) : null}
    </div>
  );
}

function Fact({
  icon,
  warn,
  children,
}: {
  icon: ReactNode;
  warn?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ring-1',
        warn
          ? 'bg-amber-50 text-amber-700 ring-amber-200'
          : 'bg-white text-slate-600 ring-slate-200'
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Slides its content open and shut by animating the grid row, so the height need not be known. */
function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function Switch({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      onClick={() => onChange(!on)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
        on ? 'bg-brand-600' : 'bg-slate-300'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
          on ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

function Recipients({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 motion-safe:animate-fade-in">
      <dt className="w-7 shrink-0 pt-0.5 text-slate-400">{label}</dt>
      <dd className="flex min-w-0 flex-wrap gap-1">{children}</dd>
    </div>
  );
}

function AddressChip({
  muted,
  children,
}: {
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'max-w-full truncate rounded-md px-1.5 py-0.5 font-medium',
        muted
          ? 'bg-rose-50 text-rose-600 line-through'
          : 'bg-slate-100 text-slate-700'
      )}
    >
      {children}
    </span>
  );
}
