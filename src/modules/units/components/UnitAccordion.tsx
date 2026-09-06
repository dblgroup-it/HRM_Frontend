import { useState } from 'react';
import {
  Building2,
  ChevronDown,
  Folder,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { Badge, Button, Input } from '@shared/components/ui';
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
        'w-16 shrink-0 text-right text-[11px] font-medium',
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
      onClick={onClick}
      className={cn(
        'rounded-lg p-1.5 text-slate-400 transition hover:bg-white',
        danger ? 'hover:text-rose-500' : 'hover:text-slate-700',
      )}
    >
      {children}
    </button>
  );
}

/** A unit and everything sanctioned under it. */
export function UnitAccordion({
  unit,
  canEdit,
  canDelete,
  defaultOpen = false,
}: {
  unit: ConfigUnit;
  canEdit: boolean;
  canDelete: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(unit.name);
  const [addingDept, setAddingDept] = useState(false);
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

  const submitDept = () => {
    if (deptName.trim().length < 2) return;
    addDepartment.mutate(
      { unitId: unit.id, name: deptName.trim() },
      {
        onSuccess: () => {
          setDeptName('');
          setAddingDept(false);
        },
      },
    );
  };

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-white transition',
        open ? 'border-brand-200 shadow-sm' : 'border-slate-200',
      )}
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
            'group flex items-center gap-3 px-4 py-3 transition',
            open ? 'bg-brand-50/60' : 'hover:bg-slate-50',
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
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition',
                open ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500',
              )}
            >
              <Building2 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800">
                {unit.name}
              </span>
              <span className="block text-xs text-slate-400">
                {unit.departments.length} department
                {unit.departments.length === 1 ? '' : 's'}
                {unit._count?.employees
                  ? ` · ${unit._count.employees} employees`
                  : ''}
              </span>
            </span>
          </button>

          {sanctioned > 0 ? (
            <>
              <FillMeter filled={filled} sanctioned={sanctioned} />
              <Badge tone={vacant > 0 ? 'warning' : 'success'}>
                {vacant > 0 ? `${vacant} vacant` : 'Full'}
              </Badge>
            </>
          ) : (
            <Badge tone="neutral">No seats</Badge>
          )}

          <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
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

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Collapse' : 'Expand'}
            className="shrink-0"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 text-slate-400 transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>
        </div>
      )}

      {open && (
        <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/50 p-4">
          {unit.departments.map((dept) => (
            <DepartmentCard key={dept.id} department={dept} canEdit={canEdit} />
          ))}

          {unit.departments.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-xs text-slate-400">
              No departments yet.
            </p>
          )}

          {canEdit &&
            (addingDept ? (
              <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-white p-2.5">
                <Input
                  value={deptName}
                  autoFocus
                  placeholder="Department name"
                  onChange={(e) => setDeptName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitDept();
                    if (e.key === 'Escape') {
                      setDeptName('');
                      setAddingDept(false);
                    }
                  }}
                />
                <Button
                  size="sm"
                  isLoading={addDepartment.isPending}
                  disabled={deptName.trim().length < 2}
                  onClick={submitDept}
                >
                  Add
                </Button>
                <RowAction
                  title="Cancel"
                  onClick={() => {
                    setDeptName('');
                    setAddingDept(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </RowAction>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingDept(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Add department
              </button>
            ))}
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
        <div className="group flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-slate-50/70">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform',
                !open && '-rotate-90',
              )}
            />
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-500">
              <Folder className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-800">
                {department.name}
              </span>
              <span className="block text-[11px] text-slate-400">
                {department.positions.length} seat
                {department.positions.length === 1 ? '' : 's'}
              </span>
            </span>
          </button>

          <FillMeter filled={filled} sanctioned={sanctioned} />
          <SeatStatus filled={filled} sanctioned={sanctioned} />

          {canEdit && (
            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
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
        </div>
      )}

      {open && (
        <div className="border-t border-slate-100">
          {department.positions.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-400">
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
                    <div className="flex items-center gap-2 bg-slate-50/70 px-3 py-1.5">
                      <Layers className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {sec}
                      </span>
                      <FillMeter filled={t.filled} sanctioned={t.sanctioned} />
                      <SeatStatus filled={t.filled} sanctioned={t.sanctioned} />
                    </div>
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
        'group flex items-center gap-2.5 border-t border-slate-50 px-3 py-2 transition hover:bg-brand-50/30',
        indented && 'pl-8',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          vacant > 0 ? 'bg-amber-400' : 'bg-emerald-400',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-slate-700">
          {position.designation}
        </span>
        <span className="block truncate text-[11px] capitalize text-slate-400">
          {position.category.toLowerCase()}
          {position.grade ? ` · grade ${position.grade}` : ''}
        </span>
      </span>

      <FillMeter filled={position.filled} sanctioned={position.sanctioned} />

      <SeatStatus filled={position.filled} sanctioned={position.sanctioned} />

      {canEdit && (
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
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
