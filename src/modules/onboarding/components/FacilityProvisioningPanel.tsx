import { useState } from 'react';
import { Check, Laptop, Mail, Search, Send, ShieldCheck, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Input, Modal, Spinner } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { employeeApi } from '@modules/employees';

import {
  useFacilityProvisioning,
  useNotifyFacility,
  useSuggestedRecipients,
} from '../hooks/useFacilityProvisioning';
import type {
  FacilityProvisioningItem,
  RecipientInput,
  SuggestedRecipient,
} from '../types/facilityProvisioning.types';

/**
 * Post-selection provisioning: notify whoever will physically arrange a
 * confirmed facility (Laptop/Desktop → IT, Transport/Dormitory/Seating →
 * Admin) by email, with a one-time confirmation link. Only shows facilities
 * the requisitioner requested and HR confirmed — nothing to provision otherwise.
 * HR can notify one person or several at once; any one of them confirming
 * marks the facility arranged.
 */
export function FacilityProvisioningPanel({
  candidateId,
  canEdit,
}: {
  candidateId: string;
  canEdit: boolean;
}) {
  const { data, isLoading } = useFacilityProvisioning(candidateId);
  const [pickerKey, setPickerKey] = useState<string | null>(null);

  if (isLoading || !data || data.items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Send className="h-3.5 w-3.5" />
          </span>
          Facility Provisioning
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {data.items.map((item) => (
          <ProvisioningRow
            key={item.key}
            item={item}
            canEdit={canEdit}
            onNotify={() => setPickerKey(item.key)}
          />
        ))}
      </CardBody>

      {pickerKey && (
        <RecipientPickerModal
          candidateId={candidateId}
          facilityKey={pickerKey}
          item={data.items.find((i) => i.key === pickerKey)!}
          onClose={() => setPickerKey(null)}
        />
      )}
    </Card>
  );
}

