import { useState } from 'react';
import { Building2, Users } from 'lucide-react';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  FullPageSpinner,
  PageHeader,
  StatCard,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatCompact } from '@shared/utils';

import { useOrganogramUnits } from '../hooks/useOrganogram';

export default function OrganogramPage() {
  const { data: units, isLoading } = useOrganogramUnits();
  const [activeUnit, setActiveUnit] = useState<string | null>(null);

  if (isLoading || !units) return <FullPageSpinner label="Loading organogram…" />;
  if (units.length === 0) {
    return (
      <EmptyState
        title="No organogram units available"
        description="You do not have access to any assigned units yet."
      />
    );
  }

  const selected = units.find((u) => u.unit === activeUnit) ?? units[0];

  const totalSanctioned = units.reduce((s, u) => s + u.sanctioned, 0);
  const totalFilled = units.reduce((s, u) => s + u.filled, 0);
  const totalVacant = totalSanctioned - totalFilled;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organogram"
        description="Unit-wise, department-wise sanctioned seats. Vacancies here drive replacement vs new requisitions."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Sanctioned Seats" value={formatCompact(totalSanctioned)} icon={Building2} accent="brand" />
        <StatCard label="Filled" value={formatCompact(totalFilled)} icon={Users} accent="emerald" />
        <StatCard label="Vacant" value={formatCompact(totalVacant)} icon={Users} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Unit selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Units</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1">
            {units.map((u) => {
              const isActive = u.unit === selected.unit;
              return (
                <button
                  key={u.unit}
                  onClick={() => setActiveUnit(u.unit)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-brand-50 font-medium text-brand-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <span className="truncate">{u.unit}</span>
                  <Badge tone={u.vacant > 0 ? 'warning' : 'neutral'}>
                    {u.vacant}
                  </Badge>
                </button>
              );
            })}
          </CardBody>
        </Card>

        {/* Department / seat detail */}
        <div className="space-y-4 lg:col-span-3">
          {selected.departments.map((dept) => (
            <Card key={dept.department}>
              <CardHeader>
                <CardTitle>{dept.department}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{dept.sanctioned} sanctioned</span>
                  <span>·</span>
                  <span>{dept.filled} filled</span>
                  <Badge tone={dept.vacant > 0 ? 'warning' : 'success'} dot>
                    {dept.vacant} vacant
                  </Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-2">
                {dept.seats.map((seat) => {
                  const vacant = seat.sanctioned - seat.filled;
                  return (
                    <div
                      key={seat.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {seat.designation}
                        </p>
                        <p className="text-xs capitalize text-slate-400">
                          {seat.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-500">
                          {seat.filled}/{seat.sanctioned}
                        </span>
                        {vacant > 0 ? (
                          <Badge tone="warning">{vacant} vacant</Badge>
                        ) : (
                          <Badge tone="success">Full</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
