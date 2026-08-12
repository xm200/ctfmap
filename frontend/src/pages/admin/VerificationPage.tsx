import { useEffect, useState } from 'react';
import * as verificationApi from '../../api/verificationApi';
import { EmptyPanel, InlineNotice, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { ReviewStatus, VerificationTicket } from '../../types/admin';

export function VerificationPage() {
  const [tickets, setTickets] = useState<VerificationTicket[] | null>(null); const [filter, setFilter] = useState<ReviewStatus>('pending'); const [comments, setComments] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(''); const [notice, setNotice] = useState('');
  useEffect(() => { void verificationApi.list().then(setTickets); }, []);
  const review = async (ticket: VerificationTicket, status: 'approved' | 'rejected') => { const comment = comments[ticket.id] ?? ''; if (status === 'rejected' && !comment.trim()) { setNotice('Для отклонения укажите причину или контактную информацию.'); return; } setBusy(ticket.id); setNotice(''); try { const next = await verificationApi.review(ticket.id, status, comment); setTickets((current) => current?.map((item) => item.id === next.id ? next : item) ?? null); setNotice(`Заявка ${ticket.id.toUpperCase()} обработана.`); } finally { setBusy(''); } };
  const visible = tickets?.filter((item) => item.status === filter) ?? [];
  return <><PageHeader code="ADMIN / VERIFICATION" title="Identity verification" description="Проверка данных участников и управление уровнем доверия." />
    <div className="status-tabs">{(['pending', 'approved', 'rejected'] as ReviewStatus[]).map((status) => <button key={status} className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}><StatusIndicator status={status} /><b>{tickets?.filter((item) => item.status === status).length ?? 0}</b></button>)}</div>
    {notice && <InlineNotice kind={notice.includes('обработана') ? 'success' : 'error'}>{notice}</InlineNotice>}
    {!tickets ? <LoadingPanel /> : !visible.length ? <EmptyPanel title="Очередь пуста" text="Для этого статуса заявки отсутствуют." /> : <div className="ticket-list">{visible.map((ticket) => <article className="ticket-card" key={ticket.id}><header><div><span>{ticket.id.toUpperCase()}</span><h2>{ticket.user.username}</h2><p>{ticket.user.email}</p></div><StatusIndicator status={ticket.status} /></header><div className="ticket-grid"><div><span>SUBMITTED</span><b>{new Date(ticket.submittedAt).toLocaleString('ru-RU')}</b></div><div><span>CONTACT</span><b>{ticket.contact}</b></div><div className="ticket-details"><span>PROVIDED DATA</span><p>{ticket.details}</p></div></div><label className="field"><span>REASON / CONTACT INFORMATION</span><textarea rows={3} value={comments[ticket.id] ?? ticket.comment ?? ''} onChange={(e) => setComments((current) => ({ ...current, [ticket.id]: e.target.value }))} disabled={ticket.status !== 'pending'} placeholder="Обязательно при отклонении заявки..." /></label>{ticket.status === 'pending' && <footer><button className="button admin-button admin-button--approve" disabled={busy === ticket.id} onClick={() => review(ticket, 'approved')}>APPROVE ✓</button><button className="button admin-button admin-button--reject" disabled={busy === ticket.id} onClick={() => review(ticket, 'rejected')}>REJECT ×</button></footer>}</article>)}</div>}
  </>;
}
