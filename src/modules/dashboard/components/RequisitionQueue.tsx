import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';

import { Badge, Card, CardBody, CardHeader, CardTitle } from '@shared/components/ui';
import { formatRelative } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import { RequisitionStatusBadge } from '@modules/requisition';

import type { RequisitionSnapshot } from '../types/dashboard.types';

export function RequisitionQueue({
  requisitions,
}: {
  requisitions: RequisitionSnapshot[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-brand-600" />
          Latest Requisitions
        </CardTitle>
        <Link
          to={ROUTES.requisitions}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardBody className="space-y-1">
        {requisitions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No requisitions available.
          </p>
        ) : (
          requisitions.map((req) => (
            <Link
              key={req.id}
              to={ROUTES.requisitionDetail(req.id)}
              className="block rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {req.designation}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {req.code} · {req.unitFactory}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-slate-400">
                  {formatRelative(req.updatedAt)}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <RequisitionStatusBadge status={req.status} />
                <Badge tone="neutral">{req.department}</Badge>
                <Badge tone="brand">{req.requiredPosts} post(s)</Badge>
              </div>
            </Link>
          ))
        )}
      </CardBody>
    </Card>
  );
}
