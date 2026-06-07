import { useState } from 'react';
import {
  ChevronDown,
  Plus,
  Trash2,
  Users,
  Check,
  Pencil,
  X,
} from 'lucide-react';

import { Badge, Button, Card, Input, Select } from '@shared/components/ui';
import { cn } from '@shared/lib';

import type {
  ConfigDepartment,
  ConfigPosition,
  ConfigUnit,
  SeatCategory,
} from '../types/unit.types';
import {
  useAddDepartment,
  useDeleteDepartment,
  useDeletePosition,
  useDeleteUnit,
  useRenameDepartment,
  useRenameUnit,
  useUpdatePosition,
  useUpsertPosition,
} from '../hooks/useUnits';

const CATEGORY_OPTIONS = [
  { value: 'OFFICER', label: 'Officer' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'WORKER', label: 'Worker' },
];

export function UnitCard({ unit }: { unit: ConfigUnit }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(unit.name);
  const [deptName, setDeptName] = useState('');

  const addDepartment = useAddDepartment();
  const deleteUnit = useDeleteUnit();
  const renameUnit = useRenameUnit();

  const allSeats = unit.departments.flatMap((d) => d.positions);
  const sanctioned = allSeats.reduce((s, p) => s + p.sanctioned, 0);
  const filledTotal = allSeats.reduce((s, p) => s + p.filled, 0);
  const vacantTotal = Math.max(0, sanctioned - filledTotal);

  const saveName = () => {
    if (name.trim().length < 2 || name.trim() === unit.name) {
      setEditing(false);
      return;
    }
    renameUnit.mutate(
      { id: unit.id, name: name.trim() },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        {editing ? (
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
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex flex-1 items-center gap-3 text-left"
          >
            <ChevronDown
              className={cn(
                'h-5 w-5 text-slate-400 transition-transform',
                open && 'rotate-180',
              )}
            />
            <div>
              <p className="font-semibold text-slate-900">{unit.name}</p>
              <p className="text-xs text-slate-400">
                {unit.departments.length} departments · {filledTotal}/
                {sanctioned} filled · {vacantTotal} vacant
              </p>
            </div>
          </button>
        )}

        {!editing && (
          <div className="flex items-center gap-2">
            <Badge tone="brand">
              <Users className="mr-1 h-3 w-3" />
              {unit._count?.employees ?? 0}
            </Badge>
            <IconButton title="Rename unit" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 text-slate-500" />
            </IconButton>
            <IconButton
              title="Delete unit"
              loading={deleteUnit.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete unit "${unit.name}" and all its departments & seats?`,
                  )
                ) {
                  deleteUnit.mutate(unit.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </IconButton>
          </div>
        )}
      </div>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-5 py-4">
          {unit.departments.map((dept) => (
            <DepartmentBlock key={dept.id} department={dept} />
          ))}

          {/* Add department */}
          <div className="flex items-end gap-2 rounded-lg border border-dashed border-slate-300 p-3">
            <Input
              label="New department"
              placeholder="e.g. Spinning"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
            />
            <Button
              isLoading={addDepartment.isPending}
              disabled={deptName.trim().length < 2}
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() =>
                addDepartment.mutate(
                  { unitId: unit.id, name: deptName.trim() },
                  { onSuccess: () => setDeptName('') },
                )
              }
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function DepartmentBlock({ department }: { department: ConfigDepartment }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(department.name);

  const renameDepartment = useRenameDepartment();
  const deleteDepartment = useDeleteDepartment();
  const upsertPosition = useUpsertPosition();

  const [designation, setDesignation] = useState('');
  const [category, setCategory] = useState<SeatCategory>('OFFICER');
  const [sanctioned, setSanctioned] = useState('1');
  const [filled, setFilled] = useState('0');

  const saveName = () => {
    if (name.trim().length < 2 || name.trim() === department.name) {
      setEditing(false);
      return;
    }
    renameDepartment.mutate(
      { id: department.id, name: name.trim() },
      { onSuccess: () => setEditing(false) },
    );
  };

  const addPosition = () => {
    if (designation.trim().length < 2) return;
    upsertPosition.mutate(
      {
        departmentId: department.id,
        input: {
          designation: designation.trim(),
          category,
          sanctioned: Number(sanctioned) || 0,
          filled: Number(filled) || 0,
        },
      },
      {
        onSuccess: () => {
          setDesignation('');
          setSanctioned('1');
          setFilled('0');
        },
      },
    );
  };

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
            />
            <IconButton title="Save" onClick={saveName}>
              <Check className="h-4 w-4 text-emerald-600" />
            </IconButton>
            <IconButton
              title="Cancel"
              onClick={() => {
                setName(department.name);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4 text-slate-400" />
            </IconButton>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-700">
              {department.name}
            </p>
            <div className="flex items-center gap-1">
              <IconButton title="Rename department" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 text-slate-400" />
              </IconButton>
              <IconButton
                title="Delete department"
                onClick={() => {
                  if (window.confirm(`Delete department "${department.name}"?`)) {
                    deleteDepartment.mutate(department.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
              </IconButton>
            </div>
          </>
        )}
      </div>

      <div className="divide-y divide-slate-50">
        {department.positions.map((pos) => (
          <SeatRow key={pos.id} position={pos} />
        ))}
        {department.positions.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-400">No seats yet.</p>
        )}
      </div>

      {/* Add seat */}
      <div className="grid grid-cols-2 items-end gap-2 border-t border-slate-100 p-3 sm:grid-cols-[1fr_130px_90px_90px_auto]">
        <Input
          label="Designation"
          placeholder="e.g. Officer"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
        />
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value as SeatCategory)}
        />
        <Input
          label="Sanctioned"
          type="number"
          min={0}
          value={sanctioned}
          onChange={(e) => setSanctioned(e.target.value)}
        />
        <Input
          label="Filled"
          type="number"
          min={0}
          value={filled}
          onChange={(e) => setFilled(e.target.value)}
        />
        <Button
          isLoading={upsertPosition.isPending}
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={addPosition}
        >
          Seat
        </Button>
      </div>
    </div>
  );
}

function SeatRow({ position }: { position: ConfigPosition }) {
  const [editing, setEditing] = useState(false);
  const [designation, setDesignation] = useState(position.designation);
  const [category, setCategory] = useState<SeatCategory>(position.category);
  const [sanctioned, setSanctioned] = useState(String(position.sanctioned));
  const [filled, setFilled] = useState(String(position.filled));

  const update = useUpdatePosition();
  const remove = useDeletePosition();

  const vacant = Math.max(0, position.sanctioned - position.filled);

  const save = () => {
    if (designation.trim().length < 2) return;
    update.mutate(
      {
        id: position.id,
        input: {
          designation: designation.trim(),
          category,
          sanctioned: Number(sanctioned) || 0,
          filled: Number(filled) || 0,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  if (editing) {
    return (
      <div className="grid grid-cols-2 items-end gap-2 px-3 py-2 sm:grid-cols-[1fr_120px_80px_80px_auto]">
        <Input
          label="Designation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
        />
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value as SeatCategory)}
        />
        <Input
          label="Sanctioned"
          type="number"
          min={0}
          value={sanctioned}
          onChange={(e) => setSanctioned(e.target.value)}
        />
        <Input
          label="Filled"
          type="number"
          min={0}
          value={filled}
          onChange={(e) => setFilled(e.target.value)}
        />
        <div className="flex items-center gap-1 pb-0.5">
          <Button size="sm" isLoading={update.isPending} onClick={save}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDesignation(position.designation);
              setCategory(position.category);
              setSanctioned(String(position.sanctioned));
              setFilled(String(position.filled));
              setEditing(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="flex-1">
        <p className="text-sm text-slate-700">{position.designation}</p>
        <p className="text-xs capitalize text-slate-400">
          {position.category.toLowerCase()}
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">
          {position.filled}/{position.sanctioned}
        </span>
        <Badge tone={vacant > 0 ? 'warning' : 'success'}>
          {vacant > 0 ? `${vacant} vacant` : 'Full'}
        </Badge>
      </div>
      <IconButton title="Edit seat" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4 text-slate-400" />
      </IconButton>
      <IconButton
        title="Delete seat"
        loading={remove.isPending}
        onClick={() => remove.mutate(position.id)}
      >
        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
      </IconButton>
    </div>
  );
}

function IconButton({
  title,
  loading,
  onClick,
  children,
}: {
  title: string;
  loading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      disabled={loading}
      onClick={onClick}
      className="rounded-md p-1.5 transition-colors hover:bg-slate-100 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
