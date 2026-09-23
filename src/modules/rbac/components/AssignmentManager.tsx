import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Globe,
  KeyRound,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Avatar,
  Badge,
  Button,
  FullPageSpinner,
  Input,
  Modal,
  Select,
} from '@shared/components/ui';
import { useDebounce } from '@shared/hooks';
import { cn } from '@shared/lib';
import type { SelectOption } from '@shared/types';
import { ROUTES } from '@app/router/paths';
import { useEmployees } from '@modules/employees';
import { useAuthStore } from '@modules/auth';
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
import { priorityShortLabel } from '../layering';

interface PickedEmployee {
  userId: string;
  name: string;
  code: string;
  /** Employee's own unit from ZingHR — used to auto-fill the unit selector. */
  unitName?: string;
}

const GLOBAL_KEY = '__global__';

/**
 * Who can sign in, and what they can do.
 *
 * A two-pane directory rather than one long page of cards: DBL has a dozen
 * units and the question is almost always "who has access in THIS unit", which
 * a rail answers in one click instead of a scroll. The HR layering is shown
 * here but not edited here — that lives on its own tab, because ordering people
 * is a different job from granting them access.
 */
export function AssignmentManager({
  onOpenLayering,
}: {
  onOpenLayering?: () => void;
}) {
  const { data: roles } = useRoles();
  const { data: units } = useUnitsConfig();
  const { data: assignments, isLoading } = useAssignments();
  const { data: perms } = useMyPermissions();
  const isSuper = Boolean(perms?.isSuperUser);
  const myUserId = useAuthStore((s) => s.user?.id);
  const deleteAssignment = useDeleteAssignment();
  const resetPassword = useResetPassword();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>(GLOBAL_KEY);
  const [granting, setGranting] = useState(false);

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

  /**
   * Removing a role removes what it was holding up in Approval Paths, so the
   * confirmation says so before it happens rather than after.
   */
  const handleRemove = (a: RoleAssignment) => {
    const where = a.unit ? ` for ${a.unit.name}` : '';
    const consequence =
      a.role.key === 'requisition_raiser' && a.hasApprovalPath
        ? '\n\nTheir approval path for this unit will be deleted too. Requisitions already in flight keep the chain they were raised with.'
        : a.role.key === 'unit_approver'
          ? '\n\nThey will also be removed from any approval path in this unit. Requisitions already in flight keep the chain they were raised with.'
          : '';
    if (
      !window.confirm(
        `Remove ${a.user.name}'s ${a.role.name} role${where}?${consequence}`,
      )
    )
      return;
    deleteAssignment.mutate(a.id, {
      onSuccess: (res) => {
        const extra = [
          res.removed.paths
            ? `${res.removed.paths} approval path${res.removed.paths === 1 ? '' : 's'}`
            : null,
          res.removed.levels
            ? `${res.removed.levels} approval level${res.removed.levels === 1 ? '' : 's'}`
            : null,
        ].filter(Boolean);
        toast.success(
          extra.length
            ? `Removed — and cleared ${extra.join(' and ')}`
            : `${a.user.name} no longer has ${a.role.name}${where}`,
        );
      },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  // Groups: Global first, then units A-Z. Search narrows the people inside
  // each group, and the rail shows what is left so an empty unit is obvious
  // before you click it.
  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = (a: RoleAssignment) =>
      !term ||
      a.user.name.toLowerCase().includes(term) ||
      a.user.employeeCode.toLowerCase().includes(term) ||
      a.role.name.toLowerCase().includes(term);

    const map = new Map<
      string,
      { key: string; label: string; unitId: string | null; items: RoleAssignment[] }
    >();
    map.set(GLOBAL_KEY, {
      key: GLOBAL_KEY,
      label: 'Global · all units',
      unitId: null,
      items: [],
    });
    for (const a of assignments ?? []) {
      const key = a.unit ? a.unit.id : GLOBAL_KEY;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: a.unit!.name,
          unitId: a.unit!.id,
          items: [],
        });
      }
      if (matches(a)) map.get(key)!.items.push(a);
    }
    return [...map.values()].sort((x, y) =>
      x.key === GLOBAL_KEY
        ? -1
        : y.key === GLOBAL_KEY
          ? 1
          : x.label.localeCompare(y.label),
    );
  }, [assignments, search]);

  const active = groups.find((g) => g.key === selected) ?? groups[0];
  const peopleCount = useMemo(
    () => new Set((assignments ?? []).map((a) => a.user.employeeCode)).size,
    [assignments],
  );

  if (isLoading) return <FullPageSpinner label="Loading access…" />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4 text-slate-400" />
          <span>
            <span className="font-semibold text-slate-800">{peopleCount}</span>{' '}
            people can sign in across{' '}
            <span className="font-semibold text-slate-800">
              {groups.length - 1}
            </span>{' '}
            {groups.length - 1 === 1 ? 'unit' : 'units'}
          </span>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="w-full sm:w-72">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code or role…"
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <Button
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setGranting(true)}
          >
            Grant access
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
        {/* Rail */}
        <nav className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <p className="border-b border-slate-100 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Scope
          </p>
          <ul className="max-h-[32rem] overflow-y-auto p-1.5">
            {groups.map((g) => {
              const isActive = g.key === active?.key;
              return (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(g.key)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition',
                      isActive
                        ? 'bg-brand-50 font-medium text-brand-700'
                        : 'text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {g.key === GLOBAL_KEY ? (
                      <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{g.label}</span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                        isActive
                          ? 'bg-white text-brand-700'
                          : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {g.items.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* People in the selected scope */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {active?.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {active?.items.length ?? 0} assignment
                {active?.items.length === 1 ? '' : 's'}
                {active?.key !== GLOBAL_KEY &&
                  ` · ${active?.items.filter((a) => a.role.key === 'factory_hr').length ?? 0} Factory HR`}
              </p>
            </div>
            {active?.key !== GLOBAL_KEY && onOpenLayering && (
              <button
                type="button"
                onClick={onOpenLayering}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-700"
              >
                HR layering →
              </button>
            )}
          </header>

          {active && active.items.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2 font-semibold">Person</th>
                  <th className="px-4 py-2 font-semibold">Role</th>
                  <th className="px-4 py-2 font-semibold">Priority</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {active.items.map((a) => {
                  const layer = priorityShortLabel(a.priority);
                  return (
                    <tr key={a.id} className="group hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={a.user.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {a.user.name}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {a.user.employeeCode}
                              {a.user.employee?.designation
                                ? ` · ${a.user.employee.designation}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="brand">{a.role.name}</Badge>
                          {/* A raiser with no chain cannot actually raise —
                              the API refuses the moment they try, so say it
                              here instead of letting the role imply it. */}
                          {a.hasApprovalPath === false && (
                            <Link
                              to={ROUTES.approvalPaths}
                              title="This person holds Requisition Raiser here but has no approval path, so raising is refused. Configure their chain in Approval Paths."
                              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              No approval path
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {a.role.key === 'factory_hr' ? (
                          layer ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                              {layer}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Not in the order
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                          {/* Not on your own row: a reset signs the account
                              out everywhere, which from here reads as being
                              thrown out while granting access. */}
                          {isSuper && a.user.id !== myUserId && (
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
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            title="Remove assignment"
                            onClick={() => handleRemove(a)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-12 text-center text-sm text-slate-400">
              {search
                ? 'Nobody here matches your search.'
                : 'Nobody has access in this scope yet.'}
            </p>
          )}
        </section>
      </div>

      <GrantAccessModal
        open={granting}
        onClose={() => setGranting(false)}
        roles={roles ?? []}
        units={units ?? []}
        onGranted={(unitId) => setSelected(unitId ?? GLOBAL_KEY)}
      />
    </div>
  );
}

/** Granting access: one person, one role, one unit. */
function GrantAccessModal({
  open,
  onClose,
  roles,
  units,
  onGranted,
}: {
  open: boolean;
  onClose: () => void;
  roles: { id: string; name: string; scope: string }[];
  units: { id: string; name: string }[];
  onGranted: (unitId: string | null) => void;
}) {
  const createAssignment = useCreateAssignment();
  const [roleId, setRoleId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [picked, setPicked] = useState<PickedEmployee | null>(null);

  const selectedRole = roles.find((r) => r.id === roleId);
  const needsUnit = selectedRole?.scope === 'UNIT';

  // Auto-fill the unit from the employee's own ZingHR unit whenever the role
  // switches to UNIT-scoped or a new employee is picked. Still fully editable.
  useEffect(() => {
    if (!needsUnit || !picked?.unitName || !units.length) return;
    const match = units.find(
      (u) => u.name.toLowerCase() === picked.unitName!.toLowerCase(),
    );
    if (match) setUnitId(match.id);
  }, [needsUnit, picked, units]);

  useEffect(() => {
    if (!open) {
      setPicked(null);
      setRoleId('');
      setUnitId('');
    }
  }, [open]);

  const roleOptions: SelectOption[] = [
    { value: '', label: 'Select a role…' },
    ...roles.map((r) => ({
      value: r.id,
      label: `${r.name}${r.scope === 'GLOBAL' ? ' (global)' : ''}`,
    })),
  ];
  const unitOptions: SelectOption[] = [
    { value: '', label: 'Select a unit…' },
    ...units.map((u) => ({ value: u.id, label: u.name })),
  ];

  const canAssign =
    roleId && picked && (!needsUnit || unitId) && !createAssignment.isPending;

  const submit = () => {
    if (!roleId || !picked) return;
    createAssignment.mutate(
      { roleId, userId: picked.userId, unitId: needsUnit ? unitId : undefined },
      {
        onSuccess: () => {
          toast.success(`${picked.name} can now sign in as ${selectedRole?.name}`);
          onGranted(needsUnit ? unitId : null);
          onClose();
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Grant access"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canAssign}
            isLoading={createAssignment.isPending}
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={submit}
          >
            Grant access
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            1 · Choose a person
          </p>
          <EmployeePicker picked={picked} onPick={setPicked} />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            2 · Choose a role
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              options={roleOptions}
              value={roleId}
              disabled={!picked}
              onChange={(e) => {
                const newId = e.target.value;
                setRoleId(newId);
                const newRole = roles.find((r) => r.id === newId);
                if (newRole?.scope !== 'UNIT') setUnitId('');
              }}
            />
            {needsUnit ? (
              <Select
                options={unitOptions}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
              />
            ) : (
              <p className="flex items-center text-xs text-slate-400">
                {selectedRole
                  ? 'Global role — applies to all units'
                  : 'Applies after you pick a role'}
              </p>
            )}
          </div>
        </div>

        {picked && roleId && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            {picked.name} will be able to sign in as{' '}
            <span className="font-semibold">{selectedRole?.name}</span>
            {needsUnit && unitId
              ? ` for ${units.find((u) => u.id === unitId)?.name}`
              : needsUnit
                ? ' (pick a unit)'
                : ' across all units'}
            .
            {selectedRole?.name === 'Factory HR' && (
              <span className="mt-1 block text-xs text-emerald-600">
                Set where they sit in the unit&rsquo;s priority order on the
                HR Layering tab.
              </span>
            )}
          </p>
        )}

        {createAssignment.isError && (
          <p className="text-sm text-red-600">
            {(createAssignment.error as Error).message}
          </p>
        )}
      </div>
    </Modal>
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
      <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Avatar name={picked.name} size="sm" />
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
        placeholder="Search by name, code or designation…"
        leftIcon={<Search className="h-4 w-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {results.length > 0 && (
        <div className="mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200">
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
                  {emp.location && emp.location !== '—'
                    ? ` · ${emp.location}`
                    : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
