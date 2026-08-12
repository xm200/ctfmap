import { useCallback, useEffect, useState } from 'react';
import { BridgeRoutes, isBridgePath } from './BridgeRoutes';
import { listPublic } from './api/publicEventsApi';
import { events as fallbackEvents } from './data/events';
import { AboutPage } from './pages/AboutPage';
import { EventPage } from './pages/EventPage';
import { MapPage } from './pages/MapPage';
import { NotFoundPage } from './pages/NotFoundPage';
import type { CtfEvent } from './types';

function currentPath(): string { return window.location.pathname; }
function getSlug(path: string): string | null { return path.match(/^\/events\/([^/]+)\/?$/)?.[1] ?? null; }

export default function App() {
  const [path, setPath] = useState(currentPath);
  const [events, setEvents] = useState<CtfEvent[]>(fallbackEvents);

  useEffect(() => {
    const handleNavigation = () => setPath(currentPath());
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  useEffect(() => {
    const isPublicEventPage = Boolean(getSlug(path));
    if (path !== '/' && !isPublicEventPage) return;

    const controller = new AbortController();
    const refreshEvents = () => listPublic(controller.signal)
      .then(setEvents)
      .catch(() => { /* В автономном режиме остаётся встроенный публичный набор. */ });

    void refreshEvents();
    const refreshInterval = window.setInterval(refreshEvents, 30_000);
    window.addEventListener('focus', refreshEvents);

    return () => {
      controller.abort();
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshEvents);
    };
  }, [path]);

  const navigate = useCallback((nextPath: string) => {
    window.history.pushState({}, '', nextPath);
    setPath(currentPath());
    window.scrollTo(0, 0);
  }, []);

  const openEvent = (event: CtfEvent) => navigate(`/events/${event.slug}`);
  const slug = getSlug(path);
  const activeEvent = slug ? events.find((event) => event.slug === slug) : null;

  if (path === '/about' || path === '/about/') return <AboutPage onNavigate={navigate} />;
  if (isBridgePath(path)) return <BridgeRoutes path={path} navigate={navigate} />;
  if (activeEvent) return <EventPage event={activeEvent} onBack={() => navigate('/')} />;
  if (slug) return <NotFoundPage onNavigate={navigate} />;
  return <MapPage events={events} onOpenEvent={openEvent} onOpenAbout={() => navigate('/about')} onOpenProfile={() => navigate('/profile')} />;
}
