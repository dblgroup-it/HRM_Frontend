/** Central registry of application route paths. */
export const ROUTES = {
  login: '/login',
  dashboard: '/',

  // Organogram (sanctioned seats)
  organogram: '/organogram',
  unitConfig: '/configuration/units',
  accessControl: '/configuration/access',
  integrations: '/configuration/integrations',
  aiSettings: '/configuration/ai',

  // Phase 1 · Manpower Requisition
  requisitions: '/requisitions',
  requisitionNew: '/requisitions/new',
  requisitionDetail: (id = ':id') => `/requisitions/${id}`,

  // Recruitment pipeline (Phase 2)
  candidates: '/candidates',
  talentPool: '/talent-pool',
  /** Public job-application page (no auth). */
  apply: (id = ':reqId') => `/apply/${id}`,
  /** Committee member's own interview marking. */
  myInterviews: '/my-interviews',
  /** Medical officer's clearance queue (Phase 5). */
  medical: '/medical',
  /** Full-page onboarding workspace for a selected candidate. */
  onboardingManage: (candidateId = ':candidateId') =>
    `/onboarding/manage/${candidateId}`,
  /** Public onboarding / document-submission page (no auth). */
  onboarding: (token = ':token') => `/onboarding/${token}`,

  // People
  employees: '/employees',
  employeeDetail: (id = ':id') => `/employees/${id}`,

  // System
  settings: '/settings',
  notifications: '/notifications',
} as const;
