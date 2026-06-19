import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Globe,
  KeyRound,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

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
  useMyPermissions,
  useResetPassword,
  useRoles,
} from '../hooks/useRbac';
import type { RoleAssignment } from '../types/rbac.types';

interface PickedEmployee {
  userId: string;
  name: string;
  code: string;
  /** Employee's own unit from ZingHR — used to auto-fill the unit selector. */
  unitName?: string;
}

const GLOBAL_KEY = '__global__';

export function AssignmentManager() {
  const { data: roles } = useRoles();
  const { data: units } = useUnitsConfig();
  const { data: assignments, isLoading } = useAssignments();
  const { data: perms } = useMyPermissions();
  const isSuper = Boolean(perms?.isSuperUser);
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const resetPassword = useResetPassword();

  const handleReset = (userId: string, name: string, code: string) => {
    if (
      !window.confirm(
        `Reset ${name}'s password back to their employee code (${code})? Any 2FA will also be turned off.`,
      )
    )
      return;
    resetPassword.mutate(userId, {
      onSuccess: (d) =>
        toast.success(`${d.name}'s password reset to: ${d.defaultPassword}`, {
          duration: 8000,
        }),
      onError: (e) => toast.error((e as Error).message || 'Could not reset'),
    });
  };

  const [roleId, setRoleId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [picked, setPicked] = useState<PickedEmployee | null>(null);

  const selectedRole = roles?.find((r) => r.id === roleId);
  const needsUnit = selectedRole?.scope === 'UNIT';

  // Auto-fill the unit from the employee's own ZingHR unit whenever the role
  // switches to UNIT-scoped or a new employee is picked. Still fully editable.
  useEffect(() => {
    if (!needsUnit || !picked?.unitName || !units?.length) return;
    const match = units.find(
      (u) => u.name.toLowerCase() === picked.unitName!.toLowerCase(),
    );
    if (match) setUnitId(match.id);
  }, [needsUnit, picked, units]);

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

  const [filter, setFilter] = useState('');

  // Unique people with any access (drives the summary count).
  const peopleCount = useMemo(
    () => new Set((assignments ?? []).map((a) => a.user.employeeCode)).size,
    [assignments],
  );

  // Group assignments by unit (global first, then alphabetical), filtered.
  const groups = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const matches = (a: RoleAssignment) =>
      !term ||
      a.user.name.toLowerCase().includes(term) ||
      a.user.employeeCode.toLowerCase().includes(term) ||
      a.role.name.toLowerCase().includes(term);

    const map = new Map<string, { label: string; items: RoleAssignment[] }>();
    for (const a of assignments ?? []) {
      if (!matches(a)) continue;
      const key = a.unit ? a.unit.name : GLOBAL_KEY;
      const label = a.unit ? a.unit.name : 'Global · all units';
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(a);
    }
    return [...map.entries()].sort((x, y) =>
      x[0] === GLOBAL_KEY ? -1 : y[0] === GLOBAL_KEY ? 1 : x[1].label.localeCompare(y[1].label),
    );
  }, [assignments, filter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand-600" />
            Grant access
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Step 1 — person */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              1 · Choose a person
            </p>
            <EmployeePicker picked={picked} onPick={setPicked} />
          </div>

          {/* Step 2 — role (+ unit) */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              2 · Choose a role
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                options={roleOptions}
                value={roleId}
                disabled={!picked}
                onChange={(e) => {
                  const newId = e.target.value;
                  setRoleId(newId);
                  // Clear unit when switching to global; effect re-fills on UNIT roles.
                  const newRole = roles?.find((r) => r.id === newId);
                  if (newRole?.scope !== 'UNIT') setUnitId('');
                }}
              />
              {needsUnit ? (
                <div className="space-y-0.5">
                  <Select
                    options={unitOptions}
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                  />
                  {unitId && picked?.unitName &&
                    units?.find((u) => u.id === unitId)?.name.toLowerCase() ===
                      picked.unitName.toLowerCase() && (
                    <p className="px-1 text-[10px] text-slate-400">
                      Auto-filled from employee's unit · change if needed
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center">
                  <p className="text-xs text-slate-400">
                    {selectedRole
                      ? 'Global role — applies to all units'
                      : 'Applies after you pick a role'}
                  </p>
                </div>
              )}
              <Button
                fullWidth
                disabled={!canAssign}
                isLoading={createAssignment.isPending}
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={submit}
              >
                Grant access
              </Button>
            </div>
          </div>

          {picked && roleId && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {picked.name} will be able to sign in as{' '}
              <span className="font-semibold">{selectedRole?.name}</span>
              {needsUnit && unitId
                ? ` for ${units?.find((u) => u.id === unitId)?.name}`
                : needsUnit
                  ? ' (pick a unit)'
                  : ' across all units'}
              .
            </p>
          )}

          {createAssignment.isError && (
            <p className="text-sm text-red-600">
              {(createAssignment.error as Error).message}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Who has access */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-700">
            People with access
          </p>
          <Badge tone="brand">{peopleCount} can sign in</Badge>
        </div>
        <div className="w-full sm:w-64">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, code or role…"
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <FullPageSpinner label="Loading assignments…" />
      ) : groups.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-6 text-center text-sm text-slate-400">
              {filter
                ? 'No one matches your filter.'
                : 'No one has access yet — grant a role above.'}
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
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">{a.role.name}</Badge>
                    {isSuper && (
                      <button
                        title="Reset password to default (employee code)"
                        disabled={resetPassword.isPending}
                        onClick={() =>
                          handleReset(
                            a.user.id,
                            a.user.name,
                            a.user.employeeCode,
                          )
                        }
                        className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                    )}
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
          {picked.unitName && (
            <span className="text-slate-400">· {picked.unitName}</span>
          )}
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
                  unitName: emp.location !== '—' ? emp.location : undefined,
                })
              }
              className="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2 text-left last:border-0 hover:bg-slate-50 disabled:opacity-50"
            >
              <Avatar name={emp.name} size="sm" />
              <div>
                <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                <p className="text-xs text-slate-400">
                  {emp.employeeCode} · {emp.jobTitle}
                  {emp.location && emp.location !== '—' ? ` · ${emp.location}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
