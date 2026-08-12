import { useEffect } from 'react';
import { useAuth } from './auth/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { EventEditPage } from './pages/admin/EventEditPage';
import { EventsPage } from './pages/admin/EventsPage';
import { RegistrationsPage } from './pages/admin/RegistrationsPage';
import { UserEditPage } from './pages/admin/UserEditPage';
import { UsersPage } from './pages/admin/UsersPage';
import { VerificationPage } from './pages/admin/VerificationPage';

interface BridgeRoutesProps {
  path: string;
  navigate: (path: string) => void;
}

export function isBridgePath(path: string): boolean {
  const normalizedPath = path.replace(/\/$/, '') || '/';
  return normalizedPath === '/login'
    || normalizedPath === '/register'
    || normalizedPath === '/admin'
    || normalizedPath.startsWith('/admin/');
}

/**
 * Merge-friendly route fragment for the host application's existing router.
 * Returns null when the path does not belong to auth/admin functionality.
 */
export function BridgeRoutes({ path, navigate }: BridgeRoutesProps) {
  const auth = useAuth();
  const normalizedPath = path.replace(/\/$/, '') || '/';
  const isAdminPath = normalizedPath === '/admin' || normalizedPath.startsWith('/admin/');

  useEffect(() => {
    if (isAdminPath && !auth.isLoading && !auth.isAuthenticated) navigate('/login');
  }, [auth.isAuthenticated, auth.isLoading, isAdminPath, navigate]);

  if (normalizedPath === '/login') {
    return <LoginPage onNavigate={navigate} onLogin={async (identifier, password) => {
      const user = await auth.login(identifier, password);
      navigate(user.role === 'admin' ? '/admin' : '/');
    }} />;
  }

  if (normalizedPath === '/register') return <RegisterPage onNavigate={navigate} />;
  if (!isAdminPath) return null;

  if (auth.isLoading) {
    return <main className="boot-screen"><div className="noise" /><i /><span>VALIDATING SESSION</span><small>ADMIN GATEWAY // RU-01</small></main>;
  }
  if (!auth.isAuthenticated) return null;
  if (!auth.isAdmin) return <NotFoundPage onNavigate={navigate} />;

  const eventMatch = normalizedPath.match(/^\/admin\/events\/([^/]+)$/);
  const userMatch = normalizedPath.match(/^\/admin\/users\/([^/]+)$/);
  let page: React.ReactNode;

  if (normalizedPath === '/admin') page = <DashboardPage onNavigate={navigate} />;
  else if (normalizedPath === '/admin/events') page = <EventsPage onNavigate={navigate} />;
  else if (eventMatch) page = <EventEditPage id={eventMatch[1]} onNavigate={navigate} />;
  else if (normalizedPath === '/admin/users') page = <UsersPage onNavigate={navigate} />;
  else if (userMatch) page = <UserEditPage id={userMatch[1]} onNavigate={navigate} />;
  else if (normalizedPath === '/admin/verification') page = <VerificationPage />;
  else if (normalizedPath === '/admin/registrations') page = <RegistrationsPage />;
  else return <NotFoundPage onNavigate={navigate} />;

  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  return <AdminLayout
    path={normalizedPath}
    user={currentUser}
    onNavigate={navigate}
    onLogout={() => { void auth.logout().then(() => navigate('/login')); }}
  >{page}</AdminLayout>;
}


