import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ClipboardList,
  UserCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Skeleton } from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatCompact } from '@shared/utils';

import type { DashboardStat } from '../types/dashboard.types';

const META: Record<string, { icon: LucideIcon; chip: string }> = {
  employees: { icon: Users, chip: 'bg-brand-50 text-brand-600' },
  activeEmployees: { icon: UserCheck, chip: 'bg-emerald-50 text-emerald-600' },
  openRequisitions: { icon: ClipboardList, chip: 'bg-amber-50 text-amber-600' },
  vacantSeats: { icon: Building2, chip: 'bg-violet-50 text-violet-600' },
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
          <Skeleton key={i} className="h-[124px] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const meta =
          META[stat.key] ?? { icon: Users, chip: 'bg-brand-50 text-brand-600' };
        const Icon = meta.icon;
        const up = (stat.trend ?? 0) >= 0;
        return (
          <div
            key={stat.key}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_-16px_rgba(16,24,40,0.25)]"
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105',
                  meta.chip,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {stat.trend !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                    up
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600',
                  )}
                >
                  {up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(stat.trend)}%
                </span>
              )}
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-ink-dark">
              {formatCompact(stat.value)}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
