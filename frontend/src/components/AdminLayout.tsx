import { Brand } from './Brand';
import type { User } from '../types/admin';

interface Props { path: string; user: User; onNavigate: (path: string) => void; onLogout: () => void; children: React.ReactNode; }
const links = [
  ['/admin', 'Overview', '01'], ['/admin/events', 'Events', '02'], ['/admin/users', 'Users', '03'],
  ['/admin/verification', 'Verification', '04'], ['/admin/registrations', 'Registrations', '05'],
] as const;

export function AdminLayout({ path, user, onNavigate, onLogout, children }: Props) {
  const active = (href: string) => href === '/admin' ? path === href : path.startsWith(href);
  return <main className="admin-shell">
    <div className="noise" />
    <header className="admin-topbar">
      <Brand />
      <div className="admin-node-label"><span>ADMIN NODE</span><small>OPERATIONS CONSOLE // RU-01</small></div>
      <div className="system-status"><span><i />SESSION ACTIVE</span><small>{user.username} // {user.id}</small></div>
    </header>
    <aside className="admin-sidebar">
      <p className="panel-code">COMMAND INDEX</p>
      <nav>{links.map(([href, label, code]) => <button key={href} type="button" className={active(href) ? 'active' : ''} onClick={() => onNavigate(href)}><small>{code}</small><span>{label}</span><b>›</b></button>)}</nav>
      <div className="sidebar-session"><span>AUTH LEVEL</span><strong>ROOT / ADMIN</strong><button type="button" onClick={onLogout}>LOGOUT <b>↗</b></button></div>
    </aside>
    <section className="admin-content">{children}</section>
  </main>;
}
