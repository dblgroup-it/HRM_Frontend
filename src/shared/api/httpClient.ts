import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { AUTH_UNAUTHORIZED_EVENT, ENV, STORAGE_KEYS } from '@shared/constants';

import { tokenExpired } from './tokenExpiry';

/** Login attempts return 401 on bad credentials — that's not a dead session. */
// Signed-out requests whose 401 means "wrong answer", not "session over".
const AUTH_ATTEMPT_PATHS = ['/auth/login', '/auth/login/2fa', '/auth/password/'];

const DEFAULT_TIMEOUT_MS = 15_000;
const WRITE_TIMEOUT_MS = 120_000;

/**
 * Pre-configured Axios instance.
 *
 * Even while the app runs on the mock API layer, this client is the single
 * place to swap in the real backend — flip `VITE_USE_MOCK_API` to `false`
 * and the module API services will route through here instead.
 */
export const httpClient: AxiosInstance = axios.create({
  baseURL: ENV.API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: DEFAULT_TIMEOUT_MS,
});

/** Attach the bearer token (if present) to every outgoing request. */
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Reads stay at the 15 s default. A save, upload or send may well be
    // slower — a Drive upload, a PDF letter rendered and emailed — and
    // giving up on it at 15 s did not stop it: the server finished anyway,
    // the screen said it failed, and the retry did it twice. Two minutes,
    // under nginx's 180 s, unless the call asked for its own limit.
    const method = (config.method ?? 'get').toLowerCase();
    if (method !== 'get' && config.timeout === DEFAULT_TIMEOUT_MS) {
      config.timeout = WRITE_TIMEOUT_MS;
    }
    const token = readToken();
    // A session that expired while the tab sat open overnight ends here,
    // without a request the server would only refuse (and the console
    // would list in red).
    if (token && tokenExpired(token)) {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      return Promise.reject(
        new axios.Cancel('Your session has expired. Please sign in again.'),
      );
    }
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** Normalize errors and handle 401 globally — an expired/invalid token
 * ends the session immediately instead of leaving a broken authenticated
 * shell up until the next manual refresh. */
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? '';
      const isLoginAttempt = AUTH_ATTEMPT_PATHS.some((p) => url.includes(p));
      if (!isLoginAttempt) {
        localStorage.removeItem(STORAGE_KEYS.AUTH);
        window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

function readToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

export interface NormalizedError {
  message: string;
  status?: number;
  /** The server's machine-readable reason, when it gave one (e.g. EMAIL_NOT_VERIFIED). */
  code?: string;
}

function normalizeError(error: unknown): NormalizedError {
  // Our limit ran out, not the server's: it may well still finish.
  if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
    return {
      message:
        'This is taking longer than usual and may still finish. Refresh in a minute to check before trying again.',
    };
  }
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; code?: unknown } | undefined;
    return {
      status: error.response?.status,
      message: data?.message ?? error.message ?? 'Unexpected network error',
      ...(typeof data?.code === 'string' && { code: data.code }),
    };
  }
  return { message: 'Unexpected error' };
}

/** Thin typed wrappers so module services read cleanly. */
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.get<T>(url, config).then((r) => r.data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    httpClient.post<T>(url, body, config).then((r) => r.data),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    httpClient.put<T>(url, body, config).then((r) => r.data),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    httpClient.patch<T>(url, body, config).then((r) => r.data),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.delete<T>(url, config).then((r) => r.data),
};
