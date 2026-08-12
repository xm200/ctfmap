import type { CtfEvent } from '../types';
import { CATEGORY_META } from '../data/events';
import { getRegionName } from '../data/regions';
import { formatDate, getEventTiming, getStartLabel } from '../utils/date';

interface EventCardProps {
  event: CtfEvent;
  compact?: boolean;
  onDetails: (event: CtfEvent) => void;
}

export function EventCard({ event, compact = false, onDetails }: EventCardProps) {
  const meta = CATEGORY_META[event.category];
  const timing = getEventTiming(event);

  return (
    <article className={`event-card ${compact ? 'event-card--compact' : ''}`} style={{ '--event-color': meta.color } as React.CSSProperties}>
      <div className="event-card__topline">
        <span className="event-category"><i />{meta.short}</span>
        <span className={`status status--${timing.status}`}>{getStartLabel(event)}</span>
      </div>
      <h3>{event.title}</h3>
      <p className="event-location">{event.city} <span>//</span> {event.format.toUpperCase()}</p>
      {!compact && <p className="event-description">{event.description}</p>}
      <div className="event-card__metrics">
        <span><small>CTFTIME</small><b>{event.rating.toFixed(1)}</b></span>
        <span><small>СЛОЖНОСТЬ</small><b>{event.difficulty}</b></span>
        <span><small>СТАРТ</small><b>{formatDate(timing.start)}</b></span>
      </div>
      {!compact && <p className="event-region">REGION NODE: {getRegionName(event.regionId)}</p>}
      <button className="button button--primary" type="button" onClick={() => onDetails(event)}>
        Подробнее <span>↗</span>
      </button>
    </article>
  );
}
