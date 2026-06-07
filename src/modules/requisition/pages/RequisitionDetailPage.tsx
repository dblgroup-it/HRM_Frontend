import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';

import { useMyPermissions } from '@modules/rbac';

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
import { EditRequisitionModal } from '../components/EditRequisitionModal';
import {
  EMPLOYMENT_NATURE_LABEL,
  REQUIREMENT_LABEL,
  SOURCE_LABEL,
  PREFERRED_SOURCE_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
} from '../constants';

export default function RequisitionDetailPage() {
  const { id = '' } = useParams();
  const { data: req, isLoading, isError } = useRequisition(id);
  const { data: perms } = useMyPermissions();
  const [editOpen, setEditOpen] = useState(false);

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

  // The current approver may edit the requisition while it's pending
  // (e.g. the Department Head after it's bounced back with "need more info").
  const currentStep = req.approvalChain.find((s) => s.status === 'pending');
  const unitLower = req.unitFactory.toLowerCase();
  const canEdit =
    req.status === 'pending_approval' &&
    !!currentStep &&
    (!!perms?.isSuperUser ||
      (perms?.roles ?? []).some(
        (r) =>
          r.key === currentStep.role &&
          (r.unitId === null || (r.unitName ?? '').toLowerCase() === unitLower)
      ));
  const canCorporateHrContinue =
    !!perms?.isSuperUser ||
    (perms?.roles ?? []).some(
      (r) =>
        r.key === 'corporate_hr' &&
        (r.unitId === null || (r.unitName ?? '').toLowerCase() === unitLower)
    );

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
    {
      label: 'Employment nature',
      value: EMPLOYMENT_NATURE_LABEL[req.employmentNature],
    },
    ...(req.employmentNature !== 'permanent' && req.contractualPurpose
      ? [{ label: 'Purpose', value: req.contractualPurpose }]
      : []),
  ];

  const jobAnalysis: Row[] = [
    { label: 'Education & training', value: req.education },
    { label: 'Experience', value: req.experience },
    ...(req.others ? [{ label: 'Others', value: req.others }] : []),
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
        <div className="flex items-center gap-3">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => setEditOpen(true)}
            >
              Edit details
            </Button>
          )}
          <Badge tone="brand">{req.requiredPosts} required post(s)</Badge>
        </div>
      </div>

      <EditRequisitionModal
        requisition={req}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

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

          <Card>
            <CardHeader>
              <CardTitle>C · Preferred Sources</CardTitle>
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
                  <span className="text-sm text-slate-400">Not specified</span>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right · workflow */}
        <div className="space-y-6 lg:col-span-2">
          <ApprovalPanel requisition={req} />
          {showProfile && (
            <RoleProfilePanel
              requisition={req}
              canContinue={canCorporateHrContinue}
            />
          )}
          {showPosting && (
            <PostingPanel
              requisition={req}
              canContinue={canCorporateHrContinue}
            />
          )}
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
