import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  HeartPulse,
  Mail,
  MapPin,
  Send,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  EmptyState,
  ErrorCard,
  FullPageSpinner,
  PageHeader,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { useMyPermissions } from '@modules/rbac';
import { isTalentAcquisitionHead } from '@modules/candidates';
import { ROUTES } from '@app/router/paths';

import { onboardingApi } from '../api/onboarding.api';
import { useMedicalRequests } from '../hooks/useOnboarding';
import { MEDICAL_BANDS, toLocalInput } from '../utils/medicalLetter';
import type {
  MedicalAgeBand,
  MedicalRequestRow,
  MedicalRequestSendResult,
} from '../types/onboarding.types';

interface RowEdit {
  examAt: string;
  venue: string;
  band: MedicalAgeBand | null;
  refNo: string;
}

/** Stable, so the effect keyed on `rows` does not re-run on every render while loading. */
const NO_ROWS: MedicalRequestRow[] = [];

const FIELD =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

/**
 * Head of Talent Acquisition's medical inbox.
 *
 * Recruiters ask for a medical test (test list, salutation, reference) and it
 * lands here. HoTA gives each candidate a date and venue, one at a time or by
 * applying one value to all the ticked candidates, and sends. Every candidate
 * gets their own email, and so does the clinic for each of them. There is
 * never one combined message.
 */
