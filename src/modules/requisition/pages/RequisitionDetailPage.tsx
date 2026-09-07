import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCheck,
  ClipboardList,
  GitBranch,
  ListChecks,
  MessageSquare,
  Pencil,
  Rocket,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useMyPermissions } from '@modules/rbac';
import { useAuthStore } from '@modules/auth';
import { useSeatLookup } from '@modules/organogram';

import {
  Badge,
  BusyOverlay,
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

import { CandidatesPanel, canAccessRecruitment, useSetupWorkspace } from '@modules/candidates';
import { AssessmentPanel, InterviewsPanel } from '@modules/assessment';
import { OnboardingTab } from '@modules/onboarding';
import { cn } from '@shared/lib';

import { useRequisition } from '../hooks/useRequisitions';
import { RequisitionStatusBadge } from '../components/RequisitionStatusBadge';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { ApprovalPanel } from '../components/ApprovalPanel';
import { RoleProfilePanel } from '../components/RoleProfilePanel';
import { RecruiterPanel } from '../components/RecruiterPanel';
import { PostingPanel } from '../components/PostingPanel';
import { EditRequisitionModal } from '../components/EditRequisitionModal';
import { AttachmentsPanel } from '../components/AttachmentsPanel';
import { FacilitiesPanel } from '../components/FacilitiesPanel';
import {
  EMPLOYMENT_NATURE_LABEL,
  REQUIREMENT_LABEL,
  preferredSourceLabel,
  PRIORITY_LABEL,
  PRIORITY_TONE,
} from '../constants';

export default function RequisitionDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: req, isLoading, isError } = useRequisition(id);
  const { data: perms } = useMyPermissions();
  const myUserId = useAuthStore((s) => s.user?.id);
  const seatLookup = useSeatLookup(
    req?.unitFactory ?? '',
    req?.department ?? '',
    req?.designation ?? '',
  );
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<TabKey | null>(
    (searchParams.get('tab') as TabKey | null) ?? null,
  );
  // 'working' = Publish clicked, Drive not ready yet
  // 'done'    = Drive workspace arrived — show success for 1.5 s before hiding
  // 'failed'  = server reported drive_failed, or a 90s timeout gave up waiting
  const [drivePhase, setDrivePhase] = useState<
    'idle' | 'working' | 'done' | 'failed'
  >('idle');
  const setupWorkspace = useSetupWorkspace(id);

  // Sliding pill indicator behind the active tab — measured from the DOM via
  // a data-active flag, so this hook never needs to know which tab that is
  // (keeps it safe to sit above the loading/error guards below).
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  useEffect(() => {
    const measure = () => {
      const el =
        tabBarRef.current?.querySelector<HTMLElement>('[data-active="true"]');
      if (!el) return;
      // Guard against redundant updates — this runs with no dependency array
      // (it needs to re-measure after any render, since the active tab is
      // read from the DOM rather than passed in), so without this check a
      // fresh object every render would re-trigger the effect forever.
      setIndicator((prev) =>
        prev.left === el.offsetLeft && prev.width === el.offsetWidth
          ? prev
          : { left: el.offsetLeft, width: el.offsetWidth },
      );
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  });

  // Keep tab in sync when URL ?tab= changes (e.g. link from a modal on the same page)
  useEffect(() => {
    const t = searchParams.get('tab') as TabKey | null;
    if (t) setTab(t);
  }, [searchParams]);

  // Switch to 'done' as soon as Drive workspace arrives
  useEffect(() => {
    if (drivePhase === 'working' && req?.drive) setDrivePhase('done');
  }, [drivePhase, req?.drive]);

  // Server told us the background Drive setup failed (requisition:drive_failed).
  useEffect(() => {
    if (drivePhase === 'working' && req?.driveSetupError) setDrivePhase('failed');
  }, [drivePhase, req?.driveSetupError]);

  // Backstop: if neither `drive` nor `driveSetupError` ever arrives (a lost
  // realtime event), don't spin forever — give up after 90s.
  useEffect(() => {
    if (drivePhase !== 'working') return;
    const timeoutId = setTimeout(() => setDrivePhase('failed'), 90_000);
    return () => clearTimeout(timeoutId);
  }, [drivePhase]);

  // Hold the 'done' label for 1.5 s, then dismiss
  useEffect(() => {
    if (drivePhase !== 'done') return;
    const id = setTimeout(() => setDrivePhase('idle'), 1500);
    return () => clearTimeout(id);
  }, [drivePhase]);

  const retryDriveSetup = () => {
    setDrivePhase('working');
    setupWorkspace.mutate(undefined, {
      onError: () => setDrivePhase('failed'),
    });
  };

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

  // Who may edit a requisition that is still in the chain.
  //
  // Normally it's whoever's step is active. But after "need more info" it goes
  // back to the requisitioner — they wrote it, so they're the one who can
  // answer — and no approver holds it until they resend.
  const awaitingRaiser = req.approvalChain.some(
    (s) => s.status === 'info_requested'
  );
  const currentStep = req.approvalChain.find((s) => s.status === 'pending');
  const unitLower = req.unitFactory.toLowerCase();
  const canEdit =
    req.status === 'pending_approval' &&
    (awaitingRaiser
      ? !!perms?.isSuperUser ||
        (!!myUserId && req.raisedById === myUserId)
      : !!currentStep &&
        (!!perms?.isSuperUser ||
          (currentStep.approverUserId
            ? currentStep.approverUserId === myUserId
            : (perms?.roles ?? []).some(
                (r) =>
                  r.key === currentStep.role &&
                  (r.unitId === null ||
                    (r.unitName ?? '').toLowerCase() === unitLower)
              ))));
  // Corporate HR keeps access after assigning a recruiter — the recruiter is
  // added to it, not swapped in.
  const isAssignedRecruiter = !!myUserId && req.recruiter?.id === myUserId;
  const canCorporateHrContinue =
    !!perms?.isSuperUser ||
    isAssignedRecruiter ||
    (perms?.roles ?? []).some(
      (r) =>
        r.key === 'corporate_hr' &&
        (r.unitId === null || (r.unitName ?? '').toLowerCase() === unitLower)
    );
  // Facilities are provisioning commitments, so they are settled by the HR
  // side — Corporate HR / CHRO / super and the assigned recruiter — not by
  // whichever approver currently holds the requisition.
  const canDecideFacilities = canAccessRecruitment(perms, req.unitFactory, {
    recruiterId: req.recruiter?.id,
    myUserId,
  });
  // Only Corporate HR / CHRO / super may nominate the recruiter.
  const canAssignRecruiter =
    !!perms?.isSuperUser ||
    (perms?.roles ?? []).some(
      (r) =>
        (r.key === 'corporate_hr' || r.key === 'chro') &&
        (r.unitId === null || (r.unitName ?? '').toLowerCase() === unitLower)
    );
  // The candidate pipeline is visible only to Corporate HR, CHRO & super users.
  const showCandidates =
    canAccessRecruitment(perms, req.unitFactory, {
      recruiterId: req.recruiter?.id,
      myUserId,
    }) &&
    (req.status === 'posted' ||
      req.status === 'approved' ||
      Boolean(req.drive));

  const seat = seatLookup.data;
  const gradeLine = [
    seat?.seat?.grade ? `Organogram: ${seat.seat.grade}` : null,
    seat?.gradeReference?.length
      ? `ZingHR: ${seat.gradeReference.slice(0, 3).map((g) => `${g.grade} (${g.count})`).join(', ')}`
      : null,
  ].filter(Boolean).join(' · ');

  const vacancy: Row[] = [
    { label: 'Requirement', value: REQUIREMENT_LABEL[req.requirementType] },
    { label: 'Nos. of required post', value: String(req.requiredPosts) },
    { label: 'Total vacant post', value: String(req.totalVacantPosts) },
    { label: 'Unit / Factory', value: req.unitFactory },
    ...(req.lineOfBusiness
      ? [{ label: 'Line of Business', value: req.lineOfBusiness }]
      : []),
    { label: 'Department', value: req.department },
    ...(req.section ? [{ label: 'Section', value: req.section }] : []),
    ...(req.subSection
      ? [{ label: 'Sub-section', value: req.subSection }]
      : []),
    // Replacement provenance — who left and why, so an approver can judge the
    // request without chasing it up.
    ...(req.replaceOfName
      ? [
          {
            label: 'Replacing',
            value: req.replaceOfEmployeeCode
              ? `${req.replaceOfName} (${req.replaceOfEmployeeCode})`
              : req.replaceOfName,
          },
        ]
      : []),
    ...(req.separationReason
      ? [{ label: 'Reason for leaving', value: req.separationReason }]
      : []),
    ...(req.replacementRemarks
      ? [{ label: 'Remarks', value: req.replacementRemarks }]
      : []),
    { label: 'Job Grade', value: req.grade ?? 'Not yet confirmed' },
    ...(gradeLine ? [{ label: 'Grade reference', value: gradeLine }] : []),
    { label: 'Place of posting', value: req.placeOfPosting },
    {
      label: 'When needed',
      value: req.neededDate ? formatDate(req.neededDate) : '—',
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
  const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
    { key: 'details', label: 'Details', icon: ClipboardList },
    { key: 'approvals', label: 'Approvals', icon: GitBranch },
    ...(showProfile
      ? [{ key: 'posting' as const, label: 'Profile & Posting', icon: Rocket }]
      : []),
    ...(showCandidates
      ? [{ key: 'recruitment' as const, label: 'Recruitment', icon: Users }]
      : []),
    ...(showCandidates && canCorporateHrContinue
      ? [{ key: 'assessment' as const, label: 'Assessment', icon: ListChecks }]
      : []),
    ...(showCandidates && canCorporateHrContinue
      ? [{ key: 'interviews' as const, label: 'Interviews', icon: MessageSquare }]
      : []),
    ...(showCandidates && canCorporateHrContinue
      ? [{ key: 'onboarding' as const, label: 'Onboarding', icon: ClipboardCheck }]
      : []),
  ];
  const defaultTab: TabKey =
    req.status === 'posted'
      ? showCandidates && req.drive  // wait for Drive to be ready before switching
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
    <div className="relative space-y-6">
      <BusyOverlay
        show={drivePhase !== 'idle'}
        variant={drivePhase === 'failed' ? 'error' : 'default'}
        label={
          drivePhase === 'done'
            ? 'Drive workspace ready!'
            : drivePhase === 'failed'
              ? 'Drive workspace setup failed'
              : 'Setting up Google Drive workspace…'
        }
        sublabel={
          drivePhase === 'done'
            ? 'Switching to recruitment view…'
            : drivePhase === 'failed'
              ? (req?.driveSetupError ??
                'This is taking longer than expected — the setup may not have completed.')
              : 'Creating folders and sharing CV collection link…'
        }
        action={
          drivePhase === 'failed'
            ? { label: 'Retry', onClick: retryDriveSetup }
            : undefined
        }
      />
      <Link
        to={backTo}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {backLabel}
      </Link>

      {/* Hero */}
      <div className="relative animate-rise-in overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold text-slate-900 sm:text-[1.35rem]">
                {req.designation}
              </h1>
              <RequisitionStatusBadge status={req.status} pipeline={req.pipeline} />
              <Badge tone={PRIORITY_TONE[req.priority]} dot>
                {PRIORITY_LABEL[req.priority]}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-slate-500">
              <span className="font-mono text-xs text-slate-400">{req.code}</span>
              <span className="text-slate-300">·</span>
              <span>{req.unitFactory}</span>
              <span className="text-slate-300">·</span>
              <span>{req.department}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
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
      </div>

      <EditRequisitionModal
        requisition={req}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        gradeHint={gradeLine}
      />

      {/* Workflow progress — the lifecycle at a glance, always visible */}
      <div
        className="animate-rise-in overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
        style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}
      >
        <CardBody>
          <WorkflowStepper status={req.status} pipeline={req.pipeline} />
        </CardBody>
      </div>

      {/* Lifecycle tabs */}
      <div
        ref={tabBarRef}
        className="relative flex flex-wrap gap-1 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-1.5 animate-rise-in"
        style={{ animationDelay: '110ms', animationFillMode: 'backwards' }}
      >
        <span
          className="absolute inset-y-1.5 z-0 rounded-xl bg-white shadow-sm transition-all duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
          aria-hidden
        />
        {tabs.map((t) => {
          const active = activeTab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              data-active={active}
              onClick={() => setTab(t.key)}
              className={cn(
                'relative z-10 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                active
                  ? 'text-brand-700'
                  : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div key={activeTab} className="animate-fade-in">
      {activeTab === 'details' && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
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
          </div>

          <div className="space-y-6">
            <FacilitiesPanel requisition={req} canEdit={canDecideFacilities} />

            <Card>
              <CardHeader>
                <CardTitle>C · Preferred Sources</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-1.5">
                  {req.preferredSources.length > 0 ? (
                    req.preferredSources.map((s) => (
                      <Badge key={s} tone="neutral">
                        {preferredSourceLabel(s)}
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
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="animate-rise-in">
            <ApprovalPanel requisition={req} />
          </div>
          <div className="animate-rise-in" style={{ animationDelay: '80ms' }}>
            <FacilitiesPanel requisition={req} canEdit={canDecideFacilities} />
          </div>
        </div>
      )}

      {activeTab === 'posting' && showProfile && (
        <div className="space-y-6">
          <RecruiterPanel requisition={req} canAssign={canAssignRecruiter} />
          <RoleProfilePanel
            requisition={req}
            canContinue={canCorporateHrContinue}
          />
          {showPosting && (
            <PostingPanel
              requisition={req}
              canContinue={canCorporateHrContinue}
              onPosting={() => setDrivePhase('working')}
            />
          )}
        </div>
      )}

      {activeTab === 'recruitment' && showCandidates && (
        <CandidatesPanel
          requisition={req}
          canManage={canCorporateHrContinue}
        />
      )}

      {activeTab === 'interviews' && showCandidates && canCorporateHrContinue && (
        <InterviewsPanel requisition={req} />
      )}

      {activeTab === 'assessment' && showCandidates && canCorporateHrContinue && (
        <AssessmentPanel requisition={req} />
      )}

      {activeTab === 'onboarding' && showCandidates && canCorporateHrContinue && (
        <OnboardingTab reqId={req.id} canManage={canCorporateHrContinue} />
      )}
      </div>
    </div>
  );
}

type TabKey =
  | 'details'
  | 'approvals'
  | 'posting'
  | 'recruitment'
  | 'interviews'
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
      <CardBody className="py-2">
        <dl className="divide-y divide-slate-100">
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
    <div className="flex items-center justify-between gap-4 rounded-lg px-1.5 py-2.5 transition-colors hover:bg-slate-50">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-700">{value}</dd>
    </div>
  );
}
