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
      setError(issue.status === 403
        ? 'Учётная запись заблокирована администратором.'
        : issue.status === 401 ? 'Неверный идентификатор или пароль.'
          : 'Не удалось выполнить вход. Повторите попытку позже.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="auth-page">
    <div className="noise" />
    <header className="auth-top"><Brand /><button type="button" onClick={() => onNavigate('/')}>← К КАРТЕ</button></header>
    <form className="auth-panel" onSubmit={submit}>
      <div className="auth-panel-head"><span>ПРОВЕРКА ЛИЧНОСТИ</span><b>ДОСТУП / ВХОД</b></div>
      <h2>Вход в систему</h2>
      {error && <InlineNotice kind="error">{error}</InlineNotice>}
      <label className="field"><span>ПОЧТА / ИМЯ ПОЛЬЗОВАТЕЛЯ</span><input autoFocus value={identifier} onChange={(event) => setIdentifier(event.target.value)} required maxLength={254} autoComplete="username" /></label>
      <label className="field"><span>ПАРОЛЬ</span><input value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={128} type="password" autoComplete="current-password" /></label>
      <button className="button admin-button admin-button--primary" disabled={loading}>{loading ? 'ВЫПОЛНЯЕТСЯ ВХОД...' : 'ВОЙТИ'} <span>→</span></button>
      <div className="auth-switch">НЕТ УЧЁТНОЙ ЗАПИСИ? <button type="button" onClick={() => onNavigate('/register')}>ЗАРЕГИСТРИРОВАТЬСЯ</button></div>
    </form>
  </main>;
}
