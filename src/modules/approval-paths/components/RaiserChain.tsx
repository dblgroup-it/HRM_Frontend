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

import {
  Avatar,
  Badge,
  Button,
  Input,
  TreeAddNode,
} from '@shared/components/ui';
import { cn } from '@shared/lib';

import type { RaiserApprovalPath } from '../types/approval-path.types';
import { useRemoveRaiser, useSaveApprovalPath } from '../hooks/useApprovalPaths';
import { PersonPicker, type PickedPerson } from './PersonPicker';

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

/** Icon-only step control — quiet until the row is hovered on pointer devices. */
function StepAction({
  title,
  onClick,
  disabled,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg p-1.5 text-slate-400 transition-colors duration-150',
        'hover:bg-white hover:shadow-sm active:scale-[0.96]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        'disabled:pointer-events-none disabled:opacity-25',
        danger ? 'hover:text-rose-600' : 'hover:text-slate-700',
      )}
    >
      {children}
    </button>
  );
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
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-white transition-[box-shadow,border-color] duration-200',
        dirty
          ? 'border-amber-200 shadow-card-hover'
          : 'border-slate-200/80 shadow-card hover:border-slate-300 hover:shadow-card-hover',
      )}
    >
      {/* Raiser header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 bg-white px-4 py-3">
        <Avatar name={path.raiser.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
            {path.raiser.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {path.raiser.employeeCode}
            {path.raiser.designation ? ` · ${path.raiser.designation}` : ''}
          </p>
        </div>
        <Badge tone={levels.length === 0 ? 'neutral' : 'brand'} className="shrink-0">
          {levels.length === 0
            ? 'Direct to Corporate HR'
            : `${levels.length} step${levels.length > 1 ? 's' : ''}`}
        </Badge>
        {dirty && (
          <Badge tone="warning" dot className="shrink-0">
            Unsaved
          </Badge>
        )}
        <button
          type="button"
          title="Remove this raiser"
          aria-label="Remove this raiser"
          onClick={() => {
            if (
              window.confirm(
                path.department
                  ? `Remove ${path.raiser.name}'s ${path.department} chain for ${path.unitName}? Their requisitions for that department fall back to the unit-wide chain. Existing requisitions are unaffected.`
                  : `Remove ${path.raiser.name} as a requisition raiser for ${path.unitName}? Their chain is deleted; existing requisitions are unaffected.`,
              )
            ) {
              removeRaiser.mutate({
                unitId: path.unitId,
                raiserId: path.raiser.id,
                department: path.department,
              });
            }
          }}
          className="shrink-0 rounded-lg p-1.5 text-slate-300 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
        >
          <UserMinus className="h-4 w-4" />
        </button>
      </div>

      {/* Stepper */}
      <div className="px-4 py-4">
        <ol>
          {levels.map((level, index) => {
            const editing = editingKey === level.key;
            const untitled = level.title.trim().length < 2;
            return (
              <li
                key={level.key}
                className="group relative flex animate-card-in gap-3 pb-3"
              >
                {/* rail down to the next marker */}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-[1.125rem] top-9 w-px -translate-x-1/2 origin-top animate-rail-draw bg-gradient-to-b from-brand-200 to-slate-200"
                />
                <span
                  className={cn(
                    'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums text-white ring-4 ring-white transition-[background,box-shadow] duration-200',
                    'bg-gradient-to-br from-brand-500 to-brand-700',
                    editing
                      ? 'shadow-[0_0_0_3px_rgba(24,119,192,0.18)]'
                      : 'shadow-[0_2px_6px_-2px_rgba(24,119,192,0.6)]',
                  )}
                >
                  {index + 1}
                </span>

                <div
                  className={cn(
                    'min-w-0 flex-1 rounded-xl border px-2.5 py-1.5 transition-[background-color,border-color,box-shadow] duration-200',
                    editing
                      ? 'border-brand-200 bg-brand-50/50'
                      : untitled
                        ? 'border-rose-100 bg-rose-50/40'
                        : 'border-transparent group-hover:border-slate-200 group-hover:bg-slate-50/80',
                  )}
                >
                  {editing ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={level.title}
                        autoFocus
                        placeholder="Step label, e.g. Unit Head"
                        className="h-9 border-slate-200 bg-white"
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
                        title="Done"
                        aria-label="Done"
                        onClick={() => setEditingKey(null)}
                        className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <Avatar
                        name={level.name}
                        size="sm"
                        className="h-7 w-7 text-[0.625rem]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {level.name}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 truncate text-xs',
                            untitled ? 'text-rose-600' : 'text-slate-500',
                          )}
                        >
                          {level.title.trim() || 'Step label required'}
                          {level.employeeCode ? ` · ${level.employeeCode}` : ''}
                        </p>
                      </div>

                      {level.needsAccess && (
                        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.625rem] font-medium text-emerald-700 ring-1 ring-emerald-100 sm:flex">
                          <KeyRound className="h-3 w-3" />
                          Access on save
                        </span>
                      )}

                      {/* Below sm these get their own right-aligned row, so the
                          approver's name keeps the full width. */}
                      <div className="flex w-full shrink-0 items-center justify-end gap-0.5 transition-opacity duration-150 sm:w-auto sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <StepAction
                          title="Rename step"
                          onClick={() => setEditingKey(level.key)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </StepAction>
                        <StepAction
                          title="Move up"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </StepAction>
                        <StepAction
                          title="Move down"
                          disabled={index === levels.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </StepAction>
                        <StepAction
                          danger
                          title="Remove step"
                          onClick={() =>
                            update(levels.filter((l) => l.key !== level.key))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </StepAction>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}

          {/* The chain grows from here — a node on the rail, so it reads as
              "insert another stage" rather than as a form control. */}
          <li className="relative pb-3">
            <span
              aria-hidden
              className="absolute bottom-0 left-[1.125rem] top-9 w-px -translate-x-1/2 origin-top animate-rail-draw bg-gradient-to-b from-brand-200 to-slate-200"
            />
            <TreeAddNode label="Add approval step">
              {(close) => (
                <PersonPicker
                  autoFocus
                  placeholder="Search the person who should approve…"
                  excludeUserIds={[
                    ...levels.map((l) => l.userId),
                    path.raiser.id,
                  ]}
                  onPick={(person) => {
                    addApprover(person);
                    close();
                  }}
                />
              )}
            </TreeAddNode>
          </li>

          {/* Terminal step — appended by the backend, never configurable. */}
          <li className="relative flex gap-3">
            <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_2px_6px_-2px_rgba(16,185,129,0.7)] ring-4 ring-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-emerald-100 bg-emerald-50/50 px-2.5 py-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  Corporate HR
                </p>
                <Badge tone="success">Always last</Badge>
              </div>
              <p className="mt-0.5 text-xs text-emerald-800/80">
                Final approval, then assigns a recruiter
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Footer */}
      <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
        {provisioning.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-[0.6875rem] leading-5 text-emerald-800">
            <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {provisioning.map((l) => l.name).join(', ')}{' '}
              {provisioning.length > 1 ? 'have' : 'has'} no sign-in yet — saving
              grants Unit Approver for {path.unitName}.
            </span>
          </p>
        )}

        {save.isError && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-xs leading-5 text-red-700">
            {(save.error as Error).message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[0.6875rem] text-slate-500">
            {path.updatedAt
              ? `Saved ${new Date(path.updatedAt).toLocaleDateString()}`
              : 'Not saved yet'}
          </span>
          <Button
            size="sm"
            leftIcon={<Check className="h-4 w-4" />}
            disabled={!dirty || invalid || save.isPending}
            isLoading={save.isPending}
            className="transition-transform duration-150 active:scale-[0.98]"
            onClick={() =>
              save.mutate(
                {
                  unitId: path.unitId,
                  raiserId: path.raiser.id,
                  department: path.department,
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
