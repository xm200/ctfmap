import type { CompetitionRegistrationRequest, CompetitionRegistrationTicket, ReviewStatus } from '../types/admin';
import { apiRequest } from './client';

/** Creates a moderation ticket; it must not publish an event immediately. */
export function submit(payload: CompetitionRegistrationRequest): Promise<CompetitionRegistrationTicket> {
  return apiRequest<CompetitionRegistrationTicket>('/events/registrations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function list(signal?: AbortSignal): Promise<CompetitionRegistrationTicket[]> {
  return apiRequest<CompetitionRegistrationTicket[]>('/admin/registrations', { signal });
}

export function review(
  id: string,
  status: Exclude<ReviewStatus, 'pending'>,
  comment: string,
): Promise<CompetitionRegistrationTicket> {
  return apiRequest<CompetitionRegistrationTicket>(`/admin/registrations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  });
}
