import { useEffect, useState } from 'react';
import { Brand } from '../components/Brand';
import { InlineNotice, LoadingPanel, PageHeader } from '../components/AdminUi';
import { useAuth } from '../auth/AuthContext';
import * as profileApi from '../api/profileApi';
import type { ApiError, ProfileUpdate, User } from '../types/admin';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function formFromUser(user: User): ProfileUpdate {
  return {
    username: user.username,
    email: user.email,
    city: user.city ?? '',
    organization: user.organization ?? '',
    telegram: user.telegram ?? '',
  };
}

export function ProfilePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const auth = useAuth();
  const [profile, setProfile] = useState<User | null>(auth.currentUser);
  const [form, setForm] = useState<ProfileUpdate | null>(auth.currentUser ? formFromUser(auth.currentUser) : null);
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
        setForm(formFromUser(next));
        setTelegramOpen(Boolean(next.telegram));
        auth.updateCurrentUser(next);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(issueMessage(reason, 'Не удалось загрузить профиль.'));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [auth.updateCurrentUser]);

  const updateField = (field: keyof ProfileUpdate, value: string) => {
    setForm((current) => current ? { ...current, [field]: value } : current);
    setError('');
    setSuccess('');
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const next = { ...form, username: form.username.trim(), email: form.email.trim(), telegram: normalizeTelegram(form.telegram) };
    if (next.username.length < 3) return setError('Имя пользователя должно содержать минимум 3 символа.');
    if (!emailPattern.test(next.email)) return setError('Введите корректный email.');
    if (next.telegram && !/^@[A-Za-z0-9_]{5,32}$/.test(next.telegram)) return setError('Укажите Telegram username или ссылку t.me.');
    setSaving(true); setError(''); setSuccess('');
    try {
      const updated = await profileApi.update(next);
      setProfile(updated); setForm(formFromUser(updated)); auth.updateCurrentUser(updated);
      setSuccess('Профиль сохранён.');
    } catch (reason) { setError(issueMessage(reason, 'Не удалось сохранить профиль.')); }
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

  if (loading && !form) return <main className="profile-page"><div className="noise" /><header className="profile-top"><Brand /><button type="button" onClick={() => onNavigate('/')}>← RETURN TO MAP</button></header><LoadingPanel label="LOADING PERSONAL NODE" /></main>;
  if (!profile || !form) return <main className="profile-page"><div className="noise" /><header className="profile-top"><Brand /></header><InlineNotice kind="error">Профиль недоступен.</InlineNotice></main>;

  return <main className="profile-page">
    <div className="noise" /><div className="auth-grid" />
    <header className="profile-top"><Brand /><div className="profile-top-actions"><span className="session-pulse"><i /> SESSION ACTIVE</span><button type="button" onClick={() => onNavigate('/')}>← MAP</button><button type="button" onClick={() => { void auth.logout().then(() => onNavigate('/login')); }}>LOGOUT</button></div></header>
    <div className="profile-content">
      <PageHeader code="PERSONAL NODE // USER 01" title="MY PROFILE" description="Управление персональными данными участника CTFMAP." actions={<span className="profile-role">{profile.role.toUpperCase()} // {profile.verified ? 'VERIFIED' : 'UNVERIFIED'}</span>} />
      {error && <InlineNotice kind="error">{error}</InlineNotice>}{success && <InlineNotice kind="success">{success}</InlineNotice>}
      <div className="profile-grid">
        <form className="hud-panel profile-form" onSubmit={saveProfile}>
          <div className="panel-heading"><div><span className="panel-code">ACCOUNT DATA</span><h2>PERSONAL IDENTITY</h2></div><small>EDITABLE FIELDS</small></div>
          <div className="profile-fields">
            <label className="field"><span>USERNAME</span><input value={form.username} onChange={(e) => updateField('username', e.target.value)} maxLength={64} autoComplete="username" required /></label>
            <label className="field"><span>EMAIL</span><input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} maxLength={254} autoComplete="email" required /></label>
            <label className="field"><span>CITY</span><input value={form.city} onChange={(e) => updateField('city', e.target.value)} maxLength={120} /></label>
            <label className="field"><span>ORGANIZATION</span><input value={form.organization} onChange={(e) => updateField('organization', e.target.value)} maxLength={160} /></label>
          </div>
          <div className="profile-actions"><button className="button admin-button admin-button--primary" disabled={saving}>{saving ? 'SAVING...' : 'SAVE PROFILE'} <span>→</span></button></div>
        </form>
        <section className="hud-panel profile-security"><div className="panel-heading"><div><span className="panel-code">CONTACT / SECURITY</span><h2>ACCOUNT CONTROLS</h2></div></div>
          <div className="contact-control"><div><span>TELEGRAM CONTACT</span><strong>{profile.telegram || 'NOT CONNECTED'}</strong></div><button type="button" className="button admin-button" onClick={() => setTelegramOpen((open) => !open)}>{profile.telegram ? 'UPDATE TELEGRAM' : 'ADD TELEGRAM'}</button></div>
          {telegramOpen && <p className="profile-hint">Введите username или ссылку https://t.me/username. Контакт будет сохранён вместе с профилем.</p>}
          {telegramOpen && <label className="field"><span>TELEGRAM USERNAME</span><input value={form.telegram} onChange={(e) => updateField('telegram', e.target.value)} maxLength={45} autoComplete="off" /></label>}
          <div className="security-divider" />
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
