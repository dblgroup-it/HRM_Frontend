import { Card, CardHeader, CardTitle, CardBody } from '@shared/components/ui';
import { formatCompact } from '@shared/utils';

import type { DepartmentHeadcount } from '../types/dashboard.types';

const BAR_COLORS = [
  'bg-brand-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
];

export function DepartmentBreakdown({
  departments,
}: {
  departments: DepartmentHeadcount[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Headcount by Department</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {departments.map((dept, index) => (
          <div key={dept.department}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                {dept.department}
              </span>
              <span className="text-slate-500">
                {formatCompact(dept.headcount)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                style={{ width: `${dept.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
