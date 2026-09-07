import { useMemo, useState } from 'react';
import { Building2, Search, ShieldAlert, UserCheck, Users } from 'lucide-react';

import {
  EmptyState,
  ErrorCard,
  Input,
  PageHeader,
  StatCard,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { useMyPermissions } from '@modules/rbac';

import { useApprovalPaths } from '../hooks/useApprovalPaths';
import { UnitAccordion } from '../components/UnitAccordion';
import { PathSkeleton } from '../components/PathSkeleton';
import { canConfigureApprovalPaths } from '../access';

export default function ApprovalPathsPage() {
  const { data: perms, isLoading: permsLoading } = useMyPermissions();
  const {
    data: units = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useApprovalPaths();

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

  const loading = isLoading || permsLoading;

  if (!loading && !canConfigureApprovalPaths(perms)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Approval Paths" />
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-card">
          <EmptyState
            icon={<ShieldAlert className="h-6 w-6" />}
            title="Access restricted"
            description="Approval paths decide who may raise requisitions and who signs them off, so only Corporate HR, CHRO and super users can configure them."
          />
        </div>
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

      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-card sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a unit or a raiser…"
            leftIcon={<Search className="h-4 w-4" />}
            className="border-slate-200 bg-slate-50/70 focus:bg-white"
          />
        </div>
        <label
          className={cn(
            'inline-flex h-10 shrink-0 cursor-pointer select-none items-center gap-2 rounded-lg border px-3.5 text-xs font-medium duration-200',
            'transition-[background-color,border-color,color,box-shadow]',
            onlyConfigured
              ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1px_rgba(24,119,192,0.08)]'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
          )}
        >
          <input
            type="checkbox"
            checked={onlyConfigured}
            onChange={(e) => setOnlyConfigured(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 transition focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-0"
          />
          Only units with raisers
        </label>
      </div>

      {loading ? (
        <PathSkeleton />
      ) : isError ? (
        <ErrorCard
          title="Couldn't load approval paths"
          message={(error as Error)?.message}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60">
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No unit matches"
            description="Try a different unit or person name."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((unit, index) => (
            <UnitAccordion
              key={unit.unitId}
              unit={unit}
              index={index}
              defaultOpen={configured.length === 1 && unit.raisers.length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
