import { Users, UserCheck, ClipboardList, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { StatCard, Skeleton } from '@shared/components/ui';
import { formatCompact } from '@shared/utils';
import type { StatCardProps } from '@shared/components/ui';

import type { DashboardStat } from '../types/dashboard.types';

const ICONS: Record<string, LucideIcon> = {
  employees: Users,
  activeEmployees: UserCheck,
  openRequisitions: ClipboardList,
  vacantSeats: Building2,
};

const ACCENTS: Record<string, StatCardProps['accent']> = {
  employees: 'brand',
  activeEmployees: 'emerald',
  openRequisitions: 'amber',
  vacantSeats: 'violet',
};

export function StatsGrid({
  stats,
  isLoading,
}: {
  stats?: DashboardStat[];
  isLoading: boolean;
}) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[116px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.key}
          label={stat.label}
          value={formatCompact(stat.value)}
          icon={ICONS[stat.key] ?? Users}
          accent={ACCENTS[stat.key] ?? 'brand'}
          trend={stat.trend}
          trendLabel="vs last month"
        />
      ))}
    </div>
  );
}
