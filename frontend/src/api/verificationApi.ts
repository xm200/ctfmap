import type { ReviewStatus, VerificationTicket } from '../types/admin';
import { apiRequest } from './client';

export function list(signal?: AbortSignal): Promise<VerificationTicket[]> {
  return apiRequest<VerificationTicket[]>('/admin/verification', { signal });
}

export function review(
  id: string,
  status: Exclude<ReviewStatus, 'pending'>,
  comment: string,
): Promise<VerificationTicket> {
  return apiRequest<VerificationTicket>(`/admin/verification/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  });
}
