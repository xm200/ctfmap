import { useEffect, useMemo, useState } from 'react';
import * as usersApi from '../../api/usersApi';
import { EmptyPanel, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { User } from '../../types/admin';

export function UsersPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [users, setUsers] = useState<User[] | null>(null); const [query, setQuery] = useState(''); const [role, setRole] = useState('all');
  useEffect(() => { void usersApi.list().then(setUsers); }, []);
  const filtered = useMemo(() => (users ?? []).filter((user) => (role === 'all' || user.role === role) && `${user.username} ${user.email} ${user.id}`.toLowerCase().includes(query.toLowerCase())), [users, query, role]);
  return <><PageHeader code="ADMIN / USERS" title="Participant registry" description="Идентификация и управление аккаунтами участников платформы." actions={<div className="header-count"><span>IDENTITIES</span><b>{String(users?.length ?? 0).padStart(2, '0')}</b></div>} />
    <div className="toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="SEARCH USERNAME, EMAIL, ID..." /></label><label className="select-box"><span>ROLE</span><select value={role} onChange={(e) => setRole(e.target.value)}><option value="all">ALL ROLES</option><option value="participant">PARTICIPANT</option><option value="organizer">ORGANIZER</option><option value="admin">ADMIN</option></select></label></div>
    {!users ? <LoadingPanel /> : filtered.length === 0 ? <EmptyPanel title="Участники не обнаружены" text="Поиск не вернул доступных identity nodes." /> : <section className="admin-table user-table"><div className="table-row table-head"><span>IDENTITY</span><span>CONTACT</span><span>ROLE</span><span>VERIFICATION</span><span>REGISTERED</span><span /></div>{filtered.map((user) => <button className="table-row" key={user.id} onClick={() => onNavigate(`/admin/users/${user.id}`)}><span className="identity-cell"><i>{user.username.slice(0, 2).toUpperCase()}</i><span><strong>{user.username}</strong><small>{user.id.toUpperCase()}</small></span></span><span>{user.email}<small>{user.city ?? 'LOCATION UNKNOWN'}</small></span><span className="mono-value">{user.role.toUpperCase()}</span><span><StatusIndicator status={user.verified ? 'verified' : 'unverified'} /></span><span>{user.createdAt}</span><span className="row-arrow">→</span></button>)}</section>}
  </>;
}
