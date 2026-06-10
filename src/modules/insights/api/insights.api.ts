import { http } from '@shared/api';
import type { ApiResponse } from '@shared/types';

export interface DigestResult {
  summary: string;
  stats: {
    newRequisitions: number;
    newCandidates: number;
    approvalActions: Record<string, number>;
  };
  generatedAt: string;
}

export interface BottleneckMetrics {
  openRequisitions: number;
  avgDaysOpen: number;
  stuckRequisitions: {
    code: string;
    designation: string;
    unit: string;
    waitingOn: string;
    daysWaiting: number;
  }[];
  funnel: { stage: string; count: number }[];
  conversion: {
    appliedToInterviewPct: number;
    appliedToSelectedPct: number;
    totalCandidates: number;
  };
  avgTimeToFillDays: number | null;
  hires: number;
}

export interface BottleneckResult {
  metrics: BottleneckMetrics;
  summary: string;
  generatedAt: string;
}

const SLOW = { timeout: 90_000 };

export const insightsApi = {
  status: (): Promise<{ aiConfigured: boolean }> =>
    http
      .get<ApiResponse<{ aiConfigured: boolean }>>('/insights/status')
      .then((r) => r.data),

  ask: (question: string): Promise<{ answer: string }> =>
    http
      .post<ApiResponse<{ answer: string }>>('/insights/ask', { question }, SLOW)
      .then((r) => r.data),

  digest: (): Promise<DigestResult> =>
    http.get<ApiResponse<DigestResult>>('/insights/digest', SLOW).then((r) => r.data),

  bottlenecks: (): Promise<BottleneckResult> =>
    http
      .get<ApiResponse<BottleneckResult>>('/insights/bottlenecks', SLOW)
      .then((r) => r.data),
};
