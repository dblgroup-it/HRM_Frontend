import { Card, CardHeader, CardTitle, CardBody } from '@shared/components/ui';
import { formatCompact } from '@shared/utils';

import type { AttendanceSummary } from '../types/dashboard.types';

export function AttendanceOverview({
  attendance,
}: {
  attendance: AttendanceSummary;
}) {
  const segments = [
    { label: 'On-site', value: attendance.present, color: 'bg-emerald-500' },
    { label: 'Remote', value: attendance.remote, color: 'bg-sky-500' },
    { label: 'On leave', value: attendance.onLeave, color: 'bg-amber-500' },
    { label: 'Absent', value: attendance.absent, color: 'bg-rose-500' },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today’s Attendance</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
          {segments.map((s) => (
            <div
              key={s.label}
              className={s.color}
              style={{ width: `${(s.value / total) * 100}%` }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
              <span className="text-sm text-slate-500">{s.label}</span>
              <span className="ml-auto text-sm font-semibold text-slate-800">
                {formatCompact(s.value)}
              </span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
