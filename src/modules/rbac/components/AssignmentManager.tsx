import { useMemo, useState } from 'react';
import { Plus, Trash2, Search, X, UserPlus, Building2, Globe } from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FullPageSpinner,
  Input,
  Select,
} from '@shared/components/ui';
import { useDebounce } from '@shared/hooks';
import type { SelectOption } from '@shared/types';
import { useEmployees } from '@modules/employees';
import { useUnitsConfig } from '@modules/units';

import {
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useRoles,
} from '../hooks/useRbac';
import type { RoleAssignment } from '../types/rbac.types';

interface PickedEmployee {
  userId: string;
  name: string;
  code: string;
}

const GLOBAL_KEY = '__global__';

export function AssignmentManager() {
  const { data: roles } = useRoles();
  const { data: units } = useUnitsConfig();
  const { data: assignments, isLoading } = useAssignments();
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const [roleId, setRoleId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [picked, setPicked] = useState<PickedEmployee | null>(null);

  const selectedRole = roles?.find((r) => r.id === roleId);
  const needsUnit = selectedRole?.scope === 'UNIT';

  const roleOptions: SelectOption[] = [
    { value: '', label: 'Select a role…' },
    ...(roles ?? []).map((r) => ({
      value: r.id,
      label: `${r.name}${r.scope === 'GLOBAL' ? ' (global)' : ''}`,
    })),
  ];
  const unitOptions: SelectOption[] = [
    { value: '', label: 'Select a unit…' },
    ...(units ?? []).map((u) => ({ value: u.id, label: u.name })),
  ];

  const canAssign =
    roleId && picked && (!needsUnit || unitId) && !createAssignment.isPending;

  const submit = () => {
    if (!roleId || !picked) return;
    createAssignment.mutate(
      { roleId, userId: picked.userId, unitId: needsUnit ? unitId : undefined },
      { onSuccess: () => { setPicked(null); setUnitId(''); } },
    );
  };

  // Group assignments by unit (global first, then alphabetical).
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: RoleAssignment[] }>();
    for (const a of assignments ?? []) {
      const key = a.unit ? a.unit.name : GLOBAL_KEY;
      const label = a.unit ? a.unit.name : 'Global · all units';
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(a);
    }
    return [...map.entries()].sort((x, y) =>
      x[0] === GLOBAL_KEY ? -1 : y[0] === GLOBAL_KEY ? 1 : x[1].label.localeCompare(y[1].label),
    );
  }, [assignments]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Assign a role</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Role"
              options={roleOptions}
              value={roleId}
              onChange={(e) => { setRoleId(e.target.value); setUnitId(''); }}
            />
            {needsUnit ? (
              <Select
                label="Unit"
                options={unitOptions}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
              />
            ) : (
              <div className="flex items-end">
                <p className="pb-2 text-xs text-slate-400">
                  {selectedRole
                    ? 'Global role — applies to all units'
                    : 'Pick a role first'}
                </p>
              </div>
            )}
            <div className="flex items-end">
              <Button
                fullWidth
                disabled={!canAssign}
                isLoading={createAssignment.isPending}
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={submit}
              >
                Assign
              </Button>
            </div>
          </div>

          <EmployeePicker picked={picked} onPick={setPicked} />

          {createAssignment.isError && (
            <p className="text-sm text-red-600">
              {(createAssignment.error as Error).message}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Who has access — grouped by unit */}
      {isLoading ? (
        <FullPageSpinner label="Loading assignments…" />
      ) : groups.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-6 text-center text-sm text-slate-400">
              No role assignments yet.
            </p>
          </CardBody>
        </Card>
      ) : (
        groups.map(([key, group]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  {key === GLOBAL_KEY ? (
                    <Globe className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Building2 className="h-4 w-4 text-slate-400" />
                  )}
                  {group.label}
                </span>
              </CardTitle>
              <Badge tone="neutral">{group.items.length}</Badge>
            </CardHeader>
            <CardBody className="divide-y divide-slate-50">
              {group.items.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={a.user.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {a.user.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {a.user.employeeCode}
                        {a.user.employee?.designation
                          ? ` · ${a.user.employee.designation}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="brand">{a.role.name}</Badge>
                    <button
                      title="Remove assignment"
                      onClick={() => deleteAssignment.mutate(a.id)}
                      className="rounded-md p-1.5 hover:bg-slate-100"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}

function EmployeePicker({
  picked,
  onPick,
}: {
  picked: PickedEmployee | null;
  onPick: (e: PickedEmployee | null) => void;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const { data } = useEmployees({ search: debounced, page: 1, pageSize: 6 });

  const results = useMemo(
    () => (debounced.trim().length >= 2 ? (data?.items ?? []) : []),
    [debounced, data],
  );

  if (picked) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <UserPlus className="h-4 w-4 text-brand-600" />
          <span className="font-medium text-slate-800">{picked.name}</span>
          <span className="text-slate-400">· {picked.code}</span>
        </div>
        <button
          onClick={() => onPick(null)}
          className="rounded-md p-1 hover:bg-white"
        >
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <Input
        label="Employee"
        placeholder="Search by name, code or designation…"
        leftIcon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {results.length > 0 && (
        <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200">
          {results.map((emp) => (
            <button
              key={emp.id}
              disabled={!emp.userId}
              onClick={() =>
                emp.userId &&
                onPick({
                  userId: emp.userId,
                  name: emp.name,
                  code: emp.employeeCode,
                })
              }
              className="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2 text-left last:border-0 hover:bg-slate-50 disabled:opacity-50"
            >
              <Avatar name={emp.name} size="sm" />
              <div>
                <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                <p className="text-xs text-slate-400">
                  {emp.employeeCode} · {emp.jobTitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
