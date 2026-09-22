import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, UserRoundCheck } from 'lucide-react';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@shared/components/ui';
import { formatDate, formatRelative } from '@shared/utils';
import { ROUTES } from '@app/router/paths';
import { RequisitionStatusBadge } from '@modules/requisition';

import type { RequisitionSnapshot } from '../types/dashboard.types';

/**
 * The requisitions this person is personally running.
 *
 * Assigned to them as recruiter, or handed to them while the recruiter is on
 * leave. The handover case is why this card exists: a covered requisition
 * did turn up in "Latest Requisitions", but as one row among the unit's news,
 * with nothing to say it had become somebody's job overnight. Work and news
 * are different things and the dashboard now separates them.
 *
 * Renders nothing when there is none, like every other "yours to do" card
 * here.
 */
export function MyRecruitment({ rows }: { rows: RequisitionSnapshot[] }) {
  if (rows.length === 0) return null;
  const covering = rows.filter((r) => r.mine === 'cover').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-brand-600" />
          Recruitment you&rsquo;re running
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {rows.length}
          </span>
          {covering > 0 && (
            <Badge tone="warning" dot>
              {covering} covering
            </Badge>
          )}
        </CardTitle>
        <Link
          to={ROUTES.requisitions}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardBody className="space-y-1">
        {rows.map((req) => (
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

            {/* Covering says who for and until when — a stand-in needs to
                know it is temporary and when it ends. */}
            {req.mine === 'cover' && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                <UserRoundCheck className="h-3.5 w-3.5 shrink-0" />
                Covering for{' '}
                <span className="font-semibold">
                  {req.coveringFor ?? 'the assigned recruiter'}
                </span>
                {req.coverUntil ? ` until ${formatDate(req.coverUntil)}` : ''}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <RequisitionStatusBadge status={req.status} />
              <Badge tone="neutral">{req.department}</Badge>
              <Badge tone="brand">{req.requiredPosts} post(s)</Badge>
            </div>
          </Link>
        ))}
      </CardBody>
    </Card>
  );
}
