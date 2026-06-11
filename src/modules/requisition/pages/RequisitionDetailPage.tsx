import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
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

import { CandidatesPanel, canAccessRecruitment } from '@modules/candidates';
import { AssessmentPanel } from '@modules/assessment';
import { OnboardingTab } from '@modules/onboarding';
import { cn } from '@shared/lib';

import { useRequisition } from '../hooks/useRequisitions';
import { RequisitionStatusBadge } from '../components/RequisitionStatusBadge';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { ApprovalPanel } from '../components/ApprovalPanel';
import { RoleProfilePanel } from '../components/RoleProfilePanel';
import { PostingPanel } from '../components/PostingPanel';
import { EditRequisitionModal } from '../components/EditRequisitionModal';
import { AttachmentsPanel } from '../components/AttachmentsPanel';
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
  const location = useLocation();
  const { data: req, isLoading, isError } = useRequisition(id);
  const { data: perms } = useMyPermissions();
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<TabKey | null>(null);

  // Return to wherever the user came from (Candidates, Requisitions, …).
  const nav = (location.state ?? null) as {
    from?: string;
    fromLabel?: string;
  } | null;
  const backTo = nav?.from ?? ROUTES.requisitions;
  const backLabel = nav?.fromLabel ?? 'requisitions';

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
  // The candidate pipeline is visible only to Corporate HR, CHRO & super users.
  const showCandidates =
    canAccessRecruitment(perms, req.unitFactory) &&
    (req.status === 'posted' ||
      req.status === 'approved' ||
      Boolean(req.drive));

  const vacancy: Row[] = [
    { label: 'Requirement', value: REQUIREMENT_LABEL[req.requirementType] },
    { label: 'Source', value: SOURCE_LABEL[req.source] },
    { label: 'Nos. of required post', value: String(req.requiredPosts) },
    { label: 'Total vacant post', value: String(req.totalVacantPosts) },
    { label: 'Unit / Factory', value: req.unitFactory },
    { label: 'Department', value: req.department },
    ...(req.section ? [{ label: 'Section', value: req.section }] : []),
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

  // Lifecycle-ordered tabs (only the ones that apply to this requisition).
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'approvals', label: 'Approvals' },
    ...(showProfile ? [{ key: 'posting' as const, label: 'Profile & Posting' }] : []),
    ...(showCandidates
      ? [{ key: 'recruitment' as const, label: 'Recruitment' }]
      : []),
    ...(showCandidates && canCorporateHrContinue
      ? [{ key: 'assessment' as const, label: 'Assessment' }]
      : []),
    ...(showCandidates && canCorporateHrContinue
      ? [{ key: 'onboarding' as const, label: 'Onboarding' }]
      : []),
  ];
  const defaultTab: TabKey =
    req.status === 'posted'
      ? showCandidates
        ? 'recruitment'
        : 'posting'
      : req.status === 'approved' || req.status === 'profile_generated'
        ? 'posting'
        : req.status === 'draft'
          ? 'details'
          : 'approvals';
  const activeTab: TabKey =
    tab && tabs.some((t) => t.key === tab) ? tab : defaultTab;

  return (
    <div className="space-y-6">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {backLabel}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">
              {req.designation}
            </h1>
            <RequisitionStatusBadge status={req.status} pipeline={req.pipeline} />
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

      {/* Workflow progress — the lifecycle at a glance, always visible */}
      <Card>
        <CardBody>
          <WorkflowStepper status={req.status} pipeline={req.pipeline} />
        </CardBody>
      </Card>

      {/* Lifecycle tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition',
              activeTab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard title="A · Vacancy Information" rows={vacancy} />
          <div className="space-y-6">
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
                    <span className="text-sm text-slate-400">
                      Not specified
                    </span>
                  )}
                </div>
              </CardBody>
            </Card>

            <AttachmentsPanel requisition={req} />
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <ApprovalPanel requisition={req} />
        </div>
      )}

      {activeTab === 'posting' && showProfile && (
        <div className="space-y-6">
          <RoleProfilePanel
            requisition={req}
            canContinue={canCorporateHrContinue}
          />
          {showPosting && (
            <PostingPanel
              requisition={req}
              canContinue={canCorporateHrContinue}
            />
          )}
        </div>
      )}

      {activeTab === 'recruitment' && showCandidates && (
        <CandidatesPanel requisition={req} canManage={canCorporateHrContinue} />
      )}

      {activeTab === 'assessment' && showCandidates && canCorporateHrContinue && (
        <AssessmentPanel requisition={req} />
      )}

      {activeTab === 'onboarding' && showCandidates && canCorporateHrContinue && (
        <OnboardingTab reqId={req.id} canManage={canCorporateHrContinue} />
      )}
    </div>
  );
}

type TabKey =
  | 'details'
  | 'approvals'
  | 'posting'
  | 'recruitment'
  | 'assessment'
  | 'onboarding';

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
