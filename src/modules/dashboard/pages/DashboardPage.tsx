import { Download } from 'lucide-react';

import { Button, PageHeader, FullPageSpinner } from '@shared/components/ui';
import { useAuth } from '@modules/auth';

import { useDashboard } from '../hooks/useDashboard';
import { StatsGrid } from '../components/StatsGrid';
import { DepartmentBreakdown } from '../components/DepartmentBreakdown';
import { RecentHires } from '../components/RecentHires';
import { OrganogramSnapshot } from '../components/OrganogramSnapshot';
import { RequisitionQueue } from '../components/RequisitionQueue';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Live snapshot across workforce, organogram, and requisition flow."
        actions={
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
            Export snapshot
          </Button>
        }
      />

      <StatsGrid stats={data?.stats} isLoading={isLoading} />

      {isLoading ? (
        <FullPageSpinner label="Loading dashboard…" />
      ) : isError || !data ? (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Failed to load dashboard data. Please try again.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DepartmentBreakdown departments={data.departments} />
            </div>
            <OrganogramSnapshot summary={data.summary} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentHires hires={data.recentHires} />
            <RequisitionQueue requisitions={data.requisitions} />
          </div>
        </>
      )}
    </div>
  );
}
