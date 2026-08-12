import { useEffect, useState } from 'react';
import { events } from './data/events';
import { EventPage } from './pages/EventPage';
import { MapPage } from './pages/MapPage';
import type { CtfEvent } from './types';

function getSlug(): string | null {
  const match = window.location.pathname.match(/^\/events\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}

export default function App() {
  const [slug, setSlug] = useState(getSlug);

  useEffect(() => {
    const handleNavigation = () => setSlug(getSlug());
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setSlug(getSlug());
    window.scrollTo(0, 0);
  };

  const openEvent = (event: CtfEvent) => navigate(`/events/${event.slug}`);
  const activeEvent = slug ? events.find((event) => event.slug === slug) : null;

  if (activeEvent) return <EventPage event={activeEvent} onBack={() => navigate('/')} />;
  return <MapPage onOpenEvent={openEvent} />;
}
