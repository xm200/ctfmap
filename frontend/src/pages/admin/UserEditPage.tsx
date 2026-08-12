import { useEffect, useState } from 'react';
import * as usersApi from '../../api/usersApi';
import { InlineNotice, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { ApiError, User, UserRole, UserUpdate } from '../../types/admin';

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
      setForm({ username: item.username, email: item.email, role: item.role, verified: item.verified, city: item.city ?? '', organization: item.organization ?? '' });
    }).catch((reason: ApiError) => {
      if (reason.status === 404) onNavigate('/404');
      else if (reason.status !== 0) setNotice('Не удалось загрузить профиль.');
    });
    return () => controller.abort();
  }, [id, onNavigate]);

  const set = <K extends keyof UserUpdate>(key: K, value: UserUpdate[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const criticalChanged = Boolean(user && form && (form.role !== user.role || form.verified !== user.verified));

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

  if (!user || !form) return notice ? <InlineNotice kind="error">{notice}</InlineNotice> : <LoadingPanel label="READING IDENTITY NODE" />;
  return <><PageHeader code={`ADMIN / USERS / ${user.id.toUpperCase()}`} title={user.username} description="Контроль учётной записи и профиля участника." actions={<StatusIndicator status={user.verified ? 'verified' : 'unverified'} />} />
    <div className="profile-summary admin-panel"><div className="profile-glyph">{user.username.slice(0, 2).toUpperCase()}</div><div><span>IDENTITY NODE</span><h2>{user.username}</h2><p>{user.email} // CREATED {user.createdAt}</p></div><div className="profile-meta"><span>ROLE <b>{user.role.toUpperCase()}</b></span><span>USER ID <b>{user.id.toUpperCase()}</b></span></div></div>
    <form className="edit-form" onSubmit={submit}>{notice && <InlineNotice kind={notice.includes('синхронизирован') ? 'success' : 'error'}>{notice}</InlineNotice>}
      {confirming && <div className="confirmation-panel" role="alertdialog" aria-modal="true" aria-labelledby="critical-confirm-title"><p className="panel-code">CRITICAL CHANGE</p><h2 id="critical-confirm-title">Подтвердите изменение доступа</h2><p>Роль или статус верификации будут изменены. Сервер должен повторно проверить полномочия текущего администратора.</p><div><button type="button" className="button admin-button" onClick={() => setConfirming(false)}>CANCEL</button><button type="submit" className="button admin-button admin-button--reject">CONFIRM CHANGE</button></div></div>}
      <section className="form-section"><header><span>01</span><h2>Account</h2></header><div className="form-grid"><label className="field"><span>USERNAME</span><input maxLength={64} value={form.username} onChange={(e) => set('username', e.target.value)} /></label><label className="field"><span>EMAIL</span><input type="email" maxLength={254} value={form.email} onChange={(e) => set('email', e.target.value)} /></label></div></section>
      <section className="form-section"><header><span>02</span><h2>Profile</h2></header><div className="form-grid"><label className="field"><span>CITY</span><input maxLength={128} value={form.city} onChange={(e) => set('city', e.target.value)} /></label><label className="field"><span>ORGANIZATION</span><input maxLength={160} value={form.organization} onChange={(e) => set('organization', e.target.value)} /></label></div></section>
      <section className="form-section critical-section"><header><span>03</span><h2>Access & verification</h2><small>CRITICAL PARAMETERS</small></header><div className="form-grid"><label className="field"><span>ROLE</span><select value={form.role} onChange={(e) => set('role', e.target.value as UserRole)}><option value="participant">PARTICIPANT</option><option value="organizer">ORGANIZER</option><option value="admin">ADMIN</option></select></label><label className="toggle-field"><span>VERIFICATION STATUS</span><button type="button" className={form.verified ? 'on' : ''} onClick={() => set('verified', !form.verified)}><i /><b>{form.verified ? 'VERIFIED' : 'UNVERIFIED'}</b></button></label></div></section>
      <footer className="form-actions"><button type="button" className="button admin-button" onClick={() => onNavigate('/admin/users')}>CANCEL</button><button className="button admin-button admin-button--primary" disabled={loading}>{loading ? 'SAVING...' : 'SAVE CHANGES'} →</button></footer>
    </form></>;
}
