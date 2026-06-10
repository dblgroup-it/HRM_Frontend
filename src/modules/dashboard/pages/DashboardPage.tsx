import { FullPageSpinner } from '@shared/components/ui';

import { useDashboard } from '../hooks/useDashboard';
import { StatsGrid } from '../components/StatsGrid';
import { DepartmentBreakdown } from '../components/DepartmentBreakdown';
import { RecentHires } from '../components/RecentHires';
import { OrganogramSnapshot } from '../components/OrganogramSnapshot';
import { RequisitionQueue } from '../components/RequisitionQueue';

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

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
