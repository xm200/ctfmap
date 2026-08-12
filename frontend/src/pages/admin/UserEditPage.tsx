import { useEffect, useState } from 'react';
import * as usersApi from '../../api/usersApi';
import { InlineNotice, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { ApiError, User, UserRole, UserUpdate } from '../../types/admin';
import { ROLE_LABELS } from '../../utils/labels';

export function UserEditPage({ id, onNavigate }: { id: string; onNavigate: (path: string) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserUpdate | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void usersApi.get(id, controller.signal).then((item) => {
      setUser(item);
      setForm({ username: item.username, email: item.email, role: item.role, verified: item.verified, banned: item.banned, city: item.city ?? '', organization: item.organization ?? '' });
    }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      const issue = reason as ApiError;
      if (issue.status === 404) onNavigate('/404');
      else if (issue.status !== 0) setNotice('Не удалось загрузить профиль.');
    });
    return () => controller.abort();
  }, [id, onNavigate]);

  const set = <K extends keyof UserUpdate>(key: K, value: UserUpdate[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const criticalChanged = Boolean(user && form && (form.role !== user.role || form.banned !== user.banned));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !user) return;
    if (criticalChanged && !confirming) { setConfirming(true); return; }
    setLoading(true); setNotice('');
    try {
      const next = await usersApi.update(id, form);
      setUser(next);
      setConfirming(false);
      setNotice('Профиль синхронизирован.');
    } catch {
      setNotice('Не удалось сохранить профиль.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !form) return notice ? <InlineNotice kind="error">{notice}</InlineNotice> : <LoadingPanel label="ЗАГРУЗКА УЧЁТНОЙ ЗАПИСИ" />;
  return <><PageHeader code={`АДМИНИСТРАТОР / ПОЛЬЗОВАТЕЛИ / ${user.id.toUpperCase()}`} title={user.username} description="Контроль учётной записи и профиля пользователя." actions={<StatusIndicator status={user.banned ? 'banned' : 'active'} />} />
    <div className="profile-summary admin-panel"><div className="profile-glyph">{user.username.slice(0, 2).toUpperCase()}</div><div><span>УЧЁТНАЯ ЗАПИСЬ</span><h2>{user.username}</h2><p>{user.email} // СОЗДАНА {user.createdAt}</p></div><div className="profile-meta"><span>РОЛЬ <b>{ROLE_LABELS[user.role]}</b></span><span>НОМЕР ПОЛЬЗОВАТЕЛЯ <b>{user.id.toUpperCase()}</b></span></div></div>
    <form className="edit-form" onSubmit={submit}>{notice && <InlineNotice kind={notice.includes('синхронизирован') ? 'success' : 'error'}>{notice}</InlineNotice>}
      {confirming && <div className="confirmation-panel" role="alertdialog" aria-modal="true" aria-labelledby="critical-confirm-title"><p className="panel-code">КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ</p><h2 id="critical-confirm-title">Подтвердите изменение доступа</h2><p>{form.banned !== user.banned ? (form.banned ? 'Пользователь будет заблокирован, а его активные сеансы завершены.' : 'Доступ пользователя к платформе будет восстановлен.') : 'Роль пользователя будет изменена.'}</p><div><button type="button" className="button admin-button" onClick={() => setConfirming(false)}>ОТМЕНА</button><button type="submit" className="button admin-button admin-button--reject">ПОДТВЕРДИТЬ ИЗМЕНЕНИЕ</button></div></div>}
      <section className="form-section"><header><span>01</span><h2>Учётная запись</h2></header><div className="form-grid"><label className="field"><span>ИМЯ ПОЛЬЗОВАТЕЛЯ</span><input maxLength={64} value={form.username} onChange={(e) => set('username', e.target.value)} /></label><label className="field"><span>ЭЛЕКТРОННАЯ ПОЧТА</span><input type="email" maxLength={254} value={form.email} onChange={(e) => set('email', e.target.value)} /></label></div></section>
      <section className="form-section"><header><span>02</span><h2>Профиль</h2></header><div className="form-grid"><label className="field"><span>ГОРОД</span><input maxLength={128} value={form.city} onChange={(e) => set('city', e.target.value)} /></label><label className="field"><span>ОРГАНИЗАЦИЯ</span><input maxLength={160} value={form.organization} onChange={(e) => set('organization', e.target.value)} /></label><label className="field"><span>ТЕЛЕГРАМ ID</span><input value={user.telegram || '—'} readOnly aria-readonly="true" /></label></div></section>
      <section className="form-section critical-section"><header><span>03</span><h2>Управление доступом</h2><small>КРИТИЧЕСКИЕ ПАРАМЕТРЫ</small></header><div className="form-grid"><label className="field"><span>РОЛЬ</span><select value={form.role} onChange={(e) => set('role', e.target.value as UserRole)}><option value="organizer">ОРГАНИЗАТОР</option><option value="admin">АДМИНИСТРАТОР</option></select></label><label className="toggle-field"><span>БЛОКИРОВКА</span><button type="button" className={!form.banned ? 'on' : ''} onClick={() => set('banned', !form.banned)}><i /><b>{form.banned ? 'ЗАБЛОКИРОВАН' : 'ДОСТУП РАЗРЕШЁН'}</b></button></label></div></section>
      <footer className="form-actions"><button type="button" className="button admin-button" onClick={() => onNavigate('/admin/users')}>ОТМЕНА</button><button className="button admin-button admin-button--primary" disabled={loading}>{loading ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ ИЗМЕНЕНИЯ'} →</button></footer>
    </form></>;
}
