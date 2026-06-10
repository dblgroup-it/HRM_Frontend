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
          {/* New requisitions land here — kept top as the priority feed. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RequisitionQueue requisitions={data.requisitions} />
            </div>
            <OrganogramSnapshot summary={data.summary} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DepartmentBreakdown departments={data.departments} />
            </div>
            <RecentHires hires={data.recentHires} />
          </div>
        </>
      )}
    </div>
  );
}
