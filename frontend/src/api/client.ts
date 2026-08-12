import { clearAccessToken, getAccessToken, setAccessToken } from '../auth/tokenStore';
import type { ApiError, RefreshResponse } from '../types/admin';

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE = (configuredBase || '/api').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 15_000;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
let refreshPromise: Promise<boolean> | null = null;

interface ApiRequestOptions extends RequestInit {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

function requestHeaders(init: ApiRequestOptions, token: string | null): Headers {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!SAFE_METHODS.has((init.method ?? 'GET').toUpperCase())) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }
  return headers;
}

async function parseError(response: Response): Promise<ApiError> {
  const fallback = response.status >= 500
    ? 'Сервис временно недоступен.'
    : 'Запрос не выполнен.';
  try {
    const body = await response.json() as Partial<ApiError> & { detail?: string };
    return {
      status: response.status,
      message: typeof body.message === 'string' && body.message.trim()
        ? body.message
        : typeof body.detail === 'string' && body.detail.trim() ? body.detail : fallback,
      code: typeof body.code === 'string' ? body.code : undefined,
      field: typeof body.field === 'string' ? body.field : undefined,
      details: body.details && typeof body.details === 'object' ? body.details : undefined,
    };
  } catch {
    return { status: response.status, message: fallback };
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          cache: 'no-store',
          referrerPolicy: 'same-origin',
        });
        if (!response.ok) {
          clearAccessToken();
          return false;
        }
        const body = await response.json() as RefreshResponse;
        if (!body.accessToken) {
          clearAccessToken();
          return false;
        }
        setAccessToken(body.accessToken);
        return true;
      } catch {
        clearAccessToken();
        return false;
      }
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!path.startsWith('/')) throw new Error('Путь программного интерфейса должен начинаться с /.');
  const { auth = true, retryOnUnauthorized = true, signal, ...init } = options;
  const controller = new AbortController();
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });

  try {
    const token = auth ? getAccessToken() : null;
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: requestHeaders(init, token),
      signal: controller.signal,
      cache: 'no-store',
      referrerPolicy: 'same-origin',
    });

    if (response.status === 401 && auth && retryOnUnauthorized && await refreshAccessToken()) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
    if (!response.ok) throw await parseError(response);
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (reason) {
    if (controller.signal.aborted) {
      if (!timedOut && signal?.aborted) throw reason;
      throw { status: 0, message: 'Время ожидания запроса истекло.' } satisfies ApiError;
    }
    throw reason;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
