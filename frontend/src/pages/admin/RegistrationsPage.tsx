import { useEffect, useState } from 'react';
import * as registrationApi from '../../api/registrationApi';
import { EmptyPanel, InlineNotice, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { AiReview, CompetitionRegistrationTicket, ReviewStatus } from '../../types/admin';
import { CATEGORY_LABELS, FORMAT_LABELS } from '../../utils/labels';

const VERDICT_LABELS: Record<AiReview['verdict'], string> = { approve: 'ОДОБРИТЬ', review: 'НА ПРОВЕРКУ', reject: 'ОТКЛОНИТЬ' };
const VERDICT_COLORS: Record<AiReview['verdict'], string> = { approve: '#22c55e', review: '#eab308', reject: '#ef4444' };

function parseAiReview(raw?: string): AiReview | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as AiReview; } catch { return null; }
}

function AiReviewBlock({ raw }: { raw?: string }) {
  const review = parseAiReview(raw);
  if (!review) return null;
  return <div className="ticket-details" style={{ border: `1px solid ${VERDICT_COLORS[review.verdict]}33`, borderRadius: 6, padding: '12px 16px', marginTop: 8 }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      АНАЛИЗ ИИ
      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${VERDICT_COLORS[review.verdict]}22`, color: VERDICT_COLORS[review.verdict] }}>{VERDICT_LABELS[review.verdict]} ({Math.round(review.confidence * 100)}%)</span>
    </span>
    <p style={{ marginTop: 6 }}>{review.summary}</p>
    {review.suggestions?.length > 0 && <ul style={{ marginTop: 4, paddingLeft: 18 }}>{review.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>}
  </div>;
}
import { safeExternalUrl } from '../../utils/security';

export function RegistrationsPage() {
  const [tickets, setTickets] = useState<CompetitionRegistrationTicket[] | null>(null); const [filter, setFilter] = useState<ReviewStatus>('pending'); const [comments, setComments] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(''); const [notice, setNotice] = useState('');
  useEffect(() => { void registrationApi.list().then(setTickets); }, []);
  const review = async (ticket: CompetitionRegistrationTicket, status: 'approved' | 'rejected') => { const comment = comments[ticket.id] ?? ''; if (status === 'rejected' && !comment.trim()) { setNotice('Для отклонения требуется комментарий.'); return; } setBusy(ticket.id); setNotice(''); try { const next = await registrationApi.review(ticket.id, status, comment); setTickets((current) => current?.map((item) => item.id === next.id ? next : item) ?? null); setNotice(`Регистрация ${ticket.id.toUpperCase()} обработана.`); } finally { setBusy(''); } };
  const visible = tickets?.filter((item) => item.status === filter) ?? [];
  return <><PageHeader code="АДМИНИСТРАТОР / ЗАЯВКИ" title="Очередь заявок на соревнования" description="Модерация заявок организаторов на публикацию соревнований." />
    <div className="status-tabs">{(['pending', 'approved', 'rejected'] as ReviewStatus[]).map((status) => <button key={status} className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}><StatusIndicator status={status} /><b>{tickets?.filter((item) => item.status === status).length ?? 0}</b></button>)}</div>
    {notice && <InlineNotice kind={notice.includes('обработана') ? 'success' : 'error'}>{notice}</InlineNotice>}
    {!tickets ? <LoadingPanel /> : !visible.length ? <EmptyPanel title="Очередь пуста" text="Заявки с выбранным статусом отсутствуют." /> : <div className="ticket-list">{visible.map((ticket) => {
      const links = [
        ['ОФИЦИАЛЬНЫЙ САЙТ', ticket.url],
        ['РЕГИСТРАЦИЯ', ticket.registrationUrl],
        ['CTFТАЙМ', ticket.ctftimeUrl],
        ['НОВОСТИ CTF', ticket.ctfNewsUrl],
      ] as const;
      return <article className="ticket-card registration-card" key={ticket.id}><header><div><span>{ticket.id.toUpperCase()} // ЗАЯВКА НА СОРЕВНОВАНИЕ</span><h2>{ticket.title}</h2><p>{ticket.shortTitle ? `${ticket.shortTitle} // ` : ''}{ticket.organizer} // {ticket.contact}</p></div><StatusIndicator status={ticket.status} /></header><div className="ticket-grid registration-grid"><div><span>РАСПИСАНИЕ</span><b>{ticket.startDate} → {ticket.endDate}</b></div><div><span>ФОРМАТ / КЛАСС</span><b>{FORMAT_LABELS[ticket.format]}{ticket.category ? ` // ${CATEGORY_LABELS[ticket.category]}` : ''}{ticket.difficulty ? ` // ${ticket.difficulty}` : ''}</b></div><div><span>МЕСТО</span><b>{ticket.city}, {ticket.region}</b></div><div><span>РАЗМЕР КОМАНДЫ</span><b>{ticket.teamSize || 'НЕ УКАЗАН'}</b></div><div className="ticket-details"><span>ОПИСАНИЕ</span><p>{ticket.description}</p>{ticket.fullDescription && <p className="ticket-full-description">{ticket.fullDescription}</p>}</div>{ticket.taskCategories?.length ? <div className="ticket-details"><span>КАТЕГОРИИ ЗАДАНИЙ</span><p>{ticket.taskCategories.join(' · ')}</p></div> : null}{ticket.tags?.length ? <div className="ticket-details"><span>МЕТКИ</span><p>{ticket.tags.join(' · ')}</p></div> : null}{ticket.requirements?.length ? <div className="ticket-details"><span>ТРЕБОВАНИЯ</span><ul>{ticket.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></div> : null}<div className="ticket-details ticket-links"><span>ВНЕШНИЕ ССЫЛКИ</span>{links.map(([label, value]) => { const url = value ? safeExternalUrl(value) : null; return value && <span key={label}><b>{label}</b>{url ? <a href={url} target="_blank" rel="noopener noreferrer">ОТКРЫТЬ ↗</a> : <em>НЕКОРРЕКТНАЯ ССЫЛКА</em>}</span>; })}</div></div><AiReviewBlock raw={ticket.aiReview} /><label className="field"><span>КОММЕНТАРИЙ АДМИНИСТРАТОРА</span><textarea rows={3} value={comments[ticket.id] ?? ticket.comment ?? ''} onChange={(e) => setComments((current) => ({ ...current, [ticket.id]: e.target.value }))} disabled={ticket.status !== 'pending'} placeholder="Комментарий организатору..." /></label>{ticket.status === 'pending' && <footer><button className="button admin-button admin-button--approve" disabled={busy === ticket.id} onClick={() => review(ticket, 'approved')}>ОДОБРИТЬ И ОПУБЛИКОВАТЬ ✓</button><button className="button admin-button admin-button--reject" disabled={busy === ticket.id} onClick={() => review(ticket, 'rejected')}>ОТКЛОНИТЬ ×</button></footer>}</article>;
    })}</div>}
  </>;
}
