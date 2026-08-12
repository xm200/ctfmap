import { useEffect, useState } from 'react';
import * as registrationApi from '../../api/registrationApi';
import { EmptyPanel, InlineNotice, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { CompetitionRegistrationTicket, ReviewStatus } from '../../types/admin';
import { safeExternalUrl } from '../../utils/security';

export function RegistrationsPage() {
  const [tickets, setTickets] = useState<CompetitionRegistrationTicket[] | null>(null); const [filter, setFilter] = useState<ReviewStatus>('pending'); const [comments, setComments] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(''); const [notice, setNotice] = useState('');
  useEffect(() => { void registrationApi.list().then(setTickets); }, []);
  const review = async (ticket: CompetitionRegistrationTicket, status: 'approved' | 'rejected') => { const comment = comments[ticket.id] ?? ''; if (status === 'rejected' && !comment.trim()) { setNotice('Для отклонения требуется комментарий.'); return; } setBusy(ticket.id); setNotice(''); try { const next = await registrationApi.review(ticket.id, status, comment); setTickets((current) => current?.map((item) => item.id === next.id ? next : item) ?? null); setNotice(`Регистрация ${ticket.id.toUpperCase()} обработана.`); } finally { setBusy(''); } };
  const visible = tickets?.filter((item) => item.status === filter) ?? [];
  return <><PageHeader code="ADMIN / REGISTRATIONS" title="Event intake queue" description="Модерация заявок организаторов на публикацию соревнований." />
    <div className="status-tabs">{(['pending', 'approved', 'rejected'] as ReviewStatus[]).map((status) => <button key={status} className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}><StatusIndicator status={status} /><b>{tickets?.filter((item) => item.status === status).length ?? 0}</b></button>)}</div>
    {notice && <InlineNotice kind={notice.includes('обработана') ? 'success' : 'error'}>{notice}</InlineNotice>}
    {!tickets ? <LoadingPanel /> : !visible.length ? <EmptyPanel title="Очередь пуста" text="Заявки с выбранным статусом отсутствуют." /> : <div className="ticket-list">{visible.map((ticket) => {
      const links = [
        ['OFFICIAL SITE', ticket.url],
        ['REGISTRATION', ticket.registrationUrl],
        ['CTFTIME', ticket.ctftimeUrl],
        ['CTF NEWS', ticket.ctfNewsUrl],
      ] as const;
      return <article className="ticket-card registration-card" key={ticket.id}><header><div><span>{ticket.id.toUpperCase()} // EVENT INTAKE</span><h2>{ticket.title}</h2><p>{ticket.shortTitle ? `${ticket.shortTitle} // ` : ''}{ticket.organizer} // {ticket.contact}</p></div><StatusIndicator status={ticket.status} /></header><div className="ticket-grid registration-grid"><div><span>SCHEDULE</span><b>{ticket.startDate} → {ticket.endDate}</b></div><div><span>FORMAT / CLASS</span><b>{ticket.format.toUpperCase()}{ticket.category ? ` // ${ticket.category.toUpperCase()}` : ''}{ticket.difficulty ? ` // ${ticket.difficulty}` : ''}</b></div><div><span>LOCATION</span><b>{ticket.city}, {ticket.region}</b></div><div><span>TEAM SIZE</span><b>{ticket.teamSize || 'NOT SPECIFIED'}</b></div><div className="ticket-details"><span>DESCRIPTION</span><p>{ticket.description}</p>{ticket.fullDescription && <p className="ticket-full-description">{ticket.fullDescription}</p>}</div>{ticket.taskCategories?.length ? <div className="ticket-details"><span>TASK CATEGORIES</span><p>{ticket.taskCategories.join(' · ')}</p></div> : null}{ticket.tags?.length ? <div className="ticket-details"><span>TAGS</span><p>{ticket.tags.join(' · ')}</p></div> : null}{ticket.requirements?.length ? <div className="ticket-details"><span>REQUIREMENTS</span><ul>{ticket.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></div> : null}<div className="ticket-details ticket-links"><span>EXTERNAL LINKS</span>{links.map(([label, value]) => { const url = value ? safeExternalUrl(value) : null; return value && <span key={label}><b>{label}</b>{url ? <a href={url} target="_blank" rel="noopener noreferrer">OPEN ↗</a> : <em>INVALID URL</em>}</span>; })}</div></div><label className="field"><span>OPERATOR COMMENT</span><textarea rows={3} value={comments[ticket.id] ?? ticket.comment ?? ''} onChange={(e) => setComments((current) => ({ ...current, [ticket.id]: e.target.value }))} disabled={ticket.status !== 'pending'} placeholder="Комментарий организатору..." /></label>{ticket.status === 'pending' && <footer><button className="button admin-button admin-button--approve" disabled={busy === ticket.id} onClick={() => review(ticket, 'approved')}>APPROVE & PUBLISH ✓</button><button className="button admin-button admin-button--reject" disabled={busy === ticket.id} onClick={() => review(ticket, 'rejected')}>REJECT ×</button></footer>}</article>;
    })}</div>}
  </>;
}

