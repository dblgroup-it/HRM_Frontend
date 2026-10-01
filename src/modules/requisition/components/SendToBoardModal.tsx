import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Landmark, MailWarning, Send } from 'lucide-react';

import { Button, Modal, Spinner } from '@shared/components/ui';
import { cn } from '@shared/lib';

import { requisitionApi } from '../api/requisition.api';

/**
 * The CHRO picks who on the board votes. Each chosen member is emailed a
 * personal link; the first to decide settles the requisition.
 */
export function SendToBoardModal({
  requisitionId,
  note,
  busy,
  error,
  onClose,
  onSend,
}: {
  requisitionId: string;
  /** The remark already typed on the step, sent with the hand-off. */
  note: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSend: (memberIds: string[]) => void;
}) {
  const groups = useQuery({
    queryKey: ['requisitions', requisitionId, 'board-members'],
    queryFn: () => requisitionApi.boardMembers(requisitionId),
  });
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleGroup = (ids: string[]) =>
    setPicked((prev) => {
      const next = new Set(prev);
      const all = ids.every((i) => next.has(i));
      for (const i of ids) {
        if (all) next.delete(i);
        else next.add(i);
      }
      return next;
    });

  return (
    <Modal
      open
      onClose={onClose}
      title="Send to the Board"
      size="md"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {picked.size === 0
              ? 'Choose at least one member'
              : `${picked.size} member${picked.size === 1 ? '' : 's'} will be emailed`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={picked.size === 0}
              isLoading={busy}
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() => onSend([...picked])}
            >
              Send to {picked.size || ''} member{picked.size === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      }
    >
      <p className="text-sm leading-6 text-slate-600">
        Each member you choose gets an email with a link to approve or reject
        this requisition. The first to decide settles it.
      </p>
      {note.trim() && (
        <p className="mt-2 rounded-lg border-l-2 border-brand-400 bg-brand-50/60 px-3 py-1.5 text-xs italic text-slate-600">
          Your remark goes with it: “{note.trim()}”
        </p>
      )}

      <div className="mt-4 space-y-4">
        {groups.isLoading && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}
        {groups.isError && (
          <p className="text-sm text-red-600">
            {(groups.error as Error).message}
          </p>
        )}
        {groups.data?.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No board groups have members yet. Add them under Board groups
            first.
          </p>
        )}
        {groups.data?.map((g) => {
          const ids = g.members.filter((m) => m.hasEmail).map((m) => m.id);
          const all = ids.length > 0 && ids.every((i) => picked.has(i));
          return (
            <section key={g.id}>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Landmark className="h-3.5 w-3.5" />
                  {g.name}
                </p>
                {ids.length > 1 && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(ids)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    {all ? 'Clear' : 'Select all'}
                  </button>
                )}
              </div>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {g.members.map((m) => (
                  <li key={m.id}>
                    <label
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 text-sm',
                        m.hasEmail
                          ? 'cursor-pointer hover:bg-slate-50'
                          : 'cursor-not-allowed opacity-60'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        checked={picked.has(m.id)}
                        disabled={!m.hasEmail}
                        onChange={() => toggle(m.id)}
                      />
                      <span className="flex-1 text-slate-800">{m.name}</span>
                      {!m.hasEmail && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                          <MailWarning className="h-3.5 w-3.5" />
                          No email
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
