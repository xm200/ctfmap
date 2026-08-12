import type { User, UserUpdate } from '../types/admin';
import { apiRequest } from './client';

export function list(signal?: AbortSignal): Promise<User[]> {
  return apiRequest<User[]>('/admin/users', { signal });
}

export function get(id: string, signal?: AbortSignal): Promise<User> {
  return apiRequest<User>(`/admin/users/${encodeURIComponent(id)}`, { signal });
}

export function update(id: string, payload: UserUpdate): Promise<User> {
  return apiRequest<User>(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
