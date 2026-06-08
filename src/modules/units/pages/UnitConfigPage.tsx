import { useMemo, useState } from 'react';
import { Building2, ClipboardList, Network, Plus, Search, Users } from 'lucide-react';

import {
  Button,
  EmptyState,
  FullPageSpinner,
  Input,
  Modal,
  PageHeader,
  StatCard,
} from '@shared/components/ui';
import { cn } from '@shared/lib';

import { useCreateUnit, useUnitsConfig } from '../hooks/useUnits';
import type { ConfigUnit } from '../types/unit.types';
import { UnitDetail } from '../components/UnitDetail';

export default function UnitConfigPage() {
  const { data: units = [], isLoading } = useUnitsConfig();
  const createUnit = useCreateUnit();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');

  const selected = useMemo(
    () => units.find((u) => u.id === selectedId) ?? units[0] ?? null,
    [units, selectedId],
  );

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return t ? units.filter((u) => u.name.toLowerCase().includes(t)) : units;
  }, [units, search]);

  const totals = useMemo(() => {
    let sanctioned = 0;
    let filled = 0;
    for (const u of units)
      for (const d of u.departments)
        for (const p of d.positions) {
          sanctioned += p.sanctioned;
          filled += p.filled;
        }
    return { sanctioned, filled, vacant: Math.max(0, sanctioned - filled) };
  }, [units]);

  const submit = () => {
    if (name.trim().length < 2) return;
    createUnit.mutate(
      { name: name.trim() },
      {
        onSuccess: (created) => {
          setName('');
          setAddOpen(false);
          setSelectedId(created.id);
        },
      },
    );
  };

  if (isLoading) return <FullPageSpinner label="Loading units…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unit Configuration"
        description="Units → departments → sections → sanctioned seats. This drives the organogram."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setAddOpen(true)}
          >
            Add unit
          </Button>
        }
      />

      {units.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No units configured"
          description="Add your first unit to start building the organogram."
          action={<Button onClick={() => setAddOpen(true)}>Add unit</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard label="Units" value={units.length} icon={Network} accent="brand" />
            <StatCard
              label="Sanctioned seats"
              value={totals.sanctioned}
              icon={ClipboardList}
              accent="violet"
            />
            <StatCard label="Filled" value={totals.filled} icon={Users} accent="emerald" />
            <StatCard label="Vacant" value={totals.vacant} icon={Building2} accent="amber" />
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[280px_1fr]">
            {/* Units rail */}
            <aside className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-3">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a unit…"
                  leftIcon={<Search className="h-4 w-4" />}
                />
              </div>
              <div className="max-h-[34rem] space-y-0.5 overflow-y-auto p-2">
                {filtered.map((u) => (
                  <UnitRailButton
                    key={u.id}
                    unit={u}
                    active={selected?.id === u.id}
                    onClick={() => setSelectedId(u.id)}
                  />
                ))}
                {filtered.length === 0 && (
                  <p className="px-3 py-6 text-center text-xs text-slate-400">
                    No unit matches.
                  </p>
                )}
              </div>
            </aside>

            {/* Detail */}
            {selected ? (
              <UnitDetail key={selected.id} unit={selected} />
            ) : (
              <EmptyState title="Select a unit" description="Pick a unit on the left to configure it." />
            )}
          </div>
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

function UnitRailButton({
  unit,
  active,
  onClick,
}: {
  unit: ConfigUnit;
  active: boolean;
  onClick: () => void;
}) {
  const seats = unit.departments.flatMap((d) => d.positions);
  const sanctioned = seats.reduce((s, p) => s + p.sanctioned, 0);
  const filled = seats.reduce((s, p) => s + p.filled, 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition',
        active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
      )}
    >
      <Building2
        className={cn('h-4 w-4 shrink-0', active ? 'text-brand-600' : 'text-slate-400')}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{unit.name}</span>
        <span className={cn('text-[11px]', active ? 'text-brand-500' : 'text-slate-400')}>
          {unit.departments.length} dept · {filled}/{sanctioned} filled
        </span>
      </span>
      {(unit._count?.employees ?? 0) > 0 && (
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500',
          )}
        >
          {unit._count?.employees}
        </span>
      )}
    </button>
  );
}
