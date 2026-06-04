import { useNavigate } from 'react-router-dom';

import { Badge, DataTable, type Column } from '@shared/components/ui';
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
    {
      key: 'posts',
      header: 'Posts',
      align: 'center',
      render: (r) => r.requiredPosts,
    },
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
    <DataTable
      columns={columns}
      data={requisitions}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      emptyMessage="No requisitions match your filters."
      onRowClick={(r) => navigate(ROUTES.requisitionDetail(r.id))}
    />
  );
}
