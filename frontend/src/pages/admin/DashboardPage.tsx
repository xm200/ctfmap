import { useEffect, useState } from 'react';
import * as eventsApi from '../../api/eventsApi';
import * as usersApi from '../../api/usersApi';
import * as verificationApi from '../../api/verificationApi';
import * as registrationApi from '../../api/registrationApi';
import { LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { AdminEvent, CompetitionRegistrationTicket, User, VerificationTicket } from '../../types/admin';

export function DashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [data, setData] = useState<{ events: AdminEvent[]; users: User[]; verification: VerificationTicket[]; registrations: CompetitionRegistrationTicket[] } | null>(null);
  useEffect(() => { void Promise.all([eventsApi.list(), usersApi.list(), verificationApi.list(), registrationApi.list()]).then(([events, users, verification, registrations]) => setData({ events, users, verification, registrations })); }, []);
  if (!data) return <LoadingPanel label="ASSEMBLING OPERATIONAL PICTURE" />;
  const cards = [
    ['ACTIVE EVENTS', data.events.filter((item) => item.status === 'active').length, 'events', '/admin/events'],
    ['PENDING VERIFICATION', data.verification.filter((item) => item.status === 'pending').length, 'identity tickets', '/admin/verification'],
    ['PENDING REGISTRATIONS', data.registrations.filter((item) => item.status === 'pending').length, 'event tickets', '/admin/registrations'],
    ['USERS', data.users.length, 'registered nodes', '/admin/users'],
  ] as const;
  return <><PageHeader code="ADMIN / OVERVIEW" title="Operations overview" description="Сводное состояние информационных узлов платформы." />
    <div className="metric-grid">{cards.map(([label, value, note, path], index) => <button className="metric-card" key={label} onClick={() => onNavigate(path)}><span>0{index + 1} // {label}</span><strong>{String(value).padStart(2, '0')}</strong><small>{note}</small><b>OPEN NODE →</b></button>)}</div>
    <div className="dashboard-grid">
      <section className="admin-panel"><div className="panel-heading"><div><p className="panel-code">EVENT STREAM</p><h2>Ближайшие соревнования</h2></div><button onClick={() => onNavigate('/admin/events')}>VIEW ALL →</button></div>
        <div className="compact-list">{data.events.slice(0, 4).map((event) => <button key={event.id} onClick={() => onNavigate(`/admin/events/${event.id}`)}><span className="node-index">{event.id.toUpperCase()}</span><div><strong>{event.title}</strong><small>{event.city} // {event.organizer}</small></div><StatusIndicator status={event.status} /><time>{event.startDate.slice(5).replace('-', '.')}</time></button>)}</div>
      </section>
      <section className="admin-panel signal-panel"><p className="panel-code">SYSTEM SIGNAL</p><h2>Platform status</h2><div className="signal-orbit"><i /><i /><i /><strong>RU<br /><span>01</span></strong></div><div className="signal-stats"><span>API CHANNEL <b>ONLINE</b></span><span>SESSION <b>SECURE</b></span><span>LATENCY <b>24 MS</b></span></div></section>
      <section className="admin-panel activity-panel"><div className="panel-heading"><div><p className="panel-code">REVIEW QUEUE</p><h2>Требуют внимания</h2></div></div>
        {[...data.verification, ...data.registrations].slice(0, 3).map((ticket) => <div className="activity-row" key={ticket.id}><i /><div><strong>{'user' in ticket ? `Верификация: ${ticket.user.username}` : `Регистрация: ${ticket.title}`}</strong><small>{ticket.id.toUpperCase()} // WAITING FOR OPERATOR</small></div><StatusIndicator status={ticket.status} /></div>)}
      </section>
    </div>
  </>;
}
