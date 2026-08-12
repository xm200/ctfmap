import { useCallback, useEffect, useState } from 'react';
import { BridgeRoutes, isBridgePath } from './BridgeRoutes';
import { events } from './data/events';
import { EventPage } from './pages/EventPage';
import { MapPage } from './pages/MapPage';
import type { CtfEvent } from './types';

function currentPath(): string {
  return window.location.pathname;
}

function getSlug(path: string): string | null {
  const match = path.match(/^\/events\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}

export default function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const handleNavigation = () => setPath(currentPath());
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  const navigate = useCallback((nextPath: string) => {
    window.history.pushState({}, '', nextPath);
    setPath(currentPath());
    window.scrollTo(0, 0);
  }, []);

  const openEvent = (event: CtfEvent) => navigate(`/events/${event.slug}`);
  const slug = getSlug(path);
  const activeEvent = slug ? events.find((event) => event.slug === slug) : null;

  if (isBridgePath(path)) return <BridgeRoutes path={path} navigate={navigate} />;
  if (activeEvent) return <EventPage event={activeEvent} onBack={() => navigate('/')} />;
  return <MapPage onOpenEvent={openEvent} />;
}
