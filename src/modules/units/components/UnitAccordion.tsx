import { useState } from 'react';
import {
  Building2,
  ChevronDown,
  Folder,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { Badge, Button, Input, TreeAddNode } from '@shared/components/ui';
import { cn } from '@shared/lib';

import type {
  ConfigDepartment,
  ConfigPosition,
  ConfigUnit,
} from '../types/unit.types';
import {
  useAddDepartment,
  useDeleteDepartment,
  useDeletePosition,
  useDeleteUnit,
  useRenameDepartment,
  useRenameUnit,
} from '../hooks/useUnits';
import { SeatFormModal } from './SeatFormModal';
import { FillMeter } from './FillMeter';

function tally(positions: ConfigPosition[]) {
  const sanctioned = positions.reduce((s, p) => s + p.sanctioned, 0);
  const filled = positions.reduce((s, p) => s + p.filled, 0);
  return { sanctioned, filled, vacant: Math.max(0, sanctioned - filled) };
}

/**
 * Fixed-width trailing status, so the meter and the status text line up in a
 * clean column across department, section and seat rows.
 */
function SeatStatus({ filled, sanctioned }: { filled: number; sanctioned: number }) {
  const vacant = Math.max(0, sanctioned - filled);
  if (sanctioned === 0)
    return <span className="w-16 shrink-0 text-right text-[11px] text-slate-300">—</span>;
  return (
    <span
      className={cn(
        'w-16 shrink-0 text-right text-[11px] font-medium tabular-nums',
        vacant > 0 ? 'text-amber-600' : 'text-emerald-600',
      )}
    >
      {vacant > 0 ? `${vacant} vacant` : 'Full'}
    </span>
  );
}

/** Icon-only control that only becomes prominent on row hover. */
function RowAction({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'rounded-lg p-1.5 text-slate-400 transition-colors duration-150',
        'hover:bg-white hover:shadow-sm active:scale-[0.96]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        danger ? 'hover:text-rose-600' : 'hover:text-slate-700',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Row controls: always reachable on touch, quiet until hover on pointer
 * devices where the extra chrome would otherwise be constant noise.
 */
const HOVER_ACTIONS =
  'flex shrink-0 items-center gap-0.5 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100';

/**
 * Meters, badges and row controls: their own right-aligned row on phones so the
 * name keeps the full width, and back in line from sm up (`display: contents`).
 */
const META_ROW = 'flex w-full items-center justify-end gap-2 sm:contents';

/** A unit and everything sanctioned under it. */
export function UnitAccordion({
  unit,
  canEdit,
  canDelete,
  defaultOpen = false,
  index = 0,
}: {
  unit: ConfigUnit;
  canEdit: boolean;
  canDelete: boolean;
  defaultOpen?: boolean;
  /** Position in the list — only used to stagger the entrance animation. */
  index?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(unit.name);
  const [deptName, setDeptName] = useState('');

  const renameUnit = useRenameUnit();
  const deleteUnit = useDeleteUnit();
  const addDepartment = useAddDepartment();

  const seats = unit.departments.flatMap((d) => d.positions);
  const { sanctioned, filled, vacant } = tally(seats);

  const saveName = () => {
    if (name.trim().length < 2 || name.trim() === unit.name) {
      setName(unit.name);
      setRenaming(false);
      return;
    }
    renameUnit.mutate(
      { id: unit.id, name: name.trim() },
      { onSuccess: () => setRenaming(false) },
    );
  };

  const submitDept = (close: () => void) => {
    if (deptName.trim().length < 2) return;
    addDepartment.mutate(
      { unitId: unit.id, name: deptName.trim() },
      {
        onSuccess: () => {
          setDeptName('');
          close();
        },
      },
    );
  };

  return (
    <section
      className={cn(
        'animate-card-in overflow-hidden rounded-2xl border bg-white transition-[box-shadow,border-color] duration-200',
        open
          ? 'border-brand-200 shadow-card-hover'
          : 'border-slate-200/70 shadow-card hover:border-slate-300 hover:shadow-card-hover',
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      {renaming ? (
        <div className="flex items-center gap-2 px-4 py-3">
          <Input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') {
                setName(unit.name);
                setRenaming(false);
              }
            }}
          />
          <Button size="sm" onClick={saveName}>
            Save
          </Button>
          <RowAction
            title="Cancel"
            onClick={() => {
              setName(unit.name);
              setRenaming(false);
            }}
          >
            <X className="h-4 w-4" />
          </RowAction>
        </div>
      ) : (
        <div
          className={cn(
            'group flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 transition-colors duration-200',
            open ? 'bg-brand-50/50' : 'hover:bg-slate-50/80',
          )}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-[background,color,box-shadow] duration-200',
                open
                  ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_4px_10px_-3px_rgba(24,119,192,0.55)]'
                  : 'bg-slate-100 text-slate-500',
              )}
            >
              <Building2 className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] font-semibold tracking-tight text-slate-900">
                {unit.name}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">
                {unit.departments.length} department
                {unit.departments.length === 1 ? '' : 's'}
                {unit._count?.employees
                  ? ` · ${unit._count.employees} employees`
                  : ''}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Collapse' : 'Expand'}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200 sm:order-last',
              open
                ? 'bg-white text-brand-600 ring-1 ring-brand-100'
                : 'text-slate-400 hover:bg-white hover:text-slate-600',
            )}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </button>

          {/* Below sm this becomes its own right-aligned row so the unit name
              keeps the full width; sm:contents restores the single-row layout. */}
          <span className={META_ROW}>
          {sanctioned > 0 ? (
            <>
              <FillMeter
                filled={filled}
                sanctioned={sanctioned}
                className="hidden md:flex"
              />
              <Badge
                tone={vacant > 0 ? 'warning' : 'success'}
                dot
                className="shrink-0"
              >
                {vacant > 0 ? `${vacant} vacant` : 'Full'}
              </Badge>
            </>
          ) : (
            <Badge tone="neutral" className="shrink-0">
              No seats
            </Badge>
          )}

          <span className={HOVER_ACTIONS}>
            {canEdit && (
              <RowAction
                title="Rename unit"
                onClick={() => {
                  setName(unit.name);
                  setRenaming(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </RowAction>
            )}
            {canDelete && (
              <RowAction
                danger
                title="Delete unit"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete "${unit.name}" and all its departments and seats?`,
                    )
                  ) {
                    deleteUnit.mutate(unit.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </RowAction>
            )}
          </span>
          </span>
        </div>
      )}

      {open && (
        <div className="animate-branch-open border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-4">
          {/* Departments hang off a single trunk, so the unit → department
              relationship reads structurally, not just by indentation. */}
          <div className="relative">
            {unit.departments.length > 0 && (
              <span
                aria-hidden
                className="absolute bottom-0 left-[1.125rem] top-0 hidden w-px -translate-x-1/2 origin-top animate-rail-draw bg-gradient-to-b from-brand-200 to-slate-200 sm:block"
              />
            )}

            <div className="space-y-2.5">
              {unit.departments.map((dept, i) => (
                <div key={dept.id} className="relative sm:pl-11">
                  <span
                    aria-hidden
                    className="absolute left-[1.125rem] top-6 hidden h-px w-5 rounded bg-slate-200 sm:block"
                  />
                  <span
                    aria-hidden
                    className="absolute left-[1.125rem] top-[1.4375rem] hidden h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-400 ring-2 ring-white sm:block"
                  />
                  <div
                    className="animate-card-in"
                    style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                  >
                    <DepartmentCard department={dept} canEdit={canEdit} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {unit.departments.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Folder className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-slate-700">
                No departments yet
              </p>
              {canEdit && (
                <p className="max-w-sm text-xs leading-5 text-slate-500">
                  Add the first department to start building this unit's
                  organogram.
                </p>
              )}
            </div>
          )}

          {/* The unit's tree grows from here. */}
          {canEdit && (
            <TreeAddNode
              className="mt-2.5"
              railAbove={unit.departments.length > 0}
              label="Add department"
            >
              {(close) => (
                <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-white p-2.5 shadow-sm">
                  <Input
                    value={deptName}
                    autoFocus
                    placeholder="Department name"
                    onChange={(e) => setDeptName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitDept(close);
                      if (e.key === 'Escape') {
                        setDeptName('');
                        close();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    isLoading={addDepartment.isPending}
                    disabled={deptName.trim().length < 2}
                    onClick={() => submitDept(close)}
                  >
                    Add
                  </Button>
                  <RowAction
                    title="Cancel"
                    onClick={() => {
                      setDeptName('');
                      close();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </RowAction>
                </div>
              )}
            </TreeAddNode>
          )}
        </div>
      )}
    </section>
  );
}

function DepartmentCard({
  department,
  canEdit,
}: {
  department: ConfigDepartment;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(department.name);
  const [seatModal, setSeatModal] = useState<{
    position: ConfigPosition | null;
  } | null>(null);

  const renameDepartment = useRenameDepartment();
  const deleteDepartment = useDeleteDepartment();

  const sectionSuggestions = [
    ...new Set(
      department.positions
        .map((p) => p.section?.trim())
        .filter((s): s is string => Boolean(s)),
    ),
  ];

  // Group by section, preserving first-seen order. Unsectioned seats list
  // directly under the department rather than under a fake "Unsectioned" group.
  const order: string[] = [];
  const bySection = new Map<string, ConfigPosition[]>();
  for (const p of department.positions) {
    const key = p.section?.trim() || '';
    const list = bySection.get(key) ?? [];
    list.push(p);
    bySection.set(key, list);
    if (!order.includes(key)) order.push(key);
  }
  const unsectioned = bySection.get('') ?? [];
  const sections = order.filter((s) => s !== '');

  const { sanctioned, filled } = tally(department.positions);

  const saveName = () => {
    if (name.trim().length < 2 || name.trim() === department.name) {
      setName(department.name);
      setRenaming(false);
      return;
    }
    renameDepartment.mutate(
      { id: department.id, name: name.trim() },
      { onSuccess: () => setRenaming(false) },
    );
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-white transition-[box-shadow,border-color] duration-200',
        open
          ? 'border-slate-200 shadow-sm'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-sm',
      )}
    >
      {renaming ? (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') {
                setName(department.name);
                setRenaming(false);
              }
            }}
          />
          <Button size="sm" onClick={saveName}>
            Save
          </Button>
          <RowAction
            title="Cancel"
            onClick={() => {
              setName(department.name);
              setRenaming(false);
            }}
          >
            <X className="h-4 w-4" />
          </RowAction>
        </div>
      ) : (
        <div className="group flex flex-wrap items-center gap-x-2.5 gap-y-2 px-3 py-2.5 transition-colors duration-200 hover:bg-slate-50/70">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200',
                !open && '-rotate-90',
              )}
            />
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500 ring-1 ring-violet-100/70">
              <Folder className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {department.name}
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                {department.positions.length} seat
                {department.positions.length === 1 ? '' : 's'}
              </span>
            </span>
          </button>

          <span className={META_ROW}>
          <FillMeter
            filled={filled}
            sanctioned={sanctioned}
            className="hidden md:flex"
          />
          <SeatStatus filled={filled} sanctioned={sanctioned} />

          {canEdit && (
            <span className={HOVER_ACTIONS}>
              <RowAction
                title="Add seat"
                onClick={() => setSeatModal({ position: null })}
              >
                <Plus className="h-4 w-4" />
              </RowAction>
              <RowAction
                title="Rename department"
                onClick={() => {
                  setName(department.name);
                  setRenaming(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </RowAction>
              <RowAction
                danger
                title="Delete department"
                onClick={() => {
                  if (window.confirm(`Delete department "${department.name}"?`)) {
                    deleteDepartment.mutate(department.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </RowAction>
            </span>
          )}
          </span>
        </div>
      )}

      {open && (
        <div className="animate-branch-open border-t border-slate-100">
          {department.positions.length === 0 ? (
            <p className="px-3 py-3.5 text-xs text-slate-400">
              {canEdit ? 'No seats yet — add the first one.' : 'No seats yet.'}
            </p>
          ) : (
            <>
              {unsectioned.map((pos) => (
                <SeatRow
                  key={pos.id}
                  position={pos}
                  canEdit={canEdit}
                  onEdit={() => setSeatModal({ position: pos })}
                />
              ))}

              {sections.map((sec) => {
                const list = bySection.get(sec) ?? [];
                const t = tally(list);
                return (
                  <div key={sec} className="border-t border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-1.5">
                      <Layers className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {sec}
                      </span>
                      <FillMeter
                        filled={t.filled}
                        sanctioned={t.sanctioned}
                        className="hidden md:flex"
                      />
                      <SeatStatus filled={t.filled} sanctioned={t.sanctioned} />
                    </div>
                    {/* Seats in a section sit on their own rail so the
                        section → seat nesting stays legible at a glance. */}
                    <div className="relative">
                      <span
                        aria-hidden
                        className="absolute bottom-2 left-[1.375rem] top-0 hidden w-px bg-slate-100 sm:block"
                      />
                      {list.map((pos) => (
                        <SeatRow
                          key={pos.id}
                          position={pos}
                          canEdit={canEdit}
                          onEdit={() => setSeatModal({ position: pos })}
                          indented
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {seatModal && (
        <SeatFormModal
          open
          onClose={() => setSeatModal(null)}
          departmentId={department.id}
          departmentName={department.name}
          position={seatModal.position}
          sectionSuggestions={sectionSuggestions}
        />
      )}
    </div>
  );
}

function SeatRow({
  position,
  canEdit,
  onEdit,
  indented = false,
}: {
  position: ConfigPosition;
  canEdit: boolean;
  onEdit: () => void;
  indented?: boolean;
}) {
  const removePosition = useDeletePosition();
  const vacant = Math.max(0, position.sanctioned - position.filled);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2.5 border-t border-slate-50 px-3 py-2 transition-colors duration-150 hover:bg-brand-50/40',
        indented && 'pl-8 sm:pl-9',
      )}
    >
      {indented && (
        <span
          aria-hidden
          className="absolute left-[1.375rem] top-1/2 hidden h-px w-2.5 bg-slate-200 sm:block"
        />
      )}
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full ring-2 ring-white',
          vacant > 0 ? 'bg-amber-400' : 'bg-emerald-400',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-slate-800">
          {position.designation}
        </span>
        <span className="mt-0.5 block truncate text-[11px] capitalize text-slate-500">
          {position.category.toLowerCase()}
          {position.grade ? ` · grade ${position.grade}` : ''}
        </span>
      </span>

      <FillMeter
        filled={position.filled}
        sanctioned={position.sanctioned}
        className="hidden md:flex"
      />

      <SeatStatus filled={position.filled} sanctioned={position.sanctioned} />

      {canEdit && (
        <span className={HOVER_ACTIONS}>
          <RowAction title="Edit seat" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </RowAction>
          <RowAction
            danger
            title="Delete seat"
            onClick={() => {
              if (window.confirm(`Delete seat "${position.designation}"?`)) {
                removePosition.mutate(position.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </RowAction>
        </span>
      )}
    </div>
  );
}
