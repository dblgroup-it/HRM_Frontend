import { FullPageSpinner } from '@shared/components/ui';
import { useMyPermissions } from '@modules/rbac';
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
import { RequisitionQueue } from '../components/RequisitionQueue';
import { AssignedRequisitions } from '../components/AssignedRequisitions';
import { MyRecruitment } from '../components/MyRecruitment';

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();
  const { data: perms } = useMyPermissions();

  // Role held, not "may access" — a super user can open both medical pages but
  // these queues are not their work, and the dashboard is what is yours to do.
  const examines = holdsMedicalExaminerRole(perms);
  const approves = holdsCentralMedicalRole(perms);

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
        /* Two independent columns so neither side forces an empty gap.
           Left is the hiring pipeline — the requisitions themselves, which
           is what everyone comes here for. Right is the rail: what is
           personally yours to do today, then who has just joined. */
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(20rem,1fr)]">
          <div className="space-y-6">
            <RequisitionQueue
              requisitions={data.requisitions}
              runningCount={data.myRecruitment?.length ?? 0}
            />
            <DepartmentBreakdown departments={data.departments} />
          </div>

          <div className="space-y-6">
            {/* Yours to do, most pressing first. Each of these renders
                nothing when there is none, so the rail is short for people
                with no queue of their own rather than padded with empties. */}
            <AssignedRequisitions />
            {examines && <MedicalExamCard />}
            {approves && <MedicalApprovalCard enabled={approves} />}
            <MyRecruitment rows={data.myRecruitment ?? []} />
            <RecentHires hires={data.recentHires} />
          </div>
        </div>
      )}
    </div>
  );
}
