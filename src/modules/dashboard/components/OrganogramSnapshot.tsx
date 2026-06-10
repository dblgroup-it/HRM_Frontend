import { Link } from 'react-router-dom';
import { ArrowRight, Network } from 'lucide-react';

import { Card, CardBody, CardHeader, CardTitle, Badge } from '@shared/components/ui';
import { formatCompact } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import type { DashboardSummary } from '../types/dashboard.types';

export function OrganogramSnapshot({ summary }: { summary: DashboardSummary }) {
  const occupancy =
    summary.sanctionedSeats > 0
      ? (summary.filledSeats / summary.sanctionedSeats) * 100
      : 0;

  // Donut geometry
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(occupancy, 100) / 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-4 w-4 text-brand-600" />
          Workforce Capacity
        </CardTitle>
        <Badge tone="neutral">
          {formatCompact(summary.activeUnits)} active units
        </Badge>
      </CardHeader>
      <CardBody className="space-y-5">
        {/* Donut */}
        <div className="flex items-center justify-center py-1">
          <div className="relative h-36 w-36">
            <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke="#eef2f6"
                strokeWidth="12"
              />
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke="url(#capGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
              />
              <defs>
                <linearGradient id="capGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1877c0" />
                  <stop offset="100%" stopColor="#8cc63f" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-ink-dark">
                {Math.round(occupancy)}%
              </span>
              <span className="text-[11px] text-slate-400">seats filled</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Filled"
            value={formatCompact(summary.filledSeats)}
            dot="bg-brand-500"
          />
          <Metric
            label="Vacant"
            value={formatCompact(summary.vacantSeats)}
            dot="bg-slate-300"
          />
          <Metric
            label="Sanctioned"
            value={formatCompact(summary.sanctionedSeats)}
            dot="bg-accent-500"
          />
          <Metric
            label="Units"
            value={`${summary.activeUnits}/${summary.totalUnits}`}
            dot="bg-violet-400"
          />
        </div>

        <Link
          to={ROUTES.organogram}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          View organogram <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardBody>
    </Card>
  );
}

function Metric({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
