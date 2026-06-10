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

const META: Record<
  string,
  { icon: LucideIcon; chip: string; card: string; value: string }
> = {
  employees: {
    icon: Users,
    chip: 'bg-brand-100 text-brand-700',
    card: 'bg-gradient-to-br from-brand-50 to-white border-brand-100',
    value: 'text-brand-900',
  },
  activeEmployees: {
    icon: UserCheck,
    chip: 'bg-emerald-100 text-emerald-700',
    card: 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100',
    value: 'text-emerald-900',
  },
  openRequisitions: {
    icon: ClipboardList,
    chip: 'bg-amber-100 text-amber-700',
    card: 'bg-gradient-to-br from-amber-50 to-white border-amber-100',
    value: 'text-amber-900',
  },
  vacantSeats: {
    icon: Building2,
    chip: 'bg-violet-100 text-violet-700',
    card: 'bg-gradient-to-br from-violet-50 to-white border-violet-100',
    value: 'text-violet-900',
  },
};

const FALLBACK = {
  icon: Users,
  chip: 'bg-brand-100 text-brand-700',
  card: 'bg-gradient-to-br from-brand-50 to-white border-brand-100',
  value: 'text-brand-900',
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[112px] rounded-2xl sm:h-[124px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {stats.map((stat) => {
        const meta = META[stat.key] ?? FALLBACK;
        const Icon = meta.icon;
        const up = (stat.trend ?? 0) >= 0;
        return (
          <div
            key={stat.key}
            className={cn(
              'group rounded-2xl border p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgba(16,24,40,0.28)] sm:p-5',
              meta.card,
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11',
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
            <p
              className={cn(
                'mt-3 text-2xl font-bold tracking-tight sm:mt-4 sm:text-3xl',
                meta.value,
              )}
            >
              {formatCompact(stat.value)}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-600 sm:text-sm">
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
