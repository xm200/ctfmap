import { useEffect, useMemo, useState } from 'react';
import * as usersApi from '../../api/usersApi';
import { EmptyPanel, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { User } from '../../types/admin';
import { ROLE_LABELS } from '../../utils/labels';

interface UserFilters {
  id: string;
  identity: string;
  email: string;
  telegram: string;
  role: string;
  access: string;
  createdAt: string;
}

const EMPTY_FILTERS: UserFilters = {
  id: '',
  identity: '',
  email: '',
  telegram: '',
  role: 'all',
  access: 'all',
  createdAt: '',
};

const includes = (value: unknown, filter: string) => String(value ?? '').toLowerCase().includes(filter.trim().toLowerCase());

export function UsersPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<UserFilters>(EMPTY_FILTERS);

  useEffect(() => { void usersApi.list().then(setUsers); }, []);

  const setFilter = (field: keyof UserFilters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const filtered = useMemo(() => (users ?? []).filter((user) => {
    const globalValue = `${user.id} ${user.username} ${user.organization ?? ''} ${user.email} ${user.city ?? ''} ${user.telegram ?? ''} ${ROLE_LABELS[user.role]} ${user.createdAt}`;
    const access = user.banned ? 'banned' : 'active';
    return includes(globalValue, query)
      && includes(user.id, filters.id)
      && includes(`${user.username} ${user.organization ?? ''}`, filters.identity)
      && includes(`${user.email} ${user.city ?? ''}`, filters.email)
      && includes(user.telegram, filters.telegram)
      && (filters.role === 'all' || user.role === filters.role)
      && (filters.access === 'all' || access === filters.access)
      && includes(user.createdAt, filters.createdAt);
  }), [users, query, filters]);

  const hasFilters = Boolean(query.trim()) || Object.entries(filters).some(([key, value]) => value !== (key === 'role' || key === 'access' ? 'all' : ''));
  const resetFilters = () => { setQuery(''); setFilters(EMPTY_FILTERS); };

  return <>
    <PageHeader code="АДМИНИСТРАТОР / ПОЛЬЗОВАТЕЛИ" title="Реестр пользователей" description="Идентификация и управление учётными записями платформы." actions={<div className="header-count"><span>УЧЁТНЫЕ ЗАПИСИ</span><b>{String(users?.length ?? 0).padStart(2, '0')}</b></div>} />
    <div className="toolbar table-toolbar">
      <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ОБЩИЙ ПОИСК ПО ВСЕМ КОЛОНКАМ..." /></label>
      <button type="button" className="filter-reset" onClick={resetFilters} disabled={!hasFilters}>СБРОСИТЬ ФИЛЬТРЫ</button>
    </div>
    {!users ? <LoadingPanel /> : <section className="admin-table user-table">
      <div className="table-row table-head"><span>ID</span><span>ПОЛЬЗОВАТЕЛЬ</span><span>ПОЧТА</span><span>ТЕЛЕГРАМ ID</span><span>РОЛЬ</span><span>ДОСТУП</span><span>ЗАРЕГИСТРИРОВАН</span><span /></div>
      <div className="table-row table-filters">
        <span><input aria-label="Фильтр по ID пользователя" value={filters.id} onChange={(event) => setFilter('id', event.target.value)} placeholder="ID" /></span>
        <span><input aria-label="Фильтр по пользователю или организации" value={filters.identity} onChange={(event) => setFilter('identity', event.target.value)} placeholder="НИК / ОРГАНИЗАЦИЯ" /></span>
        <span><input aria-label="Фильтр по почте или городу" value={filters.email} onChange={(event) => setFilter('email', event.target.value)} placeholder="ПОЧТА / ГОРОД" /></span>
        <span><input aria-label="Фильтр по Telegram ID" value={filters.telegram} onChange={(event) => setFilter('telegram', event.target.value)} placeholder="TELEGRAM" /></span>
        <span><select aria-label="Фильтр по роли" value={filters.role} onChange={(event) => setFilter('role', event.target.value)}><option value="all">ВСЕ</option><option value="organizer">ОРГАНИЗАТОР</option><option value="admin">АДМИНИСТРАТОР</option></select></span>
        <span><select aria-label="Фильтр по доступу" value={filters.access} onChange={(event) => setFilter('access', event.target.value)}><option value="all">ВСЕ</option><option value="active">АКТИВЕН</option><option value="banned">ЗАБЛОКИРОВАН</option></select></span>
        <span><input aria-label="Фильтр по дате регистрации" value={filters.createdAt} onChange={(event) => setFilter('createdAt', event.target.value)} placeholder="ДАТА" /></span><span />
      </div>
      {filtered.length === 0
        ? <div className="table-empty"><EmptyPanel title="Пользователи не обнаружены" text="Поиск не вернул доступных учётных записей." /></div>
        : filtered.map((user) => <button className="table-row" key={user.id} onClick={() => onNavigate(`/admin/users/${user.id}`)}><span className="mono-value">{user.id}</span><span className="identity-cell"><i>{user.username.slice(0, 2).toUpperCase()}</i><span><strong>{user.username}</strong>{user.organization?.trim() && <small>{user.organization}</small>}</span></span><span>{user.email}<small>{user.city ?? 'МЕСТО НЕ УКАЗАНО'}</small></span><span className="telegram-cell">{user.telegram || '—'}</span><span className="mono-value">{ROLE_LABELS[user.role]}</span><span><StatusIndicator status={user.banned ? 'banned' : 'active'} /></span><span>{user.createdAt}</span><span className="row-arrow">→</span></button>)}
    </section>}
  </>;
}
