import { useEffect, useState } from 'react';
import { Brand } from '../components/Brand';
import { InlineNotice, LoadingPanel, PageHeader } from '../components/AdminUi';
import { useAuth } from '../auth/AuthContext';
import * as profileApi from '../api/profileApi';
import type { ApiError, User } from '../types/admin';

function issueMessage(reason: unknown, fallback: string): string {
  const issue = reason as Partial<ApiError>;
  if (issue.status === 409) return 'Это имя пользователя или email уже заняты.';
  if (issue.status === 401) return 'Сессия истекла. Выполните вход снова.';
  if (issue.status === 422) return 'Проверьте данные и повторите попытку.';
  return fallback;
}

function normalizeTelegram(value: string): string {
  const trimmed = value.trim().replace(/^https?:\/\/(www\.)?t\.me\//i, '').replace(/^@/, '');
  return trimmed ? `@${trimmed}` : '';
}

export function ProfilePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const auth = useAuth();
  const [profile, setProfile] = useState<User | null>(auth.currentUser);
  const [telegram, setTelegram] = useState(auth.currentUser?.telegram ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [telegramOpen, setTelegramOpen] = useState(Boolean(auth.currentUser?.telegram));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    profileApi.get(controller.signal)
      .then((next) => {
        setProfile(next);
        setTelegram(next.telegram ?? '');
        setTelegramOpen(Boolean(next.telegram));
        auth.updateCurrentUser(next);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(issueMessage(reason, 'Не удалось загрузить профиль.'));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [auth.updateCurrentUser]);

  const saveTelegram = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeTelegram(telegram);
    if (normalized && !/^@[A-Za-z0-9_]{5,32}$/.test(normalized)) return setError('Укажите Telegram username или ссылку t.me.');
    setSaving(true); setError(''); setSuccess('');
    try {
      const updated = await profileApi.update({ telegram: normalized });
      setProfile(updated); setTelegram(updated.telegram ?? ''); setTelegramOpen(Boolean(updated.telegram)); auth.updateCurrentUser(updated);
      setSuccess('Telegram сохранён.');
    } catch (reason) { setError(issueMessage(reason, 'Не удалось сохранить Telegram.')); }
    finally { setSaving(false); }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwords.newPassword.length < 12) return setError('Новый пароль должен содержать минимум 12 символов.');
    if (passwords.newPassword.length > 128) return setError('Новый пароль не должен превышать 128 символов.');
    if (passwords.newPassword !== passwords.confirmation) return setError('Пароли не совпадают.');
    if (passwords.currentPassword === passwords.newPassword) return setError('Новый пароль должен отличаться от текущего.');
    setPasswordSaving(true); setError(''); setSuccess('');
    try {
      await profileApi.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' }); setPasswordOpen(false);
      setSuccess('Пароль изменён.');
    } catch (reason) { setError(reason && typeof reason === 'object' && 'code' in reason && (reason as ApiError).code === 'INVALID_CURRENT_PASSWORD' ? 'Текущий пароль указан неверно.' : issueMessage(reason, 'Не удалось изменить пароль.')); }
    finally { setPasswordSaving(false); }
  };

  if (loading && !profile) return <main className="profile-page"><div className="noise" /><header className="profile-top"><Brand /><button type="button" onClick={() => onNavigate('/')}>← RETURN TO MAP</button></header><LoadingPanel label="LOADING PERSONAL NODE" /></main>;
  if (!profile) return <main className="profile-page"><div className="noise" /><header className="profile-top"><Brand /></header><InlineNotice kind="error">Профиль недоступен.</InlineNotice></main>;

  return <main className="profile-page">
    <div className="noise" /><div className="auth-grid" />
    <header className="profile-top"><Brand /><div className="profile-top-actions"><span className="session-pulse"><i /> SESSION ACTIVE</span><button type="button" onClick={() => onNavigate('/')}>← MAP</button><button type="button" onClick={() => { void auth.logout().then(() => onNavigate('/login')); }}>LOGOUT</button></div></header>
    <div className="profile-content">
      <PageHeader code="PERSONAL NODE // USER 01" title="MY PROFILE" actions={<div className="profile-header-actions"><span className="profile-role">{profile.role.toUpperCase()} // {profile.verified ? 'VERIFIED' : 'UNVERIFIED'}</span><button type="button" className="button admin-button admin-button--primary" onClick={() => onNavigate('/events/register')}>REGISTER EVENT →</button></div>} />
      {error && <InlineNotice kind="error">{error}</InlineNotice>}{success && <InlineNotice kind="success">{success}</InlineNotice>}
      <div className="hud-panel profile-window">
        <section className="profile-contact"><div className="panel-heading"><div><span className="panel-code">CONTACT</span><h2>TELEGRAM</h2></div></div>
          <div className="contact-control"><div><span>TELEGRAM CONTACT</span><strong>{profile.telegram || 'NOT CONNECTED'}</strong></div><button type="button" className="button admin-button" onClick={() => setTelegramOpen((open) => !open)}>{profile.telegram ? 'UPDATE TELEGRAM' : 'ADD TELEGRAM'}</button></div>
          {telegramOpen && <form className="telegram-form" onSubmit={saveTelegram}><p className="profile-hint">Введите username или ссылку https://t.me/username.</p><label className="field"><span>TELEGRAM USERNAME</span><input value={telegram} onChange={(e) => { setTelegram(e.target.value); setError(''); setSuccess(''); }} maxLength={45} autoComplete="off" /></label><div className="profile-actions"><button type="button" className="button admin-button" onClick={() => { setTelegramOpen(false); setTelegram(profile.telegram ?? ''); }}>CANCEL</button><button className="button admin-button admin-button--primary" disabled={saving}>{saving ? 'SAVING...' : 'SAVE TELEGRAM'}</button></div></form>}
        </section>
        <section className="profile-security"><div className="panel-heading"><div><span className="panel-code">SECURITY</span><h2>PASSWORD</h2></div></div>
          {!passwordOpen ? <button type="button" className="button admin-button" onClick={() => { setPasswordOpen(true); setError(''); }}>CHANGE PASSWORD <span>→</span></button> : <form className="password-form" onSubmit={changePassword}>
            <p className="panel-code">PASSWORD ROTATION</p><label className="field"><span>CURRENT PASSWORD</span><input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" maxLength={128} required /></label>
            <label className="field"><span>NEW PASSWORD</span><input type="password" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
            <label className="field"><span>CONFIRM NEW PASSWORD</span><input type="password" value={passwords.confirmation} onChange={(e) => setPasswords((p) => ({ ...p, confirmation: e.target.value }))} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
            <div className="profile-actions"><button type="button" className="button admin-button" onClick={() => { setPasswordOpen(false); setPasswords({ currentPassword: '', newPassword: '', confirmation: '' }); }}>CANCEL</button><button className="button admin-button admin-button--primary" disabled={passwordSaving}>{passwordSaving ? 'UPDATING...' : 'UPDATE PASSWORD'}</button></div>
          </form>}
        </section>
      </div>
    </div>
  </main>;
}
