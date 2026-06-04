/** Environment-derived constants. */
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api',
  USE_MOCK_API: (import.meta.env.VITE_USE_MOCK_API ?? 'true') === 'true',
} as const;

/** localStorage keys, namespaced to avoid collisions. */
export const STORAGE_KEYS = {
  AUTH: 'hrm.auth',
} as const;

export const APP_META = {
  name: 'DBL HRM',
  fullName: 'DBL HR Management System',
  company: 'DBL Group',
} as const;

/** Simulated network latency (ms) for the mock API layer. */
export const MOCK_LATENCY = 600;
