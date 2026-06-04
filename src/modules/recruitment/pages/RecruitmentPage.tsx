import { Plus } from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FullPageSpinner,
  PageHeader,
  type BadgeTone,
} from '@shared/components/ui';
import { formatDate } from '@shared/utils';

import { useRecruitment } from '../hooks/useRecruitment';
import type {
  Candidate,
  JobStatus,
  PipelineStage,
} from '../types/recruitment.types';

const JOB_STATUS_TONE: Record<JobStatus, BadgeTone> = {
  open: 'success',
  on_hold: 'warning',
  closed: 'neutral',
};

const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  open: 'Open',
  on_hold: 'On Hold',
  closed: 'Closed',
};

const STAGES: { key: PipelineStage; label: string; accent: string }[] = [
  { key: 'applied', label: 'Applied', accent: 'border-t-slate-400' },
  { key: 'screening', label: 'Screening', accent: 'border-t-sky-500' },
  { key: 'interview', label: 'Interview', accent: 'border-t-amber-500' },
  { key: 'offer', label: 'Offer', accent: 'border-t-violet-500' },
  { key: 'hired', label: 'Hired', accent: 'border-t-emerald-500' },
];

export default function RecruitmentPage() {
  const { data, isLoading } = useRecruitment();

  if (isLoading || !data) return <FullPageSpinner label="Loading pipeline…" />;

  const byStage = (stage: PipelineStage): Candidate[] =>
    data.candidates.filter((c) => c.stage === stage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        description="Track open positions and move candidates through the pipeline."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />}>Post a job</Button>
        }
      />

      {/* Open positions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.openings.map((job) => (
          <Card key={job.id} className="p-5 transition-shadow hover:shadow-card-hover">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{job.title}</h3>
              <Badge tone={JOB_STATUS_TONE[job.status]} dot>
                {JOB_STATUS_LABEL[job.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {job.department} · {job.location}
            </p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-400">{job.type}</span>
              <span className="font-medium text-brand-600">
                {job.applicants} applicants
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Posted {formatDate(job.postedAt)}
            </p>
          </Card>
        ))}
      </div>

      {/* Candidate pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Candidate Pipeline</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((stage) => {
              const candidates = byStage(stage.key);
              return (
                <div
                  key={stage.key}
                  className={`rounded-lg border border-t-2 border-slate-200 bg-surface-muted ${stage.accent}`}
                >
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm font-medium text-slate-700">
                      {stage.label}
                    </span>
                    <span className="rounded-full bg-white px-2 text-xs font-semibold text-slate-500">
                      {candidates.length}
                    </span>
                  </div>
                  <div className="space-y-2 p-2">
                    {candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={candidate.name}
                            src={candidate.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {candidate.name}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {candidate.role}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {candidates.length === 0 && (
                      <p className="px-1 py-3 text-center text-xs text-slate-400">
                        No candidates
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
