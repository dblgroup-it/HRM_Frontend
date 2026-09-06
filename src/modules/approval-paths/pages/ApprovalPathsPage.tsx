import { useMemo, useState } from 'react';
import { Building2, Search, ShieldAlert, UserCheck, Users } from 'lucide-react';

import {
  EmptyState,
  FullPageSpinner,
  Input,
  PageHeader,
  StatCard,
} from '@shared/components/ui';
import { useMyPermissions } from '@modules/rbac';

import { useApprovalPaths } from '../hooks/useApprovalPaths';
import { UnitAccordion } from '../components/UnitAccordion';
import { canConfigureApprovalPaths } from '../access';

export default function ApprovalPathsPage() {
  const { data: perms, isLoading: permsLoading } = useMyPermissions();
  const { data: units = [], isLoading } = useApprovalPaths();

  const [search, setSearch] = useState('');
  const [onlyConfigured, setOnlyConfigured] = useState(false);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return units.filter(
      (u) =>
        (!t ||
          u.unitName.toLowerCase().includes(t) ||
          u.raisers.some((r) => r.raiser.name.toLowerCase().includes(t))) &&
        (!onlyConfigured || u.raisers.length > 0),
    );
  }, [units, search, onlyConfigured]);

  const totalRaisers = useMemo(
    () => units.reduce((sum, u) => sum + u.raisers.length, 0),
    [units],
  );

  if (isLoading || permsLoading)
    return <FullPageSpinner label="Loading approval paths…" />;

  if (!canConfigureApprovalPaths(perms)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Approval Paths" />
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="Access restricted"
          description="Approval paths decide who may raise requisitions and who signs them off, so only Corporate HR, CHRO and super users can configure them."
        />
      </div>
    );
  }

  // A single configured unit opens by default — the common case is coming here
  // to adjust the one you just set up.
  const configured = filtered.filter((u) => u.raisers.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Paths"
        description="Who may raise requisitions in each unit, and the steps their requisitions travel through. Corporate HR always signs last."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Units" value={units.length} icon={Building2} accent="brand" />
        <StatCard
          label="Requisition raisers"
          value={totalRaisers}
          icon={UserCheck}
          accent="emerald"
        />
        <StatCard
          label="Units not set up"
          value={units.filter((u) => u.raisers.length === 0).length}
          icon={Users}
          accent="amber"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[18rem] flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a unit or a raiser…"
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={onlyConfigured}
            onChange={(e) => setOnlyConfigured(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Only units with raisers
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No unit matches"
          description="Try a different unit or person name."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((unit) => (
            <UnitAccordion
              key={unit.unitId}
              unit={unit}
              defaultOpen={configured.length === 1 && unit.raisers.length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
