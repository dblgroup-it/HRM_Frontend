import { useState } from 'react';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from '@shared/components/ui';
import type { SelectOption } from '@shared/types';

import { useCreateRole, useDeleteRole, useRoles } from '../hooks/useRbac';
import type { RoleScope } from '../types/rbac.types';

const SCOPE_OPTIONS: SelectOption[] = [
  { value: 'UNIT', label: 'Unit-scoped' },
  { value: 'GLOBAL', label: 'Global (org-wide)' },
];

export function RoleManager() {
  const { data: roles, isLoading } = useRoles();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();

  const [name, setName] = useState('');
  const [scope, setScope] = useState<RoleScope>('UNIT');
  const [description, setDescription] = useState('');

  const submit = () => {
    if (name.trim().length < 2) return;
    createRole.mutate(
      { name: name.trim(), scope, description: description.trim() || undefined },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create a role</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_1fr_auto] sm:items-end">
            <Input
              label="Role name"
              placeholder="e.g. Plant Manager"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Select
              label="Scope"
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={(e) => setScope(e.target.value as RoleScope)}
            />
            <Input
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button
              isLoading={createRole.isPending}
              disabled={name.trim().length < 2}
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={submit}
            >
              Add
            </Button>
          </div>
          {createRole.isError && (
            <p className="mt-2 text-sm text-red-600">
              {(createRole.error as Error).message}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            roles?.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {role.name}
                    </p>
                    <p className="font-mono text-xs text-slate-400">
                      {role.key}
                      {role.description ? ` · ${role.description}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={role.scope === 'GLOBAL' ? 'brand' : 'neutral'}>
                    {role.scope === 'GLOBAL' ? 'Global' : 'Unit'}
                  </Badge>
                  {role.isSystem && <Badge tone="info">System</Badge>}
                  <Badge tone="neutral">
                    {role._count?.assignments ?? 0} assigned
                  </Badge>
                  {!role.isSystem && (
                    <button
                      title="Delete role"
                      disabled={deleteRole.isPending}
                      onClick={() => {
                        if (window.confirm(`Delete role "${role.name}"?`)) {
                          deleteRole.mutate(role.id);
                        }
                      }}
                      className="rounded-md p-1.5 hover:bg-slate-100"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
