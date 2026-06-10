import { useMemo, useRef, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  Gauge,
  Search,
  UserMinus,
  Users,
  type LucideIcon,
} from 'lucide-react';

import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  FullPageSpinner,
  Input,
  PageHeader,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatCompact } from '@shared/utils';

import { useOrganogramUnits } from '../hooks/useOrganogram';

type Tone = 'brand' | 'emerald' | 'amber' | 'violet';

const STAT_TONE: Record<Tone, { card: string; chip: string; value: string }> = {
  brand: { card: 'from-brand-50 to-white border-brand-100', chip: 'bg-brand-100 text-brand-700', value: 'text-brand-900' },
  emerald: { card: 'from-emerald-50 to-white border-emerald-100', chip: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-900' },
  amber: { card: 'from-amber-50 to-white border-amber-100', chip: 'bg-amber-100 text-amber-700', value: 'text-amber-900' },
  violet: { card: 'from-violet-50 to-white border-violet-100', chip: 'bg-violet-100 text-violet-700', value: 'text-violet-900' },
};

export default function OrganogramPage() {
  const { data: units, isLoading } = useOrganogramUnits();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return units ?? [];
    return (units ?? []).filter((u) => u.unit.toLowerCase().includes(q));
  }, [units, query]);

  if (isLoading || !units) return <FullPageSpinner label="Loading organogram…" />;
  if (units.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="h-6 w-6" />}
        title="No organogram units available"
        description="You do not have access to any assigned units yet."
      />
    );
  }

  const current = units.find((u) => u.unit === selected) ?? units[0];

  const totalSanctioned = units.reduce((s, u) => s + u.sanctioned, 0);
  const totalFilled = units.reduce((s, u) => s + u.filled, 0);
  const totalVacant = totalSanctioned - totalFilled;
  const fillRate = totalSanctioned > 0 ? Math.round((totalFilled / totalSanctioned) * 100) : 0;
  const currentPct = current.sanctioned > 0 ? Math.round((current.filled / current.sanctioned) * 100) : 0;

  const pick = (unit: string) => {
    setSelected(unit);
    // Keep the detail at the top on every selection — no scroll-up needed.
    requestAnimationFrame(() =>
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organogram"
        description="Unit-wise, department-wise sanctioned seats. Vacancies here drive replacement vs. new requisitions."
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Sanctioned" value={totalSanctioned} icon={Building2} tone="brand" />
        <StatTile label="Filled" value={totalFilled} icon={Users} tone="emerald" />
        <StatTile label="Vacant" value={totalVacant} icon={UserMinus} tone="amber" />
        <StatTile label="Fill rate" value={`${fillRate}%`} icon={Gauge} tone="violet" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Master — unit list (own sticky scroll on desktop) */}
        <aside
          className={cn(
            'self-start lg:sticky lg:top-2',
            selected ? 'hidden lg:block' : 'block',
          )}
        >
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 p-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search units…"
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="scrollbar-thin max-h-[60vh] space-y-1 overflow-y-auto p-2 lg:max-h-[calc(100vh-15rem)]">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-400">
                  No units match “{query}”.
                </p>
              ) : (
                filtered.map((u) => (
                  <UnitRow
                    key={u.unit}
                    name={u.unit}
                    filled={u.filled}
                    sanctioned={u.sanctioned}
                    vacant={u.vacant}
                    active={u.unit === current.unit}
                    onClick={() => pick(u.unit)}
                  />
                ))
              )}
            </div>
          </Card>
        </aside>

        {/* Detail — selected unit */}
        <div
          ref={detailRef}
          className={cn(
            'scroll-mt-4 space-y-4',
            selected ? 'block' : 'hidden lg:block',
          )}
        >
          {/* Mobile back */}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 lg:hidden"
          >
            <ChevronLeft className="h-4 w-4" /> All units
          </button>

          {/* Summary */}
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-ink-dark">{current.unit}</h2>
                    <p className="text-xs text-slate-500">
                      {current.departments.length} department
                      {current.departments.length === 1 ? '' : 's'} · {current.sanctioned} sanctioned seats
                    </p>
                  </div>
                </div>
                <Badge tone={current.vacant > 0 ? 'warning' : 'success'} dot>
                  {current.vacant > 0 ? `${current.vacant} vacant` : 'Fully staffed'}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <FillBar filled={current.filled} total={current.sanctioned} className="h-2.5" />
                <span className="shrink-0 text-sm font-semibold text-slate-700">{currentPct}%</span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <SummaryCell label="Sanctioned" value={current.sanctioned} />
                <SummaryCell label="Filled" value={current.filled} accent="emerald" />
                <SummaryCell label="Vacant" value={current.vacant} accent="amber" />
              </div>
            </CardBody>
          </Card>

          {/* Departments — masonry columns */}
          <div className="gap-4 [column-fill:balance] sm:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {current.departments.map((dept) => (
              <div key={dept.department} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{dept.department}</p>
                  <Badge tone={dept.vacant > 0 ? 'warning' : 'success'} dot>
                    {dept.vacant > 0 ? `${dept.vacant} vacant` : 'Full'}
                  </Badge>
                </div>
                <div className="mb-3 flex items-center gap-3">
                  <FillBar filled={dept.filled} total={dept.sanctioned} className="h-2" />
                  <span className="shrink-0 text-xs font-medium text-slate-500">
                    {dept.filled}/{dept.sanctioned}
                  </span>
                </div>
                <div className="space-y-2">
                  {dept.seats.map((seat) => (
                    <SeatRow
                      key={seat.id}
                      designation={seat.designation}
                      category={seat.category}
                      filled={seat.filled}
                      sanctioned={seat.sanctioned}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: LucideIcon; tone: Tone }) {
  const t = STAT_TONE[tone];
  return (
    <div className={cn('rounded-2xl border bg-gradient-to-br p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5', t.card)}>
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10', t.chip)}>
        <Icon className="h-5 w-5" />
      </span>
      <p className={cn('mt-3 text-2xl font-bold tracking-tight sm:text-3xl', t.value)}>
        {typeof value === 'number' ? formatCompact(value) : value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-slate-600 sm:text-sm">{label}</p>
    </div>
  );
}

function FillBar({ filled, total, className }: { filled: number; total: number; className?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function UnitRow({ name, filled, sanctioned, vacant, active, onClick }: { name: string; filled: number; sanctioned: number; vacant: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('w-full rounded-xl px-3 py-2.5 text-left transition', active ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('truncate text-sm font-medium', active ? 'text-brand-800' : 'text-slate-700')}>{name}</span>
        <Badge tone={vacant > 0 ? 'warning' : 'success'}>{vacant > 0 ? `${vacant} open` : 'Full'}</Badge>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <FillBar filled={filled} total={sanctioned} />
        <span className="shrink-0 text-[11px] text-slate-400">{filled}/{sanctioned}</span>
      </div>
    </button>
  );
}

function SummaryCell({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'amber' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-center">
      <p className={cn('text-xl font-bold tracking-tight', accent === 'emerald' ? 'text-emerald-700' : accent === 'amber' ? 'text-amber-700' : 'text-ink-dark')}>
        {formatCompact(value)}
      </p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function SeatRow({ designation, category, filled, sanctioned }: { designation: string; category: string; filled: number; sanctioned: number }) {
  const vacant = sanctioned - filled;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{designation}</p>
          <p className="text-xs capitalize text-slate-400">{category}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-slate-500">{filled}/{sanctioned}</span>
          {vacant > 0 ? <Badge tone="warning">{vacant} vacant</Badge> : <Badge tone="success">Full</Badge>}
        </div>
      </div>
      <FillBar filled={filled} total={sanctioned} className="mt-2" />
    </div>
  );
}
