import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { ENV, STORAGE_KEYS } from '@shared/constants';

/**
 * Pre-configured Axios instance.
 *
 * Even while the app runs on the mock API layer, this client is the single
 * place to swap in the real backend — flip `VITE_USE_MOCK_API` to `false`
 * and the module API services will route through here instead.
 */
export const httpClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

/** Attach the bearer token (if present) to every outgoing request. */
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = readToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** Normalize errors and handle 401 globally. */
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
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
}

function normalizeError(error: unknown): NormalizedError {
  if (axios.isAxiosError(error)) {
    return {
      status: error.response?.status,
      message:
        (error.response?.data as { message?: string })?.message ??
        error.message ??
        'Unexpected network error',
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
