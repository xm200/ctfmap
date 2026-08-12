import { useMemo, useRef, useState } from 'react';
import { Brand } from '../components/Brand';
import { EventCard } from '../components/EventCard';
import { RussiaMap } from '../components/RussiaMap';
import { RegionPanel } from '../components/RegionPanel';
import { CATEGORY_META } from '../data/events';
import { useAuth } from '../auth/AuthContext';
import { getMacroZone, ZONE_LABELS } from '../data/regions';
import type { CtfEvent, EventCategory, MacroZone } from '../types';

interface MapPageProps {
  events: CtfEvent[];
  onOpenEvent: (event: CtfEvent) => void;
  onOpenProfile: () => void;
  onOpenAbout: () => void;
}

export function MapPage({ events, onOpenEvent, onOpenProfile, onOpenAbout }: MapPageProps) {
  const { isAuthenticated } = useAuth();
  const [activeZone, setActiveZone] = useState<MacroZone | 'all'>('all');
  const [activeCategories, setActiveCategories] = useState<Set<EventCategory>>(new Set(['elite', 'local', 'training']));
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<CtfEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CtfEvent | null>(null);
  const hoverTimer = useRef<number | null>(null);

  const filteredEvents = useMemo(() => events.filter((event) => (
    activeCategories.has(event.category)
    && (activeZone === 'all' || getMacroZone(event.regionId) === activeZone)
    && event.startOffsetDays + event.durationDays >= 0
  )), [activeCategories, activeZone, events]);

  const regionEvents = useMemo(
    () => selectedRegion ? filteredEvents.filter((event) => event.regionId === selectedRegion) : [],
    [filteredEvents, selectedRegion],
  );

  const toggleCategory = (category: EventCategory) => {
    setActiveCategories((current) => {
      const next = new Set(current);
      if (next.has(category) && next.size > 1) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const chooseZone = (zone: MacroZone | 'all') => {
    setActiveZone(zone);
    setSelectedRegion(null);
    setSelectedEvent(null);
  };

  const activeNow = filteredEvents.filter((event) => event.startOffsetDays <= 0 && event.startOffsetDays + event.durationDays >= 0).length;

  const handleEventHover = (event: CtfEvent | null) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    if (event) setHoveredEvent(event);
    else hoverTimer.current = window.setTimeout(() => setHoveredEvent(null), 280);
  };

  return (
    <main className="map-page">
      <div className="noise" />
      <header className="topbar">
        <Brand />
        <nav className="zone-nav" aria-label="Зоны России">
          <button className={activeZone === 'all' ? 'active' : ''} onClick={() => chooseZone('all')}>Вся Россия</button>
          {(Object.keys(ZONE_LABELS) as MacroZone[]).map((zone) => (
            <button key={zone} className={activeZone === zone ? 'active' : ''} onClick={() => chooseZone(zone)}>
              {ZONE_LABELS[zone]}
            </button>
          ))}
        </nav>
        <div className="map-top-actions">
          <button className="map-about-button" type="button" onClick={onOpenAbout}><span>О НАС</span></button>
          {isAuthenticated && <button className="map-profile-button" type="button" onClick={onOpenProfile}><span>ПРОФИЛЬ</span><i>→</i></button>}
        </div>
      </header>

      <section className="map-heading">
        <p className="eyebrow">ОБЗОР // CTF-СОРЕВНОВАНИЯ</p>
        <h1>КАРТА <span>СОРЕВНОВАНИЙ</span></h1>
        <p>Актуальные и предстоящие CTF России</p>
      </section>

      <RussiaMap
        events={filteredEvents}
        activeZone={activeZone}
        selectedRegion={selectedRegion}
        onSelectRegion={(regionId) => {
          setSelectedRegion(regionId);
          setSelectedEvent(null);
        }}
        onHoverEvent={handleEventHover}
        onSelectEvent={(event) => {
          setSelectedEvent(event);
          setSelectedRegion(null);
        }}
      />

      <aside className="filter-panel hud-panel">
        <p className="panel-code">ФИЛЬТРЫ КАРТЫ</p>
        <h2>Тип соревнования</h2>
        {(Object.keys(CATEGORY_META) as EventCategory[]).map((category) => (
          <button
            key={category}
            className={activeCategories.has(category) ? 'active' : ''}
            style={{ '--event-color': CATEGORY_META[category].color } as React.CSSProperties}
            onClick={() => toggleCategory(category)}
          >
            <i /><span>{CATEGORY_META[category].label}</span>
            <b>{events.filter((event) => event.category === category).length}</b>
          </button>
        ))}
        <div className="filter-note"><i /> Показываем текущие и ближайшие события</div>
      </aside>

      <div className="map-stats hud-panel">
        <div><span>ПРЯМО СЕЙЧАС</span><strong>{String(activeNow).padStart(2, '0')}</strong></div>
        <div><span>ОБНАРУЖЕНО</span><strong>{String(filteredEvents.length).padStart(2, '0')}</strong></div>
      </div>

      <div className="map-hint"><span>✥</span> ПЕРЕТАСКИВАТЬ <span>＋</span> КОЛЕСО — МАСШТАБ <span>◆</span> ВЫБРАТЬ</div>

      {hoveredEvent && !selectedEvent && !selectedRegion && (
        <div className="hover-card" onMouseEnter={() => {
          if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
        }} onMouseLeave={() => setHoveredEvent(null)}>
          <EventCard event={hoveredEvent} onDetails={onOpenEvent} />
        </div>
      )}

      {selectedEvent && (
        <div className="selected-event hud-panel">
          <button className="icon-button" onClick={() => setSelectedEvent(null)} aria-label="Закрыть">×</button>
          <EventCard event={selectedEvent} onDetails={onOpenEvent} />
        </div>
      )}

      {selectedRegion && (
        <RegionPanel
          regionId={selectedRegion}
          events={regionEvents}
          onClose={() => setSelectedRegion(null)}
          onDetails={onOpenEvent}
        />
      )}
    </main>
  );
}
