import { clearAccessToken, setAccessToken } from '../auth/tokenStore';
import type { AuthResponse, LoginRequest, RegisterRequest, Session } from '../types/admin';
import { apiRequest } from './client';

const TEST_ADMIN_SESSION_KEY = 'ctfmap:test-admin-session';
const TEST_ADMIN_TOKEN = 'ctfmap-local-test-admin';
const TEST_ADMIN_SESSION: Session = {
  user: {
    id: 'test-admin',
    username: 'admin',
    email: 'admin@ctfmap.local',
    role: 'admin',
    verified: true,
    createdAt: '2026-08-12T00:00:00.000Z',
  },
};

function hasTestAdminSession(): boolean {
  try {
    return window.sessionStorage.getItem(TEST_ADMIN_SESSION_KEY) === 'active';
  } catch {
    return false;
  }
}

function setTestAdminSession(active: boolean): void {
  try {
    if (active) window.sessionStorage.setItem(TEST_ADMIN_SESSION_KEY, 'active');
    else window.sessionStorage.removeItem(TEST_ADMIN_SESSION_KEY);
  } catch {
    // Авторизация всё равно работает в текущем состоянии React, даже если storage недоступен.
  }
}

export async function login(identifier: string, password: string): Promise<Session> {
  if (identifier === 'admin' && password === 'admin') {
    setTestAdminSession(true);
    setAccessToken(TEST_ADMIN_TOKEN);
    return TEST_ADMIN_SESSION;
  }

  setTestAdminSession(false);
  const payload: LoginRequest = { identifier, password };
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
    retryOnUnauthorized: false,
  });
  setAccessToken(response.accessToken);
  return response.session;
}

export async function register(payload: RegisterRequest): Promise<void> {
  await apiRequest<void>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
    retryOnUnauthorized: false,
  });
}

export async function getSession(): Promise<Session | null> {
  if (hasTestAdminSession()) {
    setAccessToken(TEST_ADMIN_TOKEN);
    return TEST_ADMIN_SESSION;
  }

  try {
    const response = await apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
      auth: false,
      retryOnUnauthorized: false,
    });
    setAccessToken(response.accessToken);
    return response.session;
  } catch (reason) {
    clearAccessToken();
    const status = typeof reason === 'object' && reason !== null && 'status' in reason
      ? Number(reason.status)
      : 0;
    if (status === 401 || status === 403) return null;
    throw reason;
  }
}

export async function logout(): Promise<void> {
  if (hasTestAdminSession()) {
    setTestAdminSession(false);
    clearAccessToken();
    return;
  }

  try {
    await apiRequest<void>('/auth/logout', { method: 'POST', retryOnUnauthorized: false });
  } finally {
    clearAccessToken();
  }
}
