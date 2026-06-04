import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  FullPageSpinner,
} from '@shared/components/ui';
import { formatDate } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import { useRequisition } from '../hooks/useRequisitions';
import { RequisitionStatusBadge } from '../components/RequisitionStatusBadge';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { ApprovalPanel } from '../components/ApprovalPanel';
import { RoleProfilePanel } from '../components/RoleProfilePanel';
import { PostingPanel } from '../components/PostingPanel';
import {
  COMPUTER_LABEL,
  EMPLOYMENT_NATURE_LABEL,
  REQUIREMENT_LABEL,
  SOURCE_LABEL,
  PREFERRED_SOURCE_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  SEATING_LABEL,
} from '../constants';

export default function RequisitionDetailPage() {
  const { id = '' } = useParams();
  const { data: req, isLoading, isError } = useRequisition(id);

  if (isLoading) return <FullPageSpinner label="Loading requisition…" />;

  if (isError || !req) {
    return (
      <EmptyState
        title="Requisition not found"
        description="We couldn’t find this requisition."
        action={
          <Link to={ROUTES.requisitions}>
            <Button variant="outline">Back to requisitions</Button>
          </Link>
        }
      />
    );
  }

  const showProfile =
    req.status === 'approved' ||
    req.status === 'profile_generated' ||
    req.status === 'posted';
  const showPosting =
    req.status === 'profile_generated' || req.status === 'posted';

  const vacancy: Row[] = [
    { label: 'Requirement', value: REQUIREMENT_LABEL[req.requirementType] },
    { label: 'Source', value: SOURCE_LABEL[req.source] },
    { label: 'Nos. of required post', value: String(req.requiredPosts) },
    { label: 'Total vacant post', value: String(req.totalVacantPosts) },
    { label: 'Unit / Factory', value: req.unitFactory },
    { label: 'Department / Section', value: req.department },
    { label: 'Place of posting', value: req.placeOfPosting },
    {
      label: 'When needed',
      value: req.whenNeededDate ? formatDate(req.whenNeededDate) : '—',
    },
    {
      label: 'Vacant date',
      value: req.vacantDate ? formatDate(req.vacantDate) : '—',
    },
    { label: 'Employment nature', value: EMPLOYMENT_NATURE_LABEL[req.employmentNature] },
    ...(req.employmentNature !== 'permanent' && req.contractualPurpose
      ? [{ label: 'Purpose', value: req.contractualPurpose }]
      : []),
  ];

  const jobAnalysis: Row[] = [
    { label: 'Education & training', value: req.education },
    { label: 'Experience', value: req.experience },
    ...(req.others ? [{ label: 'Others', value: req.others }] : []),
  ];

  const logistics: Row[] = [
    {
      label: 'Computer',
      value:
        COMPUTER_LABEL[req.computer] +
        (req.computerReason ? ` — ${req.computerReason}` : ''),
    },
    { label: 'Seating arrangement', value: SEATING_LABEL[req.seating] },
  ];

  return (
    <div className="space-y-6">
      <Link
        to={ROUTES.requisitions}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to requisitions
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">
              {req.designation}
            </h1>
            <RequisitionStatusBadge status={req.status} />
            <Badge tone={PRIORITY_TONE[req.priority]} dot>
              {PRIORITY_LABEL[req.priority]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {req.code} · {req.unitFactory} · {req.department}
          </p>
        </div>
        <Badge tone="brand">{req.requiredPosts} required post(s)</Badge>
      </div>

      {/* Workflow progress */}
      <Card>
        <CardBody>
          <WorkflowStepper status={req.status} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left · the form */}
        <div className="space-y-6 lg:col-span-1">
          <DetailCard title="A · Vacancy Information" rows={vacancy} />

          <Card>
            <CardHeader>
              <CardTitle>B · Job Analysis</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">Job description</p>
                <p className="mt-0.5 text-sm text-slate-700">
                  {req.jobDescription}
                </p>
              </div>
              {jobAnalysis.map((r) => (
                <FieldRow key={r.label} {...r} />
              ))}
            </CardBody>
          </Card>

          <DetailCard title="C · Logistics Requirement" rows={logistics} />

          <Card>
            <CardHeader>
              <CardTitle>E · Preferred Sources</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-1.5">
                {req.preferredSources.length > 0 ? (
                  req.preferredSources.map((s) => (
                    <Badge key={s} tone="neutral">
                      {PREFERRED_SOURCE_LABEL[s]}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">
                    Not specified
                  </span>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right · workflow */}
        <div className="space-y-6 lg:col-span-2">
          <ApprovalPanel requisition={req} />
          {showProfile && <RoleProfilePanel requisition={req} />}
          {showPosting && <PostingPanel requisition={req} />}
        </div>
      </div>
    </div>
  );
}

interface Row {
  label: string;
  value: string;
}

function DetailCard({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <dl className="space-y-3">
          {rows.map((r) => (
            <FieldRow key={r.label} {...r} />
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

function FieldRow({ label, value }: Row) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-700">{value}</dd>
    </div>
  );
}
