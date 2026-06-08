import { useState } from 'react';
import {
  Check,
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

export function UnitDetail({ unit }: { unit: ConfigUnit }) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(unit.name);
  const [deptName, setDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);

  const renameUnit = useRenameUnit();
  const deleteUnit = useDeleteUnit();
  const addDepartment = useAddDepartment();

  const seats = unit.departments.flatMap((d) => d.positions);
  const sanctioned = seats.reduce((s, p) => s + p.sanctioned, 0);
  const filled = seats.reduce((s, p) => s + p.filled, 0);
  const vacant = Math.max(0, sanctioned - filled);

  const saveName = () => {
    if (name.trim().length < 2 || name.trim() === unit.name) {
      setName(unit.name);
      setEditingName(false);
      return;
    }
    renameUnit.mutate(
      { id: unit.id, name: name.trim() },
      { onSuccess: () => setEditingName(false) },
    );
  };

  const addDept = () => {
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
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {editingName ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
              />
              <Button size="sm" isLoading={renameUnit.isPending} onClick={saveName}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setName(unit.name);
                  setEditingName(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                {unit.name}
              </h2>
              <button
                type="button"
                title="Rename unit"
                onClick={() => {
                  setName(unit.name);
                  setEditingName(true);
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}

          {!editingName && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete unit "${unit.name}" and all its departments & seats?`,
                  )
                ) {
                  deleteUnit.mutate(unit.id);
                }
              }}
              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
            >
              Delete unit
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Stat label="Departments" value={unit.departments.length} tone="slate" />
          <Stat label="Sanctioned" value={sanctioned} tone="brand" />
          <Stat label="Filled" value={filled} tone="emerald" />
          <Stat label="Vacant" value={vacant} tone="amber" />
        </div>
      </div>

      {/* Departments */}
      <div className="space-y-4 p-5">
        {unit.departments.length === 0 && !addingDept && (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
            <Layers className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No departments yet.</p>
          </div>
        )}

        {unit.departments.map((dept) => (
          <DepartmentBlock key={dept.id} department={dept} />
        ))}

        {/* Add department */}
        {addingDept ? (
          <div className="flex items-end gap-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
            <Input
              label="New department"
              placeholder="e.g. IT Infrastructure"
              autoFocus
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDept()}
            />
            <Button
              isLoading={addDepartment.isPending}
              disabled={deptName.trim().length < 2}
              onClick={addDept}
            >
              Add
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDeptName('');
                setAddingDept(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingDept(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-600"
          >
            <FolderPlus className="h-4 w-4" /> Add department
          </button>
        )}
      </div>
    </section>
  );
}

function DepartmentBlock({ department }: { department: ConfigDepartment }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(department.name);
  const [seatModal, setSeatModal] = useState<{
    position: ConfigPosition | null;
  } | null>(null);

  const renameDepartment = useRenameDepartment();
  const deleteDepartment = useDeleteDepartment();
  const removePosition = useDeletePosition();

  const sectionSuggestions = [
    ...new Set(
      department.positions
        .map((p) => p.section?.trim())
        .filter((s): s is string => Boolean(s)),
    ),
  ];

  // Group seats by section.
  const order: string[] = [];
  const bySection = new Map<string, ConfigPosition[]>();
  for (const p of department.positions) {
    const key = p.section?.trim() || 'Unsectioned';
    const list = bySection.get(key) ?? [];
    list.push(p);
    bySection.set(key, list);
    if (!order.includes(key)) order.push(key);
  }

  const sanctioned = department.positions.reduce((s, p) => s + p.sanctioned, 0);
  const filled = department.positions.reduce((s, p) => s + p.filled, 0);

  const saveName = () => {
    if (name.trim().length < 2 || name.trim() === department.name) {
      setName(department.name);
      setEditing(false);
      return;
    }
    renameDepartment.mutate(
      { id: department.id, name: name.trim() },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between gap-2 bg-slate-50/70 px-4 py-2.5">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
            />
            <button
              type="button"
              onClick={saveName}
              className="rounded p-1 text-emerald-600 hover:bg-white"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setName(department.name);
                setEditing(false);
              }}
              className="rounded p-1 text-slate-400 hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-800">{department.name}</p>
              <span className="text-xs text-slate-400">
                {filled}/{sanctioned} filled
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setSeatModal({ position: null })}
              >
                Seat
              </Button>
              <button
                type="button"
                title="Rename department"
                onClick={() => {
                  setName(department.name);
                  setEditing(true);
                }}
                className="rounded p-1.5 text-slate-400 hover:bg-white"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Delete department"
                onClick={() => {
                  if (window.confirm(`Delete department "${department.name}"?`)) {
                    deleteDepartment.mutate(department.id);
                  }
                }}
                className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-rose-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {department.positions.length === 0 ? (
        <p className="px-4 py-4 text-sm text-slate-400">
          No seats yet — add the first one.
        </p>
      ) : (
        order.map((sec) => (
          <div key={sec} className="border-t border-slate-100">
            <p className="px-4 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {sec}
            </p>
            <div>
              {(bySection.get(sec) ?? []).map((pos) => {
                const vacant = Math.max(0, pos.sanctioned - pos.filled);
                return (
                  <div
                    key={pos.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {pos.designation}
                      </p>
                      <p className="text-xs capitalize text-slate-400">
                        {pos.category.toLowerCase()}
                      </p>
                    </div>
                    <span className="text-sm text-slate-500">
                      {pos.filled}/{pos.sanctioned}
                    </span>
                    <Badge tone={vacant > 0 ? 'warning' : 'success'}>
                      {vacant > 0 ? `${vacant} vacant` : 'Full'}
                    </Badge>
                    <button
                      type="button"
                      title="Edit seat"
                      onClick={() => setSeatModal({ position: pos })}
                      className="rounded p-1.5 text-slate-400 hover:bg-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete seat"
                      onClick={() => removePosition.mutate(pos.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'brand' | 'emerald' | 'amber';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-600',
    brand: 'bg-brand-50 text-brand-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 rounded-lg px-3 py-1.5 text-sm',
        tones[tone],
      )}
    >
      <span className="font-semibold">{value}</span>
      <span className="text-xs opacity-80">{label}</span>
    </span>
  );
}
