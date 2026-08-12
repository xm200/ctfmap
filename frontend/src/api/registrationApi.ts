import type { CompetitionRegistrationTicket, ReviewStatus } from '../types/admin';
import { apiRequest } from './client';

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
