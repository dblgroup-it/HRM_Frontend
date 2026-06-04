import type { ID, ISODateString } from '@shared/types';

export type JobStatus = 'open' | 'on_hold' | 'closed';
export type PipelineStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired';

export interface JobOpening {
  id: ID;
  title: string;
  department: string;
  location: string;
  type: string;
  applicants: number;
  status: JobStatus;
  postedAt: ISODateString;
}

export interface Candidate {
  id: ID;
  name: string;
  role: string;
  stage: PipelineStage;
  appliedAt: ISODateString;
  avatarUrl?: string | null;
}

export interface RecruitmentData {
  openings: JobOpening[];
  candidates: Candidate[];
}
