import { Badge } from '@shared/components/ui';

import type { RequisitionStatus } from '../types/requisition.types';
import { STATUS_CONFIG } from '../constants';

export function RequisitionStatusBadge({
  status,
}: {
  status: RequisitionStatus;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge tone={config.tone} dot>
      {config.label}
    </Badge>
  );
}
