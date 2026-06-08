/** Central registry of application route paths. */
export const ROUTES = {
  login: '/login',
  dashboard: '/',

  // Organogram (sanctioned seats)
  organogram: '/organogram',
  unitConfig: '/configuration/units',
  accessControl: '/configuration/access',
  integrations: '/configuration/integrations',

  // Phase 1 · Manpower Requisition
  requisitions: '/requisitions',
  requisitionNew: '/requisitions/new',
  requisitionDetail: (id = ':id') => `/requisitions/${id}`,

  // Recruitment pipeline (Phase 2)
  candidates: '/candidates',
  /** Public job-application page (no auth). */
  apply: (id = ':reqId') => `/apply/${id}`,

  // People
  employees: '/employees',
  employeeDetail: (id = ':id') => `/employees/${id}`,

  // System
  settings: '/settings',
  notifications: '/notifications',
} as const;
