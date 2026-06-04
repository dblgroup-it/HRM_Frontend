import { Badge, type BadgeTone } from '@shared/components/ui';

import type { EmploymentStatus } from '../types/employee.types';

const MAP: Record<EmploymentStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  on_leave: { label: 'On Leave', tone: 'warning' },
  probation: { label: 'Probation', tone: 'info' },
  inactive: { label: 'Inactive', tone: 'neutral' },
};

export function EmployeeStatusBadge({ status }: { status: EmploymentStatus }) {
  const config = MAP[status];
  return (
    <Badge tone={config.tone} dot>
      {config.label}
    </Badge>
  );
}
