import { useMemo, useState } from 'react';
import {
  Building2,
  ClipboardList,
  Network,
  Plus,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';

import {
  Button,
  EmptyState,
  FullPageSpinner,
  Input,
  Modal,
  PageHeader,
  StatCard,
} from '@shared/components/ui';
import { useMyPermissions } from '@modules/rbac';

import { useCreateUnit, useUnitsConfig } from '../hooks/useUnits';
import { UnitAccordion } from '../components/UnitAccordion';
import { canAccessUnitConfig, canCreateUnit, canEditUnit } from '../access';

export default function UnitConfigPage() {
  const { data: perms, isLoading: permsLoading } = useMyPermissions();
  const { data: units = [], isLoading } = useUnitsConfig();
  const createUnit = useCreateUnit();

  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');

  // Factory HR / SBU Head only ever see the unit(s) they're actually
  // assigned to here — not shown read-only, just not in the list at all.
  // Corporate HR / CHRO / super users see every unit, unaffected.
  const visibleUnits = useMemo(
    () => units.filter((u) => canEditUnit(perms, u.name)),
    [units, perms],
  );

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return visibleUnits;
    return visibleUnits.filter(
      (u) =>
        u.name.toLowerCase().includes(t) ||
        u.departments.some(
          (d) =>
            d.name.toLowerCase().includes(t) ||
            d.positions.some((p) =>
              p.designation.toLowerCase().includes(t),
            ),
        ),
    );
  }, [visibleUnits, search]);

  const totals = useMemo(() => {
    let sanctioned = 0;
    let filled = 0;
    for (const u of visibleUnits)
      for (const d of u.departments)
        for (const p of d.positions) {
          sanctioned += p.sanctioned;
          filled += p.filled;
        }
    return { sanctioned, filled, vacant: Math.max(0, sanctioned - filled) };
  }, [visibleUnits]);

  const submit = () => {
    if (name.trim().length < 2) return;
    createUnit.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setName('');
          setAddOpen(false);
        },
      },
    );
  };

  if (isLoading || permsLoading) return <FullPageSpinner label="Loading units…" />;

  if (!canAccessUnitConfig(perms)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Unit Config" />
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="Access restricted"
          description="Unit Config is available to Corporate HR, CHRO and SBU Head (for their own unit) and super users only."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unit Configuration"
        description="Units → departments → sections → sanctioned seats. This drives the organogram."
        actions={
          canCreateUnit(perms) && (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setAddOpen(true)}
            >
              Add unit
            </Button>
          )
        }
      />

      {visibleUnits.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={units.length === 0 ? 'No units configured' : 'No units assigned to you'}
          description={
            units.length === 0
              ? 'Add your first unit to start building the organogram.'
              : "You don't hold a unit-scoped role for any unit yet — ask an admin to assign one."
          }
          action={
            canCreateUnit(perms) ? (
              <Button onClick={() => setAddOpen(true)}>Add unit</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard label="Units" value={visibleUnits.length} icon={Network} accent="brand" />
            <StatCard
              label="Sanctioned seats"
              value={totals.sanctioned}
              icon={ClipboardList}
              accent="violet"
            />
            <StatCard label="Filled" value={totals.filled} icon={Users} accent="emerald" />
            <StatCard label="Vacant" value={totals.vacant} icon={Building2} accent="amber" />
          </div>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a unit, department or designation…"
            leftIcon={<Search className="h-4 w-4" />}
          />

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="No match"
              description={`Nothing matches “${search.trim()}”.`}
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((unit) => (
                <UnitAccordion
                  key={unit.id}
                  unit={unit}
                  canEdit={canEditUnit(perms, unit.name)}
                  canDelete={Boolean(perms?.isSuperUser)}
                  defaultOpen={filtered.length === 1}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add unit"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={createUnit.isPending}
              disabled={name.trim().length < 2}
              onClick={submit}
            >
              Create unit
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Unit / Factory name"
            placeholder="e.g. Jinnat Textile Mills Ltd"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          {createUnit.isError && (
            <p className="text-sm text-red-600">
              {(createUnit.error as Error).message}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
