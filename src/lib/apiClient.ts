import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 60000,
});

// Request Interceptor: inject Bearer token from storage if present as fallback
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token =
        localStorage.getItem('vigilens_access_token') ||
        localStorage.getItem('access_token');
      if (token && config.headers && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: handle 401 unauthenticated
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string | any[]; message?: string }>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vigilens_access_token');
        localStorage.removeItem('access_token');
        if (
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')
        ) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const d = data as Record<string, unknown>;

  if (Array.isArray(d.detail)) {
    const messages = d.detail.map((err: { loc?: string[]; msg?: string }) => {
      const field = err.loc?.filter((l) => l !== 'body').pop() ?? '';
      const msg = err.msg ?? '';
      const label = field
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());
      return label ? `${label}: ${msg}` : msg;
    });
    return messages.join('\n');
  }

  if (typeof d.detail === 'string') return d.detail;
  if (typeof d.message === 'string') return d.message;

  return fallback;
}

export function handleApiError(error: any, fallbackMessage: string = 'Operation failed'): never {
  const msg = parseApiError(error?.response?.data, error?.message || fallbackMessage);
  toast.error(msg);
  throw error;
}

export function getMediaCropUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const backendHost = API_BASE_URL.replace('/api/v1', '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendHost}${cleanPath}`;
}
