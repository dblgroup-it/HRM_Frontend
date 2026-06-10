import { useNavigate } from 'react-router-dom';
import { Building2, CalendarClock, ChevronRight } from 'lucide-react';

import { Badge, DataTable, Skeleton, type Column } from '@shared/components/ui';
import { formatDate } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import type { Requisition } from '../types/requisition.types';
import {
  PRIORITY_LABEL,
  PRIORITY_TONE,
  REQUIREMENT_TONE,
  SOURCE_LABEL,
} from '../constants';
import { RequisitionStatusBadge } from './RequisitionStatusBadge';

interface Props {
  requisitions: Requisition[];
  isLoading: boolean;
}

export function RequisitionTable({ requisitions, isLoading }: Props) {
  const navigate = useNavigate();
  const open = (r: Requisition) => navigate(ROUTES.requisitionDetail(r.id));

  const columns: Column<Requisition>[] = [
    {
      key: 'designation',
      header: 'Designation',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.designation}</p>
          <p className="text-xs text-slate-400">
            {r.code} · {SOURCE_LABEL[r.source]}
          </p>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Unit / Department',
      render: (r) => (
        <div>
          <p className="text-slate-700">{r.unitFactory}</p>
          <p className="text-xs text-slate-400">{r.department}</p>
        </div>
      ),
    },
    {
      key: 'requirement',
      header: 'Requirement',
      render: (r) => (
        <Badge tone={REQUIREMENT_TONE[r.requirementType]}>
          {r.requirementType === 'existing' ? 'Replacement' : 'New'}
        </Badge>
      ),
    },
    { key: 'posts', header: 'Posts', align: 'center', render: (r) => r.requiredPosts },
    {
      key: 'priority',
      header: 'Priority',
      render: (r) => (
        <Badge tone={PRIORITY_TONE[r.priority]} dot>
          {PRIORITY_LABEL[r.priority]}
        </Badge>
      ),
    },
    {
      key: 'whenNeeded',
      header: 'When Needed',
      render: (r) => (r.whenNeededDate ? formatDate(r.whenNeededDate) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <RequisitionStatusBadge status={r.status} />,
    },
  ];

  return (
    <>
      {/* Desktop / tablet — table */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={requisitions}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No requisitions match your filters."
          onRowClick={open}
        />
      </div>

      {/* Mobile — cards */}
      <div className="space-y-2.5 p-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : requisitions.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No requisitions match your filters.
          </p>
        ) : (
          requisitions.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => open(r)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition active:scale-[0.99] hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {r.designation}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {r.code} · {SOURCE_LABEL[r.source]}
                  </p>
                </div>
                <RequisitionStatusBadge status={r.status} />
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">
                    {r.unitFactory} · {r.department}
                  </span>
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge tone={REQUIREMENT_TONE[r.requirementType]}>
                  {r.requirementType === 'existing' ? 'Replacement' : 'New'}
                </Badge>
                <Badge tone={PRIORITY_TONE[r.priority]} dot>
                  {PRIORITY_LABEL[r.priority]}
                </Badge>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {r.requiredPosts} post{r.requiredPosts === 1 ? '' : 's'}
                </span>
                {r.whenNeededDate && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <CalendarClock className="h-3 w-3" />
                    {formatDate(r.whenNeededDate)}
                  </span>
                )}
                <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}
