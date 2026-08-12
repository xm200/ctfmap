import { Brand } from './Brand';
import type { User } from '../types/admin';

interface Props { path: string; user: User; onNavigate: (path: string) => void; onLogout: () => void; children: React.ReactNode; }
const links = [
  ['/admin', 'Обзор', '01'], ['/admin/events', 'Соревнования', '02'], ['/admin/users', 'Пользователи', '03'],
  ['/admin/registrations', 'Заявки', '04'],
] as const;

export function AdminLayout({ path, user, onNavigate, onLogout, children }: Props) {
  const active = (href: string) => href === '/admin' ? path === href : path.startsWith(href);
  return <main className="admin-shell">
    <div className="noise" />
    <header className="admin-topbar">
      <Brand />
      <div className="admin-node-label"><span>УЗЕЛ АДМИНИСТРАТОРА</span><small>ПАНЕЛЬ УПРАВЛЕНИЯ // РФ-01</small></div>
      <div className="system-status"><span><i />СЕАНС АКТИВЕН</span><small>{user.username} // {user.id}</small></div>
    </header>
    <aside className="admin-sidebar">
      <p className="panel-code">РАЗДЕЛЫ</p>
      <nav>{links.map(([href, label, code]) => <button key={href} type="button" className={active(href) ? 'active' : ''} onClick={() => onNavigate(href)}><small>{code}</small><span>{label}</span><b>›</b></button>)}</nav>
      <div className="sidebar-session"><span>УРОВЕНЬ ДОСТУПА</span><strong>ПОЛНЫЙ / АДМИНИСТРАТОР</strong><button type="button" onClick={onLogout}>ВЫЙТИ <b>↗</b></button></div>
    </aside>
    <section className="admin-content">{children}</section>
  </main>;
}
