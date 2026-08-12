import type { PasswordChangeRequest, ProfileUpdate, User } from '../types/admin';
import { apiRequest } from './client';

/** Self-service endpoints. The server must authorize these against the JWT subject. */
export function get(signal?: AbortSignal): Promise<User> {
  return apiRequest<User>('/users/me', { signal });
}

export function update(payload: ProfileUpdate): Promise<User> {
  return apiRequest<User>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload: PasswordChangeRequest): Promise<void> {
  return apiRequest<void>('/users/me/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
