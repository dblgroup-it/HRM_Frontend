import { Link } from 'react-router-dom';

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
        <CardTitle>Latest Requisitions</CardTitle>
        <Badge tone="info">{requisitions.length} shown</Badge>
      </CardHeader>
      <CardBody className="space-y-2">
        {requisitions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No requisitions available.
          </p>
        ) : (
          requisitions.map((req) => (
            <Link
              key={req.id}
              to={ROUTES.requisitionDetail(req.id)}
              className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50"
            >
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {req.designation}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {req.code} · {req.unitFactory}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatRelative(req.updatedAt)}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RequisitionStatusBadge status={req.status} />
                  <Badge tone="neutral">{req.department}</Badge>
                  <Badge tone="brand">{req.requiredPosts} post(s)</Badge>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardBody>
    </Card>
  );
}
