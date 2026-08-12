import { useState } from 'react';
import { Brand } from '../components/Brand';
import { InlineNotice } from '../components/AdminUi';
import type { ApiError } from '../types/admin';

interface Props {
  onLogin: (identifier: string, password: string) => Promise<void>;
  onNavigate: (path: string) => void;
}

export function LoginPage({ onLogin, onNavigate }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(identifier.trim(), password);
      setPassword('');
    } catch (reason) {
      const issue = reason as ApiError;
      setError(issue.status === 401 || issue.status === 403
        ? 'Неверный идентификатор или пароль.'
        : 'Не удалось выполнить вход. Повторите попытку позже.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="auth-page">
    <div className="noise" /><div className="auth-grid" /><div className="auth-scan" />
    <header className="auth-top"><Brand /><button type="button" onClick={() => onNavigate('/')}>← RETURN TO MAP</button></header>
    <section className="auth-brief">
      <p className="panel-code">SECURE GATEWAY // 01</p><h1>OPERATOR<br /><span>ACCESS</span></h1>
      <p>Авторизуйтесь для доступа к персональному узлу CTFMAP и операторским инструментам.</p>
      <div className="auth-telemetry"><span><i /> GATEWAY ONLINE</span><span>TRANSPORT <b>TLS</b></span><span>NODE <b>RU-01</b></span></div>
    </section>
    <form className="auth-panel" onSubmit={submit}>
      <div className="auth-panel-head"><span>IDENTITY CHALLENGE</span><b>AUTH / LOGIN</b></div>
      <h2>Вход в систему</h2><p className="form-intro">Введите идентификатор оператора и пароль.</p>
      {error && <InlineNotice kind="error">{error}</InlineNotice>}
      <label className="field"><span>EMAIL / USERNAME</span><input autoFocus value={identifier} onChange={(event) => setIdentifier(event.target.value)} required maxLength={254} autoComplete="username" /></label>
      <label className="field"><span>PASSWORD</span><input value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={128} type="password" autoComplete="current-password" /></label>
      <button className="button admin-button admin-button--primary" disabled={loading}>{loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'} <span>→</span></button>
      <div className="auth-switch">NO IDENTITY? <button type="button" onClick={() => onNavigate('/register')}>CREATE PARTICIPANT NODE</button></div>
    </form>
  </main>;
}
