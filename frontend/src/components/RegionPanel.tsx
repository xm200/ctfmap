import { CATEGORY_META } from '../data/events';
import { getMacroZone, getRegionName, ZONE_LABELS } from '../data/regions';
import type { CtfEvent } from '../types';
import { EventCard } from './EventCard';

interface RegionPanelProps {
  regionId: string;
  events: CtfEvent[];
  onClose: () => void;
  onDetails: (event: CtfEvent) => void;
}

export function RegionPanel({ regionId, events, onClose, onDetails }: RegionPanelProps) {
  const zone = getMacroZone(regionId);
  const counts = {
    elite: events.filter((item) => item.category === 'elite').length,
    local: events.filter((item) => item.category === 'local').length,
    training: events.filter((item) => item.category === 'training').length,
  };

  return (
    <aside className="region-panel hud-panel">
      <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть">×</button>
      <p className="eyebrow">ВЫБРАННЫЙ РЕГИОН // {ZONE_LABELS[zone]}</p>
      <h2>{getRegionName(regionId)}</h2>
      <div className="region-total">
        <strong>{String(events.length).padStart(2, '0')}</strong>
        <span>событий<br />в ближайшие 30 дней</span>
      </div>
      <div className="category-counts">
        {(Object.keys(counts) as Array<keyof typeof counts>).map((category) => (
          <div key={category} style={{ '--event-color': CATEGORY_META[category].color } as React.CSSProperties}>
            <i />
            <span>{CATEGORY_META[category].label}</span>
            <b>{counts[category]}</b>
          </div>
        ))}
      </div>
      <div className="region-events">
        {events.length > 0 ? events.map((event) => (
          <EventCard key={event.id} event={event} compact onDetails={onDetails} />
        )) : (
          <div className="empty-state">
            <span>NO SIGNAL</span>
            <p>На ближайшие 30 дней события не обнаружены.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
