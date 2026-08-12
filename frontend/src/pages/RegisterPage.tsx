import { useState } from 'react';
import { register } from '../api/authApi';
import { Brand } from '../components/Brand';
import { InlineNotice } from '../components/AdminUi';
import type { ApiError } from '../types/admin';

export function RegisterPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false); const [success, setSuccess] = useState(false); const [serverError, setServerError] = useState('');
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); const next: Record<string, string> = {};
    if (form.username.trim().length < 3) next.username = 'Минимум 3 символа.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Введите корректный email.';
    if (form.password.length < 12) next.password = 'Минимум 12 символов.';
    if (form.password.length > 128) next.password = 'Максимум 128 символов.';
    if (form.password !== form.confirm) next.confirm = 'Пароли не совпадают.';
    setErrors(next); if (Object.keys(next).length) return;
    setLoading(true); setServerError('');
    try { await register({ username: form.username.trim(), email: form.email.trim(), password: form.password }); setSuccess(true); }
    catch (reason) { setServerError((reason as ApiError).message || 'Не удалось создать узел.'); }
    finally { setLoading(false); }
  };
  return <main className="auth-page auth-page--register"><div className="noise" />
    <header className="auth-top"><Brand /><button type="button" onClick={() => onNavigate('/')}>← RETURN TO MAP</button></header>
    <form className="auth-panel" onSubmit={submit} noValidate>
      <div className="auth-panel-head"><span>IDENTITY PROVISIONING</span><b>AUTH / REGISTER</b></div><h2>Регистрация</h2>
      {success && <InlineNotice kind="success">Узел участника создан. <button type="button" onClick={() => onNavigate('/login')}>Перейти ко входу →</button></InlineNotice>}
      {serverError && <InlineNotice kind="error">{serverError}</InlineNotice>}
      <div className="form-grid form-grid--auth">
        <label className={`field ${errors.username ? 'field--error' : ''}`}><span>USERNAME</span><input autoComplete="username" maxLength={64} value={form.username} onChange={(e) => set('username', e.target.value)} disabled={success} />{errors.username && <small>{errors.username}</small>}</label>
        <label className={`field ${errors.email ? 'field--error' : ''}`}><span>EMAIL</span><input type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(e) => set('email', e.target.value)} disabled={success} />{errors.email && <small>{errors.email}</small>}</label>
        <label className={`field ${errors.password ? 'field--error' : ''}`}><span>PASSWORD</span><input type="password" autoComplete="new-password" maxLength={128} value={form.password} onChange={(e) => set('password', e.target.value)} disabled={success} />{errors.password && <small>{errors.password}</small>}</label>
        <label className={`field ${errors.confirm ? 'field--error' : ''}`}><span>REPEAT PASSWORD</span><input type="password" autoComplete="new-password" maxLength={128} value={form.confirm} onChange={(e) => set('confirm', e.target.value)} disabled={success} />{errors.confirm && <small>{errors.confirm}</small>}</label>
      </div>
      <button className="button admin-button admin-button--primary" disabled={loading || success}>{loading ? 'PROVISIONING...' : 'CREATE NODE'} <span>→</span></button>
      <div className="auth-switch">ALREADY REGISTERED? <button type="button" onClick={() => onNavigate('/login')}>AUTHENTICATE</button></div>
    </form>
  </main>;
}
