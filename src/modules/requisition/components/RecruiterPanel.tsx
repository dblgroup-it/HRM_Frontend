import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCog, UserPlus } from 'lucide-react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Select,
} from '@shared/components/ui';
import { formatDate } from '@shared/utils';

import type { Requisition } from '../types/requisition.types';
import { requisitionApi } from '../api/requisition.api';
import { useAssignRecruiter } from '../hooks/useRequisitionActions';

/**
 * Corporate HR nominates the Corporate Recruiter who runs this requisition's
 * hiring lifecycle. Additive — Corporate HR and CHRO keep their own access.
 */
export function RecruiterPanel({
  requisition,
  canAssign,
}: {
  requisition: Requisition;
  canAssign: boolean;
}) {
  const [picked, setPicked] = useState('');
  const assign = useAssignRecruiter();

  const { data: recruiters = [], isLoading } = useQuery({
    queryKey: ['requisition', requisition.id, 'recruiters'],
    queryFn: () => requisitionApi.listRecruiters(requisition.id),
    enabled: canAssign,
  });

  const current = requisition.recruiter;

  // Nothing to show a non-assigner when nobody is assigned yet.
  if (!canAssign && !current) return null;

  const options = [
    { value: '', label: current ? 'Change recruiter…' : 'Select a recruiter…' },
    ...recruiters
      .filter((r) => r.id !== current?.id)
      .map((r) => ({ value: r.id, label: `${r.name} · ${r.employeeCode}` })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-brand-600" />
          Corporate Recruiter
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {current ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
            <p className="text-sm font-medium text-slate-800">{current.name}</p>
            <p className="text-xs text-slate-500">
              {current.employeeCode}
              {requisition.recruiterAssignedAt
                ? ` · assigned ${formatDate(requisition.recruiterAssignedAt)}`
                : ''}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No recruiter assigned yet — Corporate HR still runs this
            requisition.
          </p>
        )}

        {canAssign && (
          <>
            {!isLoading && recruiters.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Nobody holds the Corporate Recruiter role for this unit yet —
                grant it in Configuration → Access Control first.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[14rem] flex-1">
                  <Select
                    options={options}
                    value={picked}
                    onChange={(e) => setPicked(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  disabled={!picked || assign.isPending}
                  isLoading={assign.isPending}
                  onClick={() =>
                    assign.mutate(
                      { id: requisition.id, recruiterId: picked },
                      { onSuccess: () => setPicked('') },
                    )
                  }
                >
                  {current ? 'Reassign' : 'Assign'}
                </Button>
                {current && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={assign.isPending}
                    onClick={() =>
                      assign.mutate({
                        id: requisition.id,
                        recruiterId: null,
                      })
                    }
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
            {assign.isError && (
              <p className="text-sm text-red-600">
                {(assign.error as Error).message}
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
