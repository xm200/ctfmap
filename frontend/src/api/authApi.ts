import { clearAccessToken, setAccessToken } from '../auth/tokenStore';
import type { AuthResponse, LoginRequest, RegisterRequest, Session } from '../types/admin';
import { apiRequest } from './client';

export async function login(identifier: string, password: string): Promise<Session> {
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
  try {
    await apiRequest<void>('/auth/logout', { method: 'POST', retryOnUnauthorized: false });
  } finally {
    clearAccessToken();
  }
}
