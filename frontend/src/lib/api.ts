import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    // Required for free ngrok tunnels: without this, browser GETs get an HTML
    // interstitial (ERR_NGROK_6024) with no CORS headers — shows up as "CORS error".
    'ngrok-skip-browser-warning': 'true',
  },
});

let accessToken: string | null = localStorage.getItem('bee3ly_access_token');

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('bee3ly_access_token', token);
  } else {
    localStorage.removeItem('bee3ly_access_token');
  }
  // Lazy import avoids circular dependency with features/realtime/socket
  void import('@/features/realtime/socket').then(
    ({ reconnectRealtimeWithToken }) => {
      reconnectRealtimeWithToken(token);
    },
  );
}

export function getAccessToken() {
  return accessToken;
}

/** Human-readable message from API/network errors (for toasts). */
export function getApiErrorMessage(err: unknown): string | null {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === 'string' && data.trim()) {
      const trimmed = data.trim();
      if (trimmed.startsWith('<!') || trimmed.includes('<html')) {
        const status = err.response?.status;
        return status
          ? `Server returned HTML (${status}) — check VITE_API_URL / ngrok tunnel.`
          : 'Server returned HTML — check VITE_API_URL / ngrok tunnel.';
      }
      return trimmed.slice(0, 600);
    }
    if (data && typeof data === 'object') {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) return msg.trim();
      if (Array.isArray(msg) && msg.length) {
        return msg.map(String).join(', ');
      }
      const errField = (data as { error?: unknown }).error;
      if (typeof errField === 'string' && errField.trim())
        return errField.trim();
    }
    if (err.message?.trim()) return err.message.trim();
    return null;
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return null;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

type RetryConfig = { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as
      (typeof error.config & RetryConfig) | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !String(original.url ?? '').includes('/auth/login') &&
      !String(original.url ?? '').includes('/auth/register') &&
      !String(original.url ?? '').includes('/auth/refresh')
    ) {
      original._retry = true;
      refreshPromise ??= api
        .post<{ accessToken: string }>('/auth/refresh')
        .then((res) => {
          setAccessToken(res.data.accessToken);
          return res.data.accessToken;
        })
        .catch(() => {
          setAccessToken(null);
          return null;
        })
        .finally(() => {
          refreshPromise = null;
        });

      const token = await refreshPromise;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);