export default function MedicalRequestsPage() {
  const qc = useQueryClient();
  const { data: perms } = useMyPermissions();
  const allowed = isTalentAcquisitionHead(perms);
  const { data, isLoading, isError, refetch } = useMedicalRequests(allowed);
  const rows = data ?? NO_ROWS;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [bulkAt, setBulkAt] = useState('');
  const [bulkVenue, setBulkVenue] = useState('');
  const [toTeam, setToTeam] = useState(true);
  const [toCandidate, setToCandidate] = useState(true);
  const [result, setResult] = useState<MedicalRequestSendResult | null>(null);

  // New rows get their defaults; rows already being edited keep what was typed.
  useEffect(() => {
    setEdits((prev) => {
      const next: Record<string, RowEdit> = {};
      for (const r of rows) {
        next[r.onboardingId] = prev[r.onboardingId] ?? {
          examAt: toLocalInput(r.examAt),
          venue: r.venue,
          band: r.band,
          refNo: r.refNo ?? '',
        };
      }
      return next;
    });
    setSelected((prev) => new Set([...prev].filter((id) => rows.some((r) => r.onboardingId === id))));
  }, [rows]);

  const patch = (id: string, p: Partial<RowEdit>) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], ...p } }));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = rows.length > 0 && selected.size === rows.length;

  const applyToSelected = () => {
    if (!selected.size) return;
    setEdits((e) => {
      const n = { ...e };
      for (const id of selected) {
        n[id] = {
          ...n[id],
          ...(bulkAt ? { examAt: bulkAt } : {}),
          ...(bulkVenue.trim() ? { venue: bulkVenue.trim() } : {}),
        };
      }
      return n;
    });
  };

  /** Why a ticked row cannot go yet, by row. Empty when it can. */
  const problems = useMemo(() => {
    const out: Record<string, string> = {};
    for (const id of selected) {
      const e = edits[id];
      if (!e) continue;
      if (!e.band) out[id] = 'Choose the test list';
      else if (!e.examAt) out[id] = 'Set the date and time';
      else if (!e.venue.trim()) out[id] = 'Set the venue';
    }
    return out;
  }, [selected, edits]);

  const send = useMutation({
    mutationFn: () =>
      onboardingApi.sendMedicalRequests({
        items: [...selected].map((id) => {
          const e = edits[id];
          return {
            onboardingId: id,
            examAt: new Date(e.examAt).toISOString(),
            venue: e.venue.trim(),
            band: e.band as MedicalAgeBand,
            refNo: e.refNo.trim() || undefined,
          };
        }),
        notifyMedicalTeam: toTeam,
        notifyCandidate: toCandidate,
      }),
    onSuccess: (r) => {
      setResult(r);
      const ok = r.results.filter((x) => x.ok).length;
      const bad = r.results.length - ok;
      if (ok) toast.success(`Sent for ${ok} candidate${ok === 1 ? '' : 's'}`);
      if (bad) toast.error(`${bad} could not be sent. See the list below.`);
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ['medical-requests'] });
      void qc.invalidateQueries({ queryKey: ['onboarding'] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Could not send'),
  });

  const canSend =
    selected.size > 0 &&
    Object.keys(problems).length === 0 &&
    (toTeam || toCandidate) &&
    !send.isPending;

  if (!perms) return <FullPageSpinner label="Loading…" />;
  if (!allowed) {
    return (
      <EmptyState
        icon={<HeartPulse className="h-6 w-6" />}
        title="Head of Talent Acquisition only"
        description="Recruiters request medical tests from a candidate's onboarding page. Head of Talent Acquisition schedules and sends them here."
      />
    );
  }
  if (isLoading) return <FullPageSpinner label="Loading medical requests…" />;
  if (isError) {
    return <ErrorCard title="Could not load medical requests" onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medical Requests"
        description="Tests the recruiters have asked for. Give each candidate a date and venue, then send. Each candidate gets a separate email."
      />

      {result && <ResultList result={result} onClose={() => setResult(null)} />}

      {rows.length === 0 ? (
        <EmptyState
          icon={<HeartPulse className="h-6 w-6" />}
          title="Nothing waiting"
          description="When a recruiter requests a medical test, the candidate appears here."
        />
      ) : (
        <>
          {/* Apply one date and venue to every ticked candidate. */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 self-center text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.onboardingId)))
                  }
                />
                Select all ({rows.length})
              </label>
              <div className="min-w-[12rem] flex-1">
                <span className="mb-1 block text-xs font-medium text-slate-500">Date and time</span>
                <input
                  type="datetime-local"
                  value={bulkAt}
                  onChange={(e) => setBulkAt(e.target.value)}
                  className={FIELD}
                />
              </div>
              <div className="min-w-[14rem] flex-[2]">
                <span className="mb-1 block text-xs font-medium text-slate-500">Venue</span>
                <input
                  value={bulkVenue}
                  onChange={(e) => setBulkVenue(e.target.value)}
                  placeholder="Leave blank to keep each row's venue"
                  className={FIELD}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={!selected.size || (!bulkAt && !bulkVenue.trim())}
                onClick={applyToSelected}
              >
                Apply to {selected.size || 'selected'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((r) => (
              <RequestCard
                key={r.onboardingId}
                row={r}
                edit={edits[r.onboardingId]}
                selected={selected.has(r.onboardingId)}
                problem={problems[r.onboardingId]}
                onToggle={() => toggle(r.onboardingId)}
                onChange={(p) => patch(r.onboardingId, p)}
              />
            ))}
          </div>

          {/* One action bar, pinned to the bottom of the content while the
              list scrolls, so the send is always in reach. */}
          <div className="sticky bottom-[4.75rem] z-20 rounded-xl lg:bottom-3 border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
                <span className="font-semibold text-slate-800">
                  {selected.size} selected
                </span>
                <label className="flex items-center gap-1.5 text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={toTeam}
                    onChange={(e) => setToTeam(e.target.checked)}
                  />
                  <Users className="h-3.5 w-3.5 text-slate-400" /> Medical team
                </label>
                <label className="flex items-center gap-1.5 text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={toCandidate}
                    onChange={(e) => setToCandidate(e.target.checked)}
                  />
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Candidate
                </label>
                {selected.size > 0 && Object.keys(problems).length > 0 && (
                  <span className="text-xs font-medium text-amber-700">
                    {Object.keys(problems).length} selected still need details
                  </span>
                )}
                {!toTeam && !toCandidate && (
                  <span className="text-xs font-medium text-amber-700">
                    Choose who to send to
                  </span>
                )}
              </div>
              <Button
                onClick={() => send.mutate()}
                disabled={!canSend}
                isLoading={send.isPending}
                leftIcon={<Send className="h-4 w-4" />}
                className="w-full sm:w-auto"
              >
                Send {selected.size > 0 ? `${selected.size} ` : ''}separately
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RequestCard({
  row,
  edit,
  selected,
  problem,
  onToggle,
  onChange,
}: {
  row: MedicalRequestRow;
  edit: RowEdit | undefined;
  selected: boolean;
  problem?: string;
  onToggle: () => void;
  onChange: (p: Partial<RowEdit>) => void;
}) {
  if (!edit) return null;
  return (
    <div
      className={cn(
        'rounded-xl border bg-white shadow-sm transition-colors',
        selected ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-200',
      )}
    >
      <div className="flex flex-wrap items-start gap-3 px-4 pt-3.5">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${row.candidate.name}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link
              to={ROUTES.onboardingManage(row.candidate.id)}
              className="truncate text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
            >
              {row.salutation ? `${row.salutation} ` : ''}
              {row.candidate.name}
            </Link>
            <span className="truncate text-xs text-slate-500">
              {row.requisition.designation} · {row.requisition.unitFactory} · {row.requisition.code}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {row.candidate.email ?? 'No email on file'}
            {row.candidate.phone ? ` · ${row.candidate.phone}` : ''}
          </p>
        </div>
        <div className="w-full pl-7 text-[0.6875rem] text-slate-400 sm:w-auto sm:shrink-0 sm:pl-0 sm:text-right">
          {row.requestedBy ? `Requested by ${row.requestedBy.name}` : 'Requested'}
          {row.requestedAt ? `, ${formatDate(row.requestedAt)}` : ''}
          {row.lastSentAt && (
            <span className="block text-amber-600">
              Sent before, {formatDate(row.lastSentAt)}. This is a re-request.
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 px-4 pb-3.5 pt-3 sm:grid-cols-2 lg:grid-cols-[13rem,12rem,minmax(0,1fr),15rem]">
        <div>
          <span className="mb-1 block text-xs font-medium text-slate-500">Test list</span>
          <div className="flex h-9 overflow-hidden rounded-lg border border-slate-300">
            {MEDICAL_BANDS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ band: value })}
                className={cn(
                  'flex-1 text-xs font-semibold transition-colors',
                  edit.band === value
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
            <CalendarClock className="h-3 w-3" /> Date and time
          </span>
          <input
            type="datetime-local"
            value={edit.examAt}
            onChange={(e) => onChange({ examAt: e.target.value })}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
            <MapPin className="h-3 w-3" /> Venue
          </span>
          <input
            value={edit.venue}
            onChange={(e) => onChange({ venue: e.target.value })}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Reference no.</span>
          <input
            value={edit.refNo}
            onChange={(e) => onChange({ refNo: e.target.value })}
            placeholder="Next number"
            className={FIELD}
          />
        </label>
      </div>
      {selected && problem && (
        <p className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-800">
          {problem}
        </p>
      )}
    </div>
  );
}

function ResultList({
  result,
  onClose,
}: {
  result: MedicalRequestSendResult;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <p className="text-sm font-semibold text-slate-800">Last send</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Dismiss
        </button>
      </div>
      <ul className="divide-y divide-slate-100">
        {result.results.map((r) => (
          <li key={r.onboardingId} className="flex items-start gap-2.5 px-4 py-2.5 text-sm">
            {r.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            )}
            <div className="min-w-0">
              <p className="font-medium text-slate-800">
                {r.candidateName}
                {r.refNo && <span className="ml-2 text-xs font-normal text-slate-400">{r.refNo}</span>}
              </p>
              {r.ok ? (
                <p className="text-xs text-slate-500">Sent to {r.sent?.join(', ')}</p>
              ) : (
                <p className="text-xs text-rose-600">{r.error}</p>
              )}
              {r.failed && r.failed.length > 0 && (
                <p className="text-xs text-amber-700">
                  Failed: {r.failed.map((f) => f.to).join(', ')}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
