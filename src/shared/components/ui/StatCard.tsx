import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { cn } from '@shared/lib';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Percentage delta vs. previous period; sign drives the colour. */
  trend?: number;
  trendLabel?: string;
  accent?: 'brand' | 'emerald' | 'amber' | 'sky' | 'violet';
}

const accents = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  violet: 'bg-violet-50 text-violet-600',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  accent = 'brand',
}: StatCardProps) {
  const isPositive = (trend ?? 0) >= 0;

  return (
    <Card className="p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-normal text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-medium tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            accents[accent]
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              isPositive ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend)}%
          </span>
          {trendLabel && <span className="text-slate-400">{trendLabel}</span>}
        </div>
      )}
    </Card>
  );
}
