import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  KeyRound,
  Pencil,
  ShieldCheck,
  Trash2,
  UserMinus,
} from 'lucide-react';

import { Avatar, Badge, Button, Input } from '@shared/components/ui';
import { cn } from '@shared/lib';

import type { RaiserApprovalPath } from '../types/approval-path.types';
import { useRemoveRaiser, useSaveApprovalPath } from '../hooks/useApprovalPaths';
import { AddPersonInline } from './AddPersonInline';
import type { PickedPerson } from './PersonPicker';

interface DraftLevel {
  key: string;
  userId: string;
  name: string;
  employeeCode: string;
  title: string;
  needsAccess?: boolean;
}

let draftSeq = 0;
const nextKey = () => `draft-${(draftSeq += 1)}`;

function toDrafts(path: RaiserApprovalPath): DraftLevel[] {
  return path.levels.map((l) => ({
    key: l.id,
    userId: l.userId,
    name: l.approver.name,
    employeeCode: l.approver.employeeCode,
    title: l.title,
  }));
}

/**
 * One raiser and the chain their requisitions follow.
 *
 * Rendered as a vertical stepper rather than a file-tree branch: approval is a
 * sequence, so numbered markers joined by a rail read the order at a glance in
 * a way indentation alone doesn't.
 */
export function RaiserChain({ path }: { path: RaiserApprovalPath }) {
  const [levels, setLevels] = useState<DraftLevel[]>(() => toDrafts(path));
  const [dirty, setDirty] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const save = useSaveApprovalPath();
  const removeRaiser = useRemoveRaiser();

  const update = (next: DraftLevel[]) => {
    setLevels(next);
    setDirty(true);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= levels.length) return;
    const next = [...levels];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const addApprover = (person: PickedPerson) => {
    if (levels.some((l) => l.userId === person.userId)) return;
    update([
      ...levels,
      {
        key: nextKey(),
        userId: person.userId,
        name: person.name,
        employeeCode: person.employeeCode,
        title: person.designation?.trim() || 'Approver',
        needsAccess: person.needsAccess,
      },
    ]);
  };

  const invalid = levels.some((l) => l.title.trim().length < 2);
  const provisioning = levels.filter((l) => l.needsAccess);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Raiser header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <Avatar name={path.raiser.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {path.raiser.name}
          </p>
          <p className="truncate text-xs text-slate-400">
            {path.raiser.employeeCode}
            {path.raiser.designation ? ` · ${path.raiser.designation}` : ''}
          </p>
        </div>
        <Badge tone={levels.length === 0 ? 'neutral' : 'brand'}>
          {levels.length === 0
            ? 'Direct to Corporate HR'
            : `${levels.length} step${levels.length > 1 ? 's' : ''}`}
        </Badge>
        {dirty && <Badge tone="warning">Unsaved</Badge>}
        <button
          type="button"
          title="Remove this raiser"
          onClick={() => {
            if (
              window.confirm(
                `Remove ${path.raiser.name} as a requisition raiser for ${path.unitName}? Their chain is deleted; existing requisitions are unaffected.`,
              )
            ) {
              removeRaiser.mutate({
                unitId: path.unitId,
                raiserId: path.raiser.id,
              });
            }
          }}
          className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
        >
          <UserMinus className="h-4 w-4" />
        </button>
      </div>

      {/* Stepper */}
      <div className="px-4 py-3">
        <ol>
          {levels.map((level, index) => (
            <li key={level.key} className="group relative flex gap-3 pb-3">
              {/* rail down to the next marker */}
              <span
                aria-hidden
                className="absolute bottom-0 left-[0.875rem] top-7 w-0.5 rounded bg-slate-200"
              />
              <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white ring-4 ring-white">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1 rounded-lg px-2 py-1 transition group-hover:bg-slate-50">
                {editingKey === level.key ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={level.title}
                      autoFocus
                      placeholder="Step label, e.g. Unit Head"
                      onChange={(e) => {
                        const next = [...levels];
                        next[index] = { ...level, title: e.target.value };
                        update(next);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                          setEditingKey(null);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="rounded p-1.5 text-emerald-600 hover:bg-white"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={level.name} size="sm" className="h-7 w-7 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {level.name}
                      </p>
                      <p
                        className={cn(
                          'truncate text-xs',
                          level.title.trim().length < 2
                            ? 'text-rose-500'
                            : 'text-slate-400',
                        )}
                      >
                        {level.title.trim() || 'Step label required'}
                        {level.employeeCode ? ` · ${level.employeeCode}` : ''}
                      </p>
                    </div>

                    {level.needsAccess && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <KeyRound className="h-3 w-3" />
                        Access on save
                      </span>
                    )}

                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        title="Rename step"
                        onClick={() => setEditingKey(level.key)}
                        className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move up"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-25"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        disabled={index === levels.length - 1}
                        onClick={() => move(index, 1)}
                        className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-25"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Remove step"
                        onClick={() =>
                          update(levels.filter((l) => l.key !== level.key))
                        }
                        className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}

          {/* Terminal step — appended by the backend, never configurable. */}
          <li className="relative flex gap-3">
            <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 rounded-lg px-2 py-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-800">Corporate HR</p>
                <Badge tone="success">Always last</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Final approval, then assigns a recruiter
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Footer */}
      <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <AddPersonInline
          cta="Add an approval step"
          placeholder="Search the person who should approve…"
          excludeUserIds={[...levels.map((l) => l.userId), path.raiser.id]}
          onPick={addApprover}
        />

        {provisioning.length > 0 && (
          <p className="flex items-start gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700">
            <KeyRound className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              {provisioning.map((l) => l.name).join(', ')}{' '}
              {provisioning.length > 1 ? 'have' : 'has'} no sign-in yet — saving
              grants Unit Approver for {path.unitName}.
            </span>
          </p>
        )}

        {save.isError && (
          <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
            {(save.error as Error).message}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">
            {path.updatedAt
              ? `Saved ${new Date(path.updatedAt).toLocaleDateString()}`
              : 'Not saved yet'}
          </span>
          <Button
            size="sm"
            leftIcon={<Check className="h-4 w-4" />}
            disabled={!dirty || invalid || save.isPending}
            isLoading={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  unitId: path.unitId,
                  raiserId: path.raiser.id,
                  levels: levels.map((l) => ({
                    userId: l.userId,
                    title: l.title.trim(),
                  })),
                },
                { onSuccess: () => setDirty(false) },
              )
            }
          >
            Save chain
          </Button>
        </div>
      </div>
    </div>
  );
}
