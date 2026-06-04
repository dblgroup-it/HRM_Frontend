import { Users, UserCheck, CalendarOff, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { StatCard, Skeleton } from '@shared/components/ui';
import { formatCompact } from '@shared/utils';
import type { StatCardProps } from '@shared/components/ui';

import type { DashboardStat } from '../types/dashboard.types';

const ICONS: Record<string, LucideIcon> = {
  employees: Users,
  present: UserCheck,
  onLeave: CalendarOff,
  openRoles: Briefcase,
};

const ACCENTS: Record<string, StatCardProps['accent']> = {
  employees: 'brand',
  present: 'emerald',
  onLeave: 'amber',
  openRoles: 'violet',
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
