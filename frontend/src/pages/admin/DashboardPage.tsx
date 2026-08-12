import { useEffect, useState } from 'react';
import * as eventsApi from '../../api/eventsApi';
import * as usersApi from '../../api/usersApi';
import * as registrationApi from '../../api/registrationApi';
import { LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { AdminEvent, CompetitionRegistrationTicket, User } from '../../types/admin';

export function DashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [data, setData] = useState<{ events: AdminEvent[]; users: User[]; registrations: CompetitionRegistrationTicket[] } | null>(null);
  useEffect(() => { void Promise.all([eventsApi.list(), usersApi.list(), registrationApi.list()]).then(([events, users, registrations]) => setData({ events, users, registrations })); }, []);
  if (!data) return <LoadingPanel label="ФОРМИРОВАНИЕ ОБЗОРА" />;
  const cards = [
    ['АКТИВНЫЕ СОРЕВНОВАНИЯ', data.events.filter((item) => item.status === 'active').length, 'соревнования', '/admin/events'],
    ['ЗАЯВКИ НА РАССМОТРЕНИИ', data.registrations.filter((item) => item.status === 'pending').length, 'заявки на соревнования', '/admin/registrations'],
    ['ПОЛЬЗОВАТЕЛИ', data.users.length, 'учётные записи', '/admin/users'],
  ] as const;
  return <><PageHeader code="АДМИНИСТРАТОР / ОБЗОР" title="Обзор системы" description="Сводное состояние информационных узлов платформы." />
    <div className="metric-grid">{cards.map(([label, value, note, path], index) => <button className="metric-card" key={label} onClick={() => onNavigate(path)}><span>0{index + 1} // {label}</span><strong>{String(value).padStart(2, '0')}</strong><small>{note}</small><b>ОТКРЫТЬ РАЗДЕЛ →</b></button>)}</div>
    <div className="dashboard-grid">
      <section className="admin-panel"><div className="panel-heading"><div><p className="panel-code">ПОТОК СОРЕВНОВАНИЙ</p><h2>Ближайшие соревнования</h2></div><button onClick={() => onNavigate('/admin/events')}>ПОКАЗАТЬ ВСЕ →</button></div>
        <div className="compact-list">{data.events.slice(0, 4).map((event) => <button key={event.id} onClick={() => onNavigate(`/admin/events/${event.id}`)}><span className="node-index">{event.id.toUpperCase()}</span><div><strong>{event.title}</strong><small>{event.city} // {event.organizer}</small></div><StatusIndicator status={event.status} /><time>{event.startDate.slice(5).replace('-', '.')}</time></button>)}</div>
      </section>
      <section className="admin-panel activity-panel"><div className="panel-heading"><div><p className="panel-code">ОЧЕРЕДЬ ПРОВЕРКИ</p><h2>Требуют внимания</h2></div></div>
        {data.registrations.filter((ticket) => ticket.status === 'pending').slice(0, 3).map((ticket) => <div className="activity-row" key={ticket.id}><i /><div><strong>Регистрация: {ticket.title}</strong><small>{ticket.id.toUpperCase()} // ОЖИДАЕТ ОПЕРАТОРА</small></div><StatusIndicator status={ticket.status} /></div>)}
      </section>
    </div>
  </>;
}
