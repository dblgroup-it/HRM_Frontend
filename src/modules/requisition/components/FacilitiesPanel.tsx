import { useState } from 'react';
import { Check, MapPin, Sofa, StickyNote, X } from 'lucide-react';

import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import { useMasterData } from '@modules/master-data';

import { FACILITY_META, FACILITY_OPTION_LABEL } from '../constants';
import { useUpdateFacilities } from '../hooks/useRequisitionActions';
import type { FacilityDecision, FacilityKey, Facilities } from '../types/requisition.types';

const STATUS_TONE = {
  pending: 'neutral',
  confirmed: 'success',
  skipped: 'danger',
} as const;

/**
 * Facility Requirements — what the requisitioner asked for (Laptop/Desktop,
 * Transport, Dormitory, Seating), and HR's confirm/skip call on each.
 *
 * Settled by the HR side — Head of Talent Acquisition / CHRO / super and the assigned
 * Corporate Recruiter — because confirming a laptop or a desk is a
 * provisioning commitment made by whoever delivers it, not by whichever
 * approver happens to hold the requisition. The same people may revise a
 * decision later (e.g. from Onboarding, right up to joining). Every decision
 * records who made it and when.
 */
export function FacilitiesPanel({
  requisition,
  canEdit,
}: {
  requisition: {
    id: string;
    facilities: Facilities | null;
    specialNotes?: string[];
  };
  canEdit: boolean;
}) {
  const update = useUpdateFacilities();
  const { data: master } = useMasterData();
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<FacilityKey | null>(null);

  const chosenNotes = requisition.specialNotes ?? [];
  const toggleNote = (note: string) => {
    const next = chosenNotes.includes(note)
      ? chosenNotes.filter((n) => n !== note)
      : [...chosenNotes, note];
    update.mutate({ id: requisition.id, specialNotes: next });
  };

  const decide = (key: FacilityKey, status: 'confirmed' | 'skipped') => {
    update.mutate(
      { id: requisition.id, decisions: [{ key, status, hrNote: noteDraft[key] }] },
      { onSuccess: () => setEditingKey(null) },
    );
  };

  // This panel sits below the sign-off chain and is easy to scroll past —
  // give it a visible nudge whenever the current approver actually has
  // something to act on here, so it doesn't get skipped by accident.
  const pendingCount = FACILITY_META.filter(({ key }) => {
    const f = requisition.facilities?.[key];
    return f?.requested && f.status === 'pending';
  }).length;
  const needsAttention = canEdit && pendingCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Sofa className="h-3.5 w-3.5" />
          </span>
          Facility Requirements
          {needsAttention && (
            <Badge tone="warning" dot className="animate-pulse">
              {pendingCount} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {FACILITY_META.map(({ key, label }) => {
          const f: FacilityDecision = requisition.facilities?.[key] ?? {
            requested: false,
            option: null,
            note: '',
            status: 'pending',
            hrNote: '',
            decidedBy: null,
            decidedAt: null,
          };
          // Every criterion is actionable, including ones the requisitioner
          // left out — HR may still decide the role needs it.
          const canAct = canEdit;

          return (
            <div key={key} className="rounded-xl border border-slate-200 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{label}</span>
                  {!f.requested ? (
                    <Badge tone="neutral">Not requested</Badge>
                  ) : (
                    <>
                      {f.option && (
                        <Badge tone="brand">{FACILITY_OPTION_LABEL[f.option] ?? f.option}</Badge>
                      )}
                      {/* A dedicated car is a choice of vehicle; a shared run
                          is whatever is on it, so this only shows when it
                          means something. */}
                      {f.vehicleType && (
                        <Badge tone="neutral">
                          {FACILITY_OPTION_LABEL[f.vehicleType] ?? f.vehicleType}
                        </Badge>
                      )}
                      {!canAct && (
                        <Badge tone={STATUS_TONE[f.status]}>
                          {f.status === 'pending' ? 'Awaiting HR' : f.status === 'confirmed' ? 'Confirmed' : 'Skipped'}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                {canAct && editingKey !== key && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={update.isPending}
                      onClick={() => f.status !== 'confirmed' && decide(key, 'confirmed')}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                        f.status === 'confirmed'
                          ? 'scale-105 bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {f.status === 'confirmed' ? 'Confirmed' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => f.status !== 'skipped' && setEditingKey(key)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                        f.status === 'skipped'
                          ? 'scale-105 bg-rose-600 text-white shadow-md shadow-rose-600/25'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                      {f.status === 'skipped' ? 'Skipped' : 'Skip'}
                    </button>
                  </div>
                )}
              </div>

              {f.requested && f.pickupLocation && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-600">
                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                  Pick-up from {f.pickupLocation}
                </p>
              )}

              {f.requested && f.note && (
                <p className="mt-1.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-400">Requisitioner: </span>
                  {f.note}
                </p>
              )}

              {f.status !== 'pending' && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs">
                  <span
                    className={cn(
                      'font-medium',
                      f.status === 'confirmed'
                        ? 'text-emerald-700'
                        : 'text-rose-700',
                    )}
                  >
                    {f.status === 'confirmed' ? 'Confirmed' : 'Skipped'}
                  </span>
                  <span className="text-slate-500">
                    by {f.decidedBy || 'HR'}
                    {f.decidedAt
                      ? ` · ${formatDate(f.decidedAt, 'dd MMM yyyy, p')}`
                      : ''}
                  </span>
                  {f.hrNote && (
                    <span className="text-slate-500">— “{f.hrNote}”</span>
                  )}
                </p>
              )}

              {canAct && editingKey === key && (
                <div className="mt-2.5 space-y-2 rounded-lg bg-rose-50/60 p-2.5">
                  <input
                    autoFocus
                    value={noteDraft[key] ?? ''}
                    onChange={(e) => setNoteDraft((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder="Why skip this? (optional)"
                    className="w-full rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditingKey(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      isLoading={update.isPending}
                      onClick={() => decide(key, 'skipped')}
                    >
                      Confirm skip
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Special notes — the fixed terms that travel with the appointment:
            the bonus share, the salary review, the tax line. Picked from a
            maintained list rather than retyped, because these are the exact
            words that end up in an offer. */}
        {(canEdit || chosenNotes.length > 0) && (
          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <StickyNote className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              Special Note
              {chosenNotes.length > 0 && (
                <Badge tone="brand">{chosenNotes.length} selected</Badge>
              )}
            </p>

            {canEdit ? (
              <div className="mt-2.5 space-y-1.5">
                {(master?.specialNotes ?? []).map((note) => {
                  const on = chosenNotes.includes(note);
                  return (
                    <label
                      key={note}
                      className={cn(
                        'flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs transition-colors',
                        on
                          ? 'border-brand-200 bg-brand-50/60 text-slate-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={update.isPending}
                        onChange={() => toggleNote(note)}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="leading-relaxed">{note}</span>
                    </label>
                  );
                })}
                {!master?.specialNotes?.length && (
                  <p className="text-xs text-slate-400">
                    No special notes are configured yet.
                  </p>
                )}
              </div>
            ) : (
              <ul className="mt-2 space-y-1">
                {chosenNotes.map((note) => (
                  <li
                    key={note}
                    className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-600"
                  >
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!canEdit && (
          <p className={cn('text-xs text-slate-400')}>
            Head of Talent Acquisition and the assigned Corporate Recruiter confirm or skip
            facility requests.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
