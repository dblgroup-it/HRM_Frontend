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
import { OrganogramSnapshot } from '../components/OrganogramSnapshot';
import { RequisitionQueue } from '../components/RequisitionQueue';
import { AssignedRequisitions } from '../components/AssignedRequisitions';

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
        <>
          {/* Two independent columns so neither side forces an empty gap. */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            {/* Left (2/3): the priority feed + department breakdown */}
            <div className="space-y-6 lg:col-span-2">
              {/* Medical work first for whoever owns it — the queue they are
                  responsible for, above the general feed. Everything else on
                  the dashboard stays exactly as it is for everyone. */}
              {/* Whoever has candidates to interview sees them first — it
                  is the only thing on this page that is theirs to do, and it
                  was one nav click away behind a page most of them learned
                  about from an email. Renders nothing when they have none. */}
              <AssignedRequisitions />
              {examines && <MedicalExamCard />}
              {approves && <MedicalApprovalCard enabled={approves} />}
              <RequisitionQueue requisitions={data.requisitions} />
              <DepartmentBreakdown departments={data.departments} />
            </div>
            {/* Right (1/3): capacity + recent hires */}
            <div className="space-y-6">
              <OrganogramSnapshot summary={data.summary} />
              <RecentHires hires={data.recentHires} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
