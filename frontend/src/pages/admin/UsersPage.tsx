import { useEffect, useMemo, useState } from 'react';
import * as usersApi from '../../api/usersApi';
import { EmptyPanel, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { User } from '../../types/admin';
import { ROLE_LABELS } from '../../utils/labels';

type UserSortKey = 'id' | 'identity' | 'email' | 'telegram' | 'role' | 'access' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface SortState<T> {
  key: T;
  direction: SortDirection;
}

const compareText = (left: string, right: string) => left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' });

const compareId = (left: string, right: string) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return compareText(left, right);
};

export function UsersPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [sort, setSort] = useState<SortState<UserSortKey> | null>(null);

  useEffect(() => { void usersApi.list().then(setUsers); }, []);

  const toggleSort = (key: UserSortKey) => {
    setSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const sortedUsers = useMemo(() => {
    const items = [...(users ?? [])];
    if (!sort) {
      return items;
    }

    const direction = sort.direction === 'asc' ? 1 : -1;
    items.sort((left, right) => {
      let result = 0;

      switch (sort.key) {
        case 'id':
          result = compareId(left.id, right.id);
          break;
        case 'identity':
          result = compareText(`${left.username} ${left.organization ?? ''}`.trim(), `${right.username} ${right.organization ?? ''}`.trim());
          break;
        case 'email':
          result = compareText(`${left.email} ${left.city ?? ''}`.trim(), `${right.email} ${right.city ?? ''}`.trim());
          break;
        case 'telegram':
          result = compareText(left.telegram ?? '', right.telegram ?? '');
          break;
        case 'role':
          result = compareText(ROLE_LABELS[left.role], ROLE_LABELS[right.role]);
          break;
        case 'access':
          result = compareText(left.banned ? 'Заблокирован' : 'Активен', right.banned ? 'Заблокирован' : 'Активен');
          break;
        case 'createdAt':
          result = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
          break;
      }

      return result * direction;
    });

    return items;
  }, [users, sort]);

  const renderSortIcon = (key: UserSortKey) => {
    if (sort?.key !== key) {
      return '↕';
    }
    return sort.direction === 'asc' ? '↑' : '↓';
  };

  return <>
    <PageHeader code="АДМИНИСТРАТОР / ПОЛЬЗОВАТЕЛИ" title="Реестр пользователей" description="Идентификация и управление учётными записями платформы." actions={<div className="header-count"><span>УЧЁТНЫЕ ЗАПИСИ</span><b>{String(users?.length ?? 0).padStart(2, '0')}</b></div>} />
    {!users ? <LoadingPanel /> : <section className="admin-table user-table">
      <div className="table-row table-head">
        <span><button type="button" className="table-sort" onClick={() => toggleSort('id')}><span className="table-sort__label">ID</span><span className="table-sort__icon">{renderSortIcon('id')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('identity')}><span className="table-sort__label">ПОЛЬЗОВАТЕЛЬ</span><span className="table-sort__icon">{renderSortIcon('identity')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('email')}><span className="table-sort__label">ПОЧТА</span><span className="table-sort__icon">{renderSortIcon('email')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('telegram')}><span className="table-sort__label">ТЕЛЕГРАМ ID</span><span className="table-sort__icon">{renderSortIcon('telegram')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('role')}><span className="table-sort__label">РОЛЬ</span><span className="table-sort__icon">{renderSortIcon('role')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('access')}><span className="table-sort__label">ДОСТУП</span><span className="table-sort__icon">{renderSortIcon('access')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('createdAt')}><span className="table-sort__label">ЗАРЕГИСТРИРОВАН</span><span className="table-sort__icon">{renderSortIcon('createdAt')}</span></button></span>
        <span />
      </div>
      {sortedUsers.length === 0
        ? <div className="table-empty"><EmptyPanel title="Пользователи не обнаружены" text="В реестре пока нет доступных учётных записей." /></div>
        : sortedUsers.map((user) => <button className="table-row" key={user.id} onClick={() => onNavigate(`/admin/users/${user.id}`)}><span className="mono-value">{user.id}</span><span className="identity-cell"><i>{user.username.slice(0, 2).toUpperCase()}</i><span><strong>{user.username}</strong>{user.organization?.trim() && <small>{user.organization}</small>}</span></span><span>{user.email}<small>{user.city ?? 'МЕСТО НЕ УКАЗАНО'}</small></span><span className="telegram-cell">{user.telegram || '—'}</span><span className="mono-value">{ROLE_LABELS[user.role]}</span><span><StatusIndicator status={user.banned ? 'banned' : 'active'} /></span><span>{user.createdAt}</span><span className="row-arrow">→</span></button>)}
    </section>}
  </>;
}
