/** Central registry of application route paths. */
export const ROUTES = {
  login: '/login',
  dashboard: '/',

  // Organogram (sanctioned seats)
  organogram: '/organogram',
  unitConfig: '/configuration/units',
  approvalPaths: '/configuration/approval-paths',
  /** Super-user-only system activity log. */
  activityLog: '/configuration/activity-log',
  accessControl: '/configuration/access',
  integrations: '/configuration/integrations',
  aiSettings: '/configuration/ai',
  aiProficiencyBank: '/configuration/ai-proficiency-bank',

  // Phase 1 · Manpower Requisition
  requisitions: '/requisitions',
  requisitionNew: '/requisitions/new',
  requisitionDetail: (id = ':id') => `/requisitions/${id}`,

  // Recruitment pipeline (Phase 2)
  candidates: '/candidates',
  talentPool: '/talent-pool',
  /** Public job-application page (no auth). */
  apply: (id = ':reqId') => `/apply/${id}`,
  /** Public careers listing — all open positions at DBL Group. */
  careers: '/careers',
  /** Public application status tracker — candidate enters email to check stage. */
  applyStatus: '/apply/status',
  /** Committee member's own interview marking. */
  myInterviews: '/my-interviews',
  assignedCandidates: '/assigned-candidates',
  /** Medical officer's clearance queue (Phase 5). */
  medical: '/medical',
  /** The Central Medical Officer's approval queue. */
  medicalApprovals: '/medical-approvals',
  /** Full-page onboarding workspace for a selected candidate. */
  onboardingManage: (candidateId = ':candidateId') =>
    `/onboarding/manage/${candidateId}`,
  /** Public onboarding / document-submission page (no auth). */
  onboarding: (token = ':token') => `/onboarding/${token}`,

  // AI HR Insights (ask-your-data, digest, bottlenecks)
  insights: '/insights',

  // People
  employees: '/employees',
  employeeDetail: (id = ':id') => `/employees/${id}`,

  // Board approval
  boardGroups: '/configuration/board-groups',
  /** Public board-member approval page (no auth). */
  boardVote: (token = ':token') => `/board-vote/${token}`,
  /** Head of Talent Acquisition's consolidated board-approval page. */
  approvalSheets: '/approval-sheets',
  /** Head of Talent Acquisition schedules and sends requested medical tests. */
  medicalRequests: '/medical-requests',
  /** Public Hiring Approval Sheet (no auth) — CHRO and board members. */
  boardSheet: (token = ':token') => `/board-sheet/${token}`,
  /** Public — Admin/IT recipient's facility-provisioning confirmation link. */
  facilityConfirm: (token = ':token') => `/facility-provisioning/${token}`,

  // System
  settings: '/settings',
  notifications: '/notifications',
} as const;
