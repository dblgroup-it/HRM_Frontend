import { Link } from 'react-router-dom';
import { ArrowRight, Building2, FolderOpen, Users } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FullPageSpinner,
  PageHeader,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import { useRequisitions } from '@modules/requisition/hooks/useRequisitions';
import type { CandidateStats } from '@modules/requisition/types/requisition.types';
import {
  PRIORITY_LABEL,
  PRIORITY_TONE,
} from '@modules/requisition/constants';

const STAGE_CHIPS: {
  key: keyof Omit<CandidateStats, 'total'>;
  label: string;
  dot: string;
}[] = [
  { key: 'applied', label: 'Applied', dot: 'bg-slate-400' },
  { key: 'shortlisted', label: 'Shortlisted', dot: 'bg-sky-500' },
  { key: 'interview', label: 'Interview', dot: 'bg-amber-500' },
  { key: 'final', label: 'Final', dot: 'bg-violet-500' },
  { key: 'selected', label: 'Selected', dot: 'bg-emerald-500' },
];

export default function RecruitmentPage() {
  const { data, isLoading } = useRequisitions({
    status: 'posted',
    page: 1,
    pageSize: 50,
  });

  if (isLoading) return <FullPageSpinner label="Loading recruitment…" />;

  const requisitions = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        description="Published requisitions actively collecting CVs. Open one to manage its candidate pipeline."
      />

      {requisitions.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No active recruitment yet"
          description="Once Corporate HR posts an approved requisition, it appears here with its CV-collection workspace."
          action={
            <Link to={ROUTES.requisitions}>
              <Button variant="outline">Go to requisitions</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {requisitions.map((req) => (
            <Card
              key={req.id}
              className="flex flex-col p-5 transition-shadow hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">
                  {req.designation}
                </h3>
                <Badge tone={PRIORITY_TONE[req.priority]} dot>
                  {PRIORITY_LABEL[req.priority]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{req.code}</p>

              <div className="mt-3 space-y-1.5 text-sm text-slate-500">
                <p className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {req.unitFactory}
                </p>
                <p className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  {req.requiredPosts} required post(s) · {req.department}
                </p>
              </div>

              {/* Live candidate pipeline counts */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STAGE_CHIPS.map((s) => (
                  <span
                    key={s.key}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                    {s.label} {req.candidateStats?.[s.key] ?? 0}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {req.drive ? (
                  <a
                    href={req.drive.allCvFolderUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge tone="success" dot>
                      CV folder ready
                    </Badge>
                  </a>
                ) : (
                  <Badge tone="neutral">Workspace pending</Badge>
                )}
                {req.posting?.postedAt && (
                  <span className="text-xs text-slate-400">
                    Posted {formatDate(req.posting.postedAt)}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                {req.drive ? (
                  <a
                    href={req.drive.rootFolderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
                  >
                    <FolderOpen className="h-4 w-4" /> Drive
                  </a>
                ) : (
                  <span />
                )}
                <Link to={ROUTES.requisitionDetail(req.id)}>
                  <Button
                    size="sm"
                    variant="outline"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Open pipeline
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
