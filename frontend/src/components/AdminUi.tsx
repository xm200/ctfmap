export function PageHeader({ code, title, description, actions }: { code: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <header className="admin-page-header"><div><p className="panel-code">{code}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</header>;
}
export function InlineNotice({ kind, children }: { kind: 'error' | 'success' | 'info'; children: React.ReactNode }) { return <div className={`inline-notice inline-notice--${kind}`} role="status"><i />{children}</div>; }
export function LoadingPanel({ label = 'СИНХРОНИЗАЦИЯ ДАННЫХ' }: { label?: string }) { return <div className="loading-panel"><i /><span>{label}</span><small>ЗАЩИЩЁННЫЙ КАНАЛ // ПОЖАЛУЙСТА, ПОДОЖДИТЕ</small></div>; }
export function EmptyPanel({ title, text }: { title: string; text: string }) { return <div className="admin-empty"><span>НЕТ ДАННЫХ</span><h3>{title}</h3><p>{text}</p></div>; }
