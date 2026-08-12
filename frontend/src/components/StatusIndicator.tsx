import type { ReviewStatus } from '../types/admin';

type Status = ReviewStatus | 'active' | 'draft' | 'archived' | 'verified' | 'unverified';
export function StatusIndicator({ status }: { status: Status }) {
  return <span className={`status-indicator status-indicator--${status}`}><i />{status.toUpperCase()}</span>;
}
