import { Link } from 'react-router-dom';
import { ArrowRight, UserPlus } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardBody, Avatar } from '@shared/components/ui';
import { formatDate } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import type { RecentHire } from '../types/dashboard.types';

export function RecentHires({ hires }: { hires: RecentHire[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-brand-600" />
          Recent Hires
        </CardTitle>
        <Link
          to={ROUTES.employees}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardBody className="space-y-0.5">
        {hires.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No recent hires.
          </p>
        ) : (
          hires.map((hire) => (
            <div
              key={hire.id}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50"
            >
              <Avatar name={hire.name} src={hire.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {hire.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {hire.jobTitle} · {hire.department}
                </p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                {formatDate(hire.joinedAt)}
              </span>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
