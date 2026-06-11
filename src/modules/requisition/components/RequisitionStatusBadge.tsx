import { Badge, type BadgeTone } from '@shared/components/ui';

import type {
  PipelineProgress,
  RequisitionStatus,
} from '../types/requisition.types';
import { STATUS_CONFIG } from '../constants';

/**
 * For a posted requisition the DB status stops at "posted", but the hire keeps
 * moving — so when pipeline progress is provided, show the live stage instead.
 */
function liveConfig(
  status: RequisitionStatus,
  pipeline?: PipelineProgress,
): { label: string; tone: BadgeTone } {
  if (status !== 'posted' || !pipeline) return STATUS_CONFIG[status];
  if (pipeline.onboarded) return { label: 'Onboarded', tone: 'success' };
  if (pipeline.inOnboarding) return { label: 'Onboarding', tone: 'brand' };
  if (pipeline.inAssessment) return { label: 'Assessment', tone: 'info' };
  if (pipeline.hasCandidates) return { label: 'Recruiting', tone: 'success' };
  return STATUS_CONFIG[status];
}

export function RequisitionStatusBadge({
  status,
  pipeline,
}: {
  status: RequisitionStatus;
  pipeline?: PipelineProgress;
}) {
  const config = liveConfig(status, pipeline);
  return (
    <Badge tone={config.tone} dot>
      {config.label}
    </Badge>
  );
}
