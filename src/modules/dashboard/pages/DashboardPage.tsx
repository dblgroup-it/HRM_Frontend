import { FullPageSpinner } from '@shared/components/ui';
import { useMyPermissions } from '@modules/rbac';
import { useMyDelegatedCandidates } from '@modules/assessment';
import {
  holdsCentralMedicalRole,
  holdsMedicalExaminerRole,
} from '@modules/onboarding';

import { useDashboard } from '../hooks/useDashboard';
import {
  MedicalApprovalCard,
  MedicalExamCard,
} from '../components/MedicalWorkCards';
import { StatsGrid } from '../components/StatsGrid';
import { DepartmentBreakdown } from '../components/DepartmentBreakdown';
import { RecentHires } from '../components/RecentHires';
import { OrganogramSnapshot } from '../components/OrganogramSnapshot';
import { RequisitionQueue } from '../components/RequisitionQueue';
import { AssignedRequisitions } from '../components/AssignedRequisitions';
import { MyRecruitment } from '../components/MyRecruitment';

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();
  const { data: perms } = useMyPermissions();
  // The same query "Interviews to run" runs, and therefore free: it decides
  // the shape of the page, so the page has to know before it lays out.
  const { data: delegated } = useMyDelegatedCandidates();

  // Role held, not "may access" — a super user can open both medical pages but
  // these queues are not their work, and the dashboard is what is yours to do.
  const examines = holdsMedicalExaminerRole(perms);
  const approves = holdsCentralMedicalRole(perms);

  /**
   * Does this person have work of their own on this page?
   *
   * Factory HR and the interviewers do: candidates to see, requisitions they
   * are recruiting or covering. For them the page leads with that and the
   * unit's news moves to the rail — a feed of requisitions somebody else
   * raised is not what they came for. For everyone else (Head of Talent
   * Acquisition, management) the feed IS the work, and the layout stays as
   * it was.
   */
  const hasOwnWork =
    (delegated?.length ?? 0) > 0 ||
    (data?.myRecruitment?.length ?? 0) > 0 ||
    examines ||
    approves;

  return (
    <div className="space-y-6">
      <StatsGrid stats={data?.stats} isLoading={isLoading} />

      {isLoading ? (
        <FullPageSpinner label="Loading dashboard…" />
      ) : isError || !data ? (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Failed to load dashboard data. Please try again.
        </p>
      ) : (
        /* Two independent columns so neither side forces an empty gap. */
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {/* Left (2/3) — what is yours to do, most pressing first. */}
          <div className="space-y-6 lg:col-span-2">
            {/* Whoever has candidates to interview sees them first: it is
                the only thing on this page that is theirs to do, and it was
                one nav click away behind a page most of them learned about
                from an email. Renders nothing when they have none. */}
            <AssignedRequisitions />
            {examines && <MedicalExamCard />}
            {approves && <MedicalApprovalCard enabled={approves} />}
            {/* Assigned to them, or handed over while a recruiter is away. */}
            <MyRecruitment rows={data.myRecruitment ?? []} />
            {!hasOwnWork && <RequisitionQueue requisitions={data.requisitions} />}
            <DepartmentBreakdown departments={data.departments} />
          </div>

          {/* Right (1/3) — the unit's news, then the reference figures.
              Workforce capacity sits at the bottom: it is a standing figure,
              not something anybody acts on today. */}
          <div className="space-y-6">
            {hasOwnWork && <RequisitionQueue requisitions={data.requisitions} />}
            <RecentHires hires={data.recentHires} />
            <OrganogramSnapshot summary={data.summary} />
          </div>
        </div>
      )}
    </div>
  );
}
