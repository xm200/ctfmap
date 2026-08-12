import type { ReviewStatus } from '../types/admin';

type Status = ReviewStatus | 'active' | 'draft' | 'archived' | 'verified' | 'unverified' | 'banned';
const STATUS_LABELS: Record<Status, string> = { pending: 'ОЖИДАЕТ', approved: 'ОДОБРЕНО', rejected: 'ОТКЛОНЕНО', active: 'АКТИВНО', draft: 'ЧЕРНОВИК', archived: 'ОТМЕНЕНО', verified: 'ПОДТВЕРЖДЁН', unverified: 'НЕ ПОДТВЕРЖДЁН', banned: 'ЗАБЛОКИРОВАН' };
export function StatusIndicator({ status }: { status: Status }) {
  return <span className={`status-indicator status-indicator--${status}`}><i />{STATUS_LABELS[status]}</span>;
}
