import { Card, CardBody, CardHeader, CardTitle, Badge } from '@shared/components/ui';
import { formatCompact } from '@shared/utils';

import type { DashboardSummary } from '../types/dashboard.types';

export function OrganogramSnapshot({
  summary,
}: {
  summary: DashboardSummary;
}) {
  const occupancy =
    summary.sanctionedSeats > 0
      ? (summary.filledSeats / summary.sanctionedSeats) * 100
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organogram Snapshot</CardTitle>
        <Badge tone="neutral">{formatCompact(summary.activeUnits)} active units</Badge>
      </CardHeader>
      <CardBody className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Seat occupancy</span>
            <span className="font-medium text-slate-700">
              {formatCompact(summary.filledSeats)} / {formatCompact(summary.sanctionedSeats)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.min(occupancy, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Units" value={`${summary.activeUnits}/${summary.totalUnits}`} />
          <Metric label="Vacant seats" value={formatCompact(summary.vacantSeats)} />
          <Metric label="Sanctioned" value={formatCompact(summary.sanctionedSeats)} />
          <Metric label="Filled" value={formatCompact(summary.filledSeats)} />
        </div>
      </CardBody>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-medium text-slate-900">{value}</p>
    </div>
  );
}
