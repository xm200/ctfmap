import type { AdminEvent, EventUpdate } from '../types/admin';
import { apiRequest } from './client';

export function list(signal?: AbortSignal): Promise<AdminEvent[]> {
  return apiRequest<AdminEvent[]>('/admin/events', { signal });
}

export function get(id: string, signal?: AbortSignal): Promise<AdminEvent> {
  return apiRequest<AdminEvent>(`/admin/events/${encodeURIComponent(id)}`, { signal });
}

export function update(id: string, payload: EventUpdate): Promise<AdminEvent> {
  return apiRequest<AdminEvent>(`/admin/events/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...payload,
      tags: payload.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    }),
  });
}

export function cancel(id: string): Promise<AdminEvent> {
  return apiRequest<AdminEvent>(`/admin/events/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' });
}