function ProvisioningRow({
  item,
  canEdit,
  onNotify,
}: {
  item: FacilityProvisioningItem;
  canEdit: boolean;
  onNotify: () => void;
}) {
  const arranged = Boolean(item.confirmedAt);
  const pendingRecipients = item.recipients.filter((r) => !r.confirmedAt);
  const status = arranged ? 'confirmed' : item.recipients.length > 0 ? 'pending' : 'not_sent';

  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {item.kind === 'it' ? (
            <Laptop className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-800">{item.label}</span>
          <Badge tone="neutral">{item.kind === 'it' ? 'IT' : 'Admin'}</Badge>
          {status === 'not_sent' && <Badge tone="neutral">Not notified</Badge>}
          {status === 'pending' && <Badge tone="warning">Awaiting confirmation</Badge>}
          {status === 'confirmed' && <Badge tone="success">Arranged</Badge>}
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" leftIcon={<Mail className="h-3.5 w-3.5" />} onClick={onNotify}>
            {status === 'not_sent' ? `Notify ${item.kind === 'it' ? 'IT' : 'Admin'}` : 'Notify more'}
          </Button>
        )}
      </div>

      {item.recipients.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {item.recipients.map((r, i) => (
            <li key={`${r.recipientEmail}-${i}`} className="flex items-center gap-1.5 text-xs">
              {r.confirmedAt ? (
                <Check className="h-3 w-3 shrink-0 text-emerald-600" />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              )}
              <span className={cn('font-medium', r.confirmedAt ? 'text-emerald-700' : 'text-slate-600')}>
                {r.recipientName}
              </span>
              <span className="text-slate-400">
                {r.confirmedAt
                  ? `confirmed ${formatDate(r.confirmedAt)}`
                  : `notified ${formatDate(r.sentAt)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {arranged && item.confirmNote && (
        <p className="mt-1 text-xs text-emerald-600">— "{item.confirmNote}"</p>
      )}
      {arranged && pendingRecipients.length > 0 && (
        <p className="mt-1 text-[11px] text-slate-400">
          Still awaiting: {pendingRecipients.map((r) => r.recipientName).join(', ')} (already arranged, no action needed)
        </p>
      )}
    </div>
  );
}

export function RecipientPickerModal({
  candidateId,
  facilityKey,
  item,
  onClose,
}: {
  candidateId: string;
  facilityKey: string;
  item: FacilityProvisioningItem;
  onClose: () => void;
}) {
  const notify = useNotifyFacility(candidateId);
  const { data: suggested, isLoading: suggestLoading } = useSuggestedRecipients(
    candidateId,
    facilityKey,
    true,
  );
  const [search, setSearch] = useState('');
  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['facility-provisioning-search', search],
    queryFn: () => employeeApi.list({ search, pageSize: 8 }),
    enabled: search.trim().length > 1,
  });
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [selected, setSelected] = useState<(RecipientInput & { key: string; label: string })[]>([]);

  const toggle = (r: { userId: string; name: string; email: string }) => {
    setSelected((prev) =>
      prev.some((s) => s.key === r.userId)
        ? prev.filter((s) => s.key !== r.userId)
        : [...prev, { userId: r.userId, name: r.name, email: r.email, key: r.userId, label: r.name }],
    );
  };

  const addManual = () => {
    const name = manualName.trim();
    const email = manualEmail.trim();
    if (!name || !email) return;
    setSelected((prev) => [...prev, { name, email, key: email, label: name }]);
    setManualName('');
    setManualEmail('');
    setManual(false);
  };

  const send = () => {
    if (selected.length === 0) return;
    notify.mutate(
      {
        key: facilityKey,
        input: { recipients: selected.map(({ userId, name, email }) => ({ userId, name, email })) },
      },
      { onSuccess: onClose },
    );
  };

  const isSearching = search.trim().length > 1;
  const results: { userId: string; name: string; email: string; subtitle: string }[] = isSearching
    ? (searchResults?.items ?? [])
        .filter((e): e is typeof e & { userId: string } => Boolean(e.userId))
        .map((e) => ({ userId: e.userId, name: e.name, email: e.email, subtitle: e.jobTitle }))
    : (suggested ?? []).map((s: SuggestedRecipient) => ({
        userId: s.userId,
        name: s.name,
        email: s.email,
        subtitle: s.designation ?? s.email,
      }));
  const loading = isSearching ? searching : suggestLoading;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Notify ${item.kind === 'it' ? 'IT' : 'Admin'} — ${item.label}`}
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-slate-400">
            {selected.length === 0
              ? 'Pick one or more people below'
              : `${selected.length} selected`}
          </span>
          <Button
            size="sm"
            isLoading={notify.isPending}
            disabled={selected.length === 0}
            leftIcon={<Send className="h-3.5 w-3.5" />}
            onClick={send}
          >
            Send{selected.length > 1 ? ` to ${selected.length}` : ''}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((s) => (
              <span
                key={s.key}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-brand-700"
              >
                {s.label}
                <button
                  type="button"
                  onClick={() => setSelected((prev) => prev.filter((x) => x.key !== s.key))}
                  className="rounded-full p-0.5 hover:bg-brand-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {!manual ? (
          <>
            <Input
              placeholder="Search by name, code, email or designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
            {search.trim().length <= 1 && (
              <p className="text-xs text-slate-400">
                Suggested {item.kind === 'it' ? 'IT' : 'Admin'} staff in this unit — search above to pick anyone else, or select several.
              </p>
            )}
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {loading && (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              )}
              {!loading && results.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">No matching employees.</p>
              )}
              {!loading &&
                results.map((r) => {
                  const isSelected = selected.some((s) => s.key === r.userId);
                  return (
                    <button
                      key={r.userId}
                      type="button"
                      onClick={() => toggle(r)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                        isSelected
                          ? 'border-brand-300 bg-brand-50'
                          : 'border-slate-100 hover:border-brand-200 hover:bg-brand-50/40',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-700">{r.name}</p>
                        <p className="truncate text-xs text-slate-400">{r.subtitle}</p>
                      </div>
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          isSelected
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-slate-300 text-transparent',
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                    </button>
                  );
                })}
            </div>
            <button
              type="button"
              onClick={() => setManual(true)}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Can't find them? Add name &amp; email manually
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <Input label="Name" value={manualName} onChange={(e) => setManualName(e.target.value)} />
            <Input
              label="Email"
              type="email"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
            />
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setManual(false)}
                className="text-xs font-medium text-slate-500 hover:underline"
              >
                Back to search
              </button>
              <Button size="sm" disabled={!manualName.trim() || !manualEmail.trim()} onClick={addManual}>
                Add to selection
              </Button>
            </div>
          </div>
        )}
        {notify.isError && (
          <p className="text-sm text-red-600">{(notify.error as Error).message}</p>
        )}
      </div>
    </Modal>
  );
}
