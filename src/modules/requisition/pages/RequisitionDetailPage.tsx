import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GitBranch,
  ListChecks,
  MessageSquare,
  Pencil,
  Rocket,
  Share2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { JobAnalysisCard } from '../components/JobAnalysisCard';
import { FacilitiesPanel } from '../components/FacilitiesPanel';
import {
  EMPLOYMENT_NATURE_LABEL,
  REQUIREMENT_LABEL,
  preferredSourceLabel,
  PRIORITY_LABEL,
  PRIORITY_TONE,
} from '../constants';
import {
  LifecycleTabs,
  type LifecycleTab,
} from '@shared/components/ui';
import { defaultRequisitionTab, type RequisitionTabKey } from '../defaultTab';

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
  const awaitingRaiser =
    req.approvalChain.some((s) => s.status === 'info_requested') ||
    // Factory HR handed it back before the chain started — same situation,
    // one stage earlier: it is the raiser's to amend and resend.
    Boolean(req.jobAnalysis?.returnedAt);
  const currentStep = req.approvalChain.find((s) => s.status === 'pending');
  const unitLower = req.unitFactory.toLowerCase();
  const holdsForUnit = (key: string) =>
    (perms?.roles ?? []).some(
      (r) =>
        r.key === key &&
        (r.unitId === null || (r.unitName ?? '').toLowerCase() === unitLower),
    );
  /**
   * The HR side owns the requisition as a document, at any stage.
   *
   * Head of Talent Acquisition / CHRO for the unit, the assigned recruiter
   * (or whoever is covering them) and the unit's Factory HR may correct a
   * wrong grade or a mistyped post count without bouncing the whole chain
   * back to the raiser. Every change they make is written into the activity
   * log, naming them and saying what moved — which is the whole reason it
   * can be allowed. Mirrors `requireEditAccess` on the server.
   */
  const ownsDocument =
    !!perms?.isSuperUser ||
    holdsForUnit('corporate_hr') ||
    holdsForUnit('chro') ||
    holdsForUnit('factory_hr') ||
    (!!myUserId &&
      (req.recruiter?.id === myUserId || req.cover?.id === myUserId));
  /** Whoever is holding it right now — their edit is part of the flow. */
  const holdsRequisition =
    (req.status === 'pending_approval' ||
      // Before the chain starts only a handed-back requisition is editable,
      // and only by the raiser — `awaitingRaiser` covers exactly that.
      (req.status === 'pending_job_analysis' &&
        Boolean(req.jobAnalysis?.returnedAt))) &&
    (awaitingRaiser
      ? !!myUserId && req.raisedById === myUserId
      : !!currentStep &&
        (currentStep.approverUserId
          ? currentStep.approverUserId === myUserId
          : (perms?.roles ?? []).some(
              (r) =>
                r.key === currentStep.role &&
                (r.unitId === null ||
                  (r.unitName ?? '').toLowerCase() === unitLower)
            )));
  const canEdit = ownsDocument || holdsRequisition;
  // Head of Talent Acquisition keeps access after assigning a recruiter — the recruiter is
  // added to it, not swapped in. The stand-in covering a recruiter on leave
  // counts as the recruiter here: the API lets them act on everything, and
  // without this they could open the requisition and find no lifecycle on it.
  const isAssignedRecruiter =
    !!myUserId &&
    (req.recruiter?.id === myUserId || req.cover?.id === myUserId);
  const canCorporateHrContinue =
    !!perms?.isSuperUser || isAssignedRecruiter || holdsForUnit('corporate_hr');
  // Facilities are provisioning commitments, so they are settled by the HR
  // side — Head of Talent Acquisition / CHRO / super and the assigned recruiter — not by
  // whichever approver currently holds the requisition.
  const canDecideFacilities = canAccessRecruitment(perms, req.unitFactory, {
    recruiterId: req.recruiter?.id,
    coverRecruiterId: req.cover?.id,
    myUserId,
  });
  // Only Head of Talent Acquisition / CHRO / super may nominate the recruiter.
  const canAssignRecruiter =
    !!perms?.isSuperUser || holdsForUnit('corporate_hr') || holdsForUnit('chro');
  // The candidate pipeline is visible only to Head of Talent Acquisition, CHRO & super users.
  const showCandidates =
    canAccessRecruitment(perms, req.unitFactory, {
      recruiterId: req.recruiter?.id,
      coverRecruiterId: req.cover?.id,
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

  /**
   * Everyone this requisition replaces, one line each.
   *
   * Reads the list the API now returns and falls back to the older single
   * fields, so a requisition raised before multi-replacement still shows its
   * person rather than an empty row. Each line carries that person's own
   * reason and vacancy date — an approver judging a three-seat requisition
   * needs to see three leavers, not one standing in for all of them.
   */
  const replacedPeople: string[] = (
    req.replacements?.length
      ? req.replacements
      : req.replaceOfName
        ? [
            {
              id: 'legacy',
              employeeName: req.replaceOfName,
              employeeCode: req.replaceOfEmployeeCode ?? null,
              separationReason: req.separationReason ?? null,
              vacantDate: req.vacantDate ?? null,
              remarks: req.replacementRemarks ?? null,
            },
          ]
        : []
  ).map((r) => {
    const who = r.employeeCode
      ? `${r.employeeName} (${r.employeeCode})`
      : r.employeeName;
    const detail = [
      r.separationReason,
      r.vacantDate ? `vacant from ${formatDate(r.vacantDate)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return detail ? `${who} — ${detail}` : who;
  });

  const vacancy: Row[] = [
    { label: 'Requirement', value: REQUIREMENT_LABEL[req.requirementType] },
    ...(req.alternateDesignations?.length
      ? [
          {
            label: 'Open at levels',
            value: [req.designation, ...req.alternateDesignations].join('\n'),
          },
        ]
      : []),
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
    ...(replacedPeople.length
      ? [
          {
            label:
              replacedPeople.length === 1
                ? 'Replacing'
                : `Replacing (${replacedPeople.length})`,
            value: replacedPeople.join('\n'),
          },
        ]
      : []),
    ...(replacedPeople.length === 0 && req.replacementRemarks
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

  // Lifecycle-ordered tabs (only the ones that apply to this requisition).
  const stats = req.candidateStats;
  const tabs: LifecycleTab<TabKey>[] = [
    { key: 'details', label: 'Details', icon: ClipboardList },
    // Section B and the files it refers to, straight after the vacancy they
    // are written from. Its own tab rather than a card at the foot of
    // Details: at the job-analysis stage it IS the work, and anything below
    // the fold reads as optional.
    {
      key: 'analysis',
      label: 'Job Analysis',
      icon: FileText,
      count: req.attachments?.length,
    },
    { key: 'approvals', label: 'Approvals', icon: GitBranch },
    ...(showProfile
      ? [{ key: 'posting' as const, label: 'Profile & Posting', icon: Rocket }]
      : []),
    ...(showCandidates
      ? [
          {
            key: 'recruitment' as const,
            label: 'Recruitment',
            icon: Users,
            count: stats?.total,
          },
        ]
      : []),
    ...(showCandidates && canCorporateHrContinue
      ? [{ key: 'assessment' as const, label: 'Assessment', icon: ListChecks }]
      : []),
    ...(showCandidates && canCorporateHrContinue
      ? [
          {
            key: 'interviews' as const,
            label: 'Interviews',
            icon: MessageSquare,
            // Exactly what the tab opens on: the panel lists candidates at
            // the interview stage. It used to add the final-stage ones too,
            // so a requisition down to its last candidate read "Interviews 1"
            // and opened on "0 candidates at interview stage".
            count: stats?.interview ?? 0,
          },
        ]
      : []),
    ...(showCandidates && canCorporateHrContinue
      ? [
          {
            key: 'onboarding' as const,
            label: 'Onboarding',
            icon: ClipboardCheck,
            count: stats?.selected,
          },
        ]
      : []),
  ];
  // Posted requisitions open where the hiring is — see defaultTab.ts.
  const defaultTab = defaultRequisitionTab({
    status: req.status,
    driveReady: Boolean(req.drive),
    stats,
    available: tabs.map((t) => t.key),
  });
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
                {/* Every level this post is open at — the one a candidate is
                    hired at is fixed during onboarding. */}
                {req.designationLabel ||
                  [req.designation, ...(req.alternateDesignations ?? [])].join(
                    ' / ',
                  )}
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
            {/* A posted vacancy has a public link, and the people asked about
                it are as often the unit's own HR as the recruiters — so the
                link sits here, on the requisition, not inside the candidate
                pipeline they cannot open. */}
            {req.status === 'posted' && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Share2 className="h-4 w-4" />}
                title="Copy the public application link"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/apply/${req.id}`,
                  );
                  toast.success('Job link copied — share it wherever you like');
                }}
              >
                Share job link
              </Button>
            )}
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
      <LifecycleTabs tabs={tabs} active={activeTab} onChange={setTab} />

      {/* Tab content */}
      <div key={activeTab} className="animate-fade-in">
      {activeTab === 'details' && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <DetailCard title="A · Vacancy Information" rows={vacancy} />
          </div>

          <div className="space-y-6">
            <FacilitiesPanel requisition={req} canEdit={canDecideFacilities} />

            {/* Nobody picks sources any more — a posted requisition goes to
                the career page — so this is only shown where an older
                requisition actually recorded some. */}
            {req.preferredSources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Preferred sources (as raised)</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="flex flex-wrap gap-1.5">
                    {req.preferredSources.map((s) => (
                      <Badge key={s} tone="neutral">
                        {preferredSourceLabel(s)}
                      </Badge>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <JobAnalysisCard requisition={req} />
          {/* The vacancy it is written from, beside it rather than a tab
              away — section B is a reading of section A. */}
          <DetailCard title="A · Vacancy Information" rows={vacancy} />
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

type TabKey = RequisitionTabKey;

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
  // A row can now hold several lines — every level a post is open at, every
  // person it replaces. `items-start` keeps the label against the first line
  // instead of floating to the middle of a tall value.
  const multiline = value.includes('\n');
  return (
    <div
      className={cn(
        'flex justify-between gap-4 rounded-lg px-1.5 py-2.5 transition-colors hover:bg-slate-50',
        multiline ? 'items-start' : 'items-center',
      )}
    >
      <dt className="shrink-0 text-xs text-slate-400">{label}</dt>
      <dd
        className={cn(
          'text-right text-sm font-medium text-slate-700',
          multiline && 'whitespace-pre-line leading-relaxed',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
