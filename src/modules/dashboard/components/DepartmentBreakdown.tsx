import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3 } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardBody } from '@shared/components/ui';
import { formatCompact } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import type { DepartmentHeadcount } from '../types/dashboard.types';

const BARS = [
  'from-brand-400 to-brand-600',
  'from-emerald-400 to-emerald-600',
  'from-sky-400 to-sky-600',
  'from-violet-400 to-violet-600',
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-teal-400 to-teal-600',
];

export function DepartmentBreakdown({
  departments,
}: {
  departments: DepartmentHeadcount[];
}) {
  const max = Math.max(1, ...departments.map((d) => d.headcount));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-600" />
          Headcount by Department
        </CardTitle>
        <Link
          to={ROUTES.employees}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          All employees <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardBody className="space-y-4">
        {departments.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No headcount data yet.
          </p>
        ) : (
          departments.map((dept, index) => (
            <div key={dept.department}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="truncate font-medium text-slate-700">
                  {dept.department}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {formatCompact(dept.headcount)}
                  <span className="ml-1.5 text-xs text-slate-400">
                    {Math.round(dept.percentage)}%
                  </span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${BARS[index % BARS.length]} transition-[width] duration-500`}
                  style={{ width: `${(dept.headcount / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
