import { MOCK_LATENCY } from '@shared/constants';
import { delay } from '@shared/utils';

import type { RecruitmentData } from '../types/recruitment.types';

const MOCK_DATA: RecruitmentData = {
  openings: [
    {
      id: 'job_1',
      title: 'Senior Backend Engineer',
      department: 'IT & Systems',
      location: 'Dhaka HQ',
      type: 'Full-time',
      applicants: 48,
      status: 'open',
      postedAt: '2026-05-18',
    },
    {
      id: 'job_2',
      title: 'Production Line Manager',
      department: 'Production',
      location: 'Gazipur Plant',
      type: 'Full-time',
      applicants: 32,
      status: 'open',
      postedAt: '2026-05-21',
    },
    {
      id: 'job_3',
      title: 'HR Business Partner',
      department: 'Human Resources',
      location: 'Dhaka HQ',
      type: 'Full-time',
      applicants: 21,
      status: 'on_hold',
      postedAt: '2026-05-10',
    },
    {
      id: 'job_4',
      title: 'Financial Analyst',
      department: 'Finance',
      location: 'Dhaka HQ',
      type: 'Contract',
      applicants: 17,
      status: 'open',
      postedAt: '2026-05-28',
    },
  ],
  candidates: [
    { id: 'c1', name: 'Shahriar Kabir', role: 'Senior Backend Engineer', stage: 'applied', appliedAt: '2026-06-01' },
    { id: 'c2', name: 'Maliha Noor', role: 'Senior Backend Engineer', stage: 'screening', appliedAt: '2026-05-29' },
    { id: 'c3', name: 'Rezaul Karim', role: 'Production Line Manager', stage: 'interview', appliedAt: '2026-05-27' },
    { id: 'c4', name: 'Tahmina Akhtar', role: 'HR Business Partner', stage: 'offer', appliedAt: '2026-05-24' },
    { id: 'c5', name: 'Jubayer Alam', role: 'Financial Analyst', stage: 'applied', appliedAt: '2026-06-02' },
    { id: 'c6', name: 'Sanjida Haque', role: 'Senior Backend Engineer', stage: 'interview', appliedAt: '2026-05-26' },
    { id: 'c7', name: 'Nabil Rahman', role: 'Production Line Manager', stage: 'screening', appliedAt: '2026-05-30' },
    { id: 'c8', name: 'Ishrat Jahan', role: 'HR Business Partner', stage: 'hired', appliedAt: '2026-05-12' },
  ],
};

export const recruitmentApi = {
  // No backend recruitment endpoint yet — always serve mock pipeline data.
  getData(): Promise<RecruitmentData> {
    return delay(MOCK_LATENCY).then(() => MOCK_DATA);
  },
};
