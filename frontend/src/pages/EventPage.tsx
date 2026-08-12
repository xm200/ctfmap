import { Brand } from '../components/Brand';
import { CATEGORY_META } from '../data/events';
import { getMacroZone, getRegionName, ZONE_LABELS } from '../data/regions';
import type { CtfEvent } from '../types';
import { formatDate, getEventTiming, getStartLabel } from '../utils/date';

interface EventPageProps {
  event: CtfEvent;
  onBack: () => void;
}

export function EventPage({ event, onBack }: EventPageProps) {
  const meta = CATEGORY_META[event.category];
  const timing = getEventTiming(event);

  return (
    <main className="details-page" style={{ '--event-color': meta.color } as React.CSSProperties}>
      <div className="noise" />
      <header className="topbar details-topbar">
        <Brand />
        <button className="back-button" type="button" onClick={onBack}>← Назад к карте</button>
        <div className="system-status"><span><i />EVENT NODE</span><small>{event.id.toUpperCase()}</small></div>
      </header>

      <div className="details-grid">
        <section className="details-hero">
          <div className="details-breadcrumb">MAP / {getRegionName(event.regionId).toUpperCase()} / {event.shortTitle}</div>
          <div className="event-category large"><i />{meta.label} // {event.format}</div>
          <h1>{event.title}</h1>
          <p className="details-lead">{event.description}</p>
          <div className="details-tags">{event.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
          <div className="details-actions">
            <a className="button button--primary" href={event.url} target="_blank" rel="noreferrer">Официальная страница ↗</a>
            <button className="button button--ghost" type="button" onClick={onBack}>Вернуться к карте</button>
          </div>
        </section>

        <aside className="event-score hud-panel">
          <p className="panel-code">CTFTIME SIGNAL</p>
          <div className="score-ring"><strong>{event.rating.toFixed(1)}</strong><span>/ 100</span></div>
          <div className="score-bar"><i style={{ width: `${event.rating}%` }} /></div>
          <p>Рейтинг события по данным CTFtime</p>
        </aside>

        <section className="details-data hud-panel">
          <p className="panel-code">OPERATION DATA</p>
          <div className="data-row"><span>Статус</span><b className={`status status--${timing.status}`}>{getStartLabel(event)}</b></div>
          <div className="data-row"><span>Начало</span><b>{formatDate(timing.start, true)}</b></div>
          <div className="data-row"><span>Завершение</span><b>{formatDate(timing.end, true)}</b></div>
          <div className="data-row"><span>Сложность</span><b>{event.difficulty}</b></div>
          <div className="data-row"><span>Вес CTFtime</span><b>{event.weight.toFixed(1)}</b></div>
          <div className="data-row"><span>Формат</span><b>{event.format.toUpperCase()}</b></div>
        </section>

        <section className="details-location hud-panel">
          <p className="panel-code">REGION NODE</p>
          <div className="location-radar"><i /><i /><i /><b /></div>
          <h2>{event.city}</h2>
          <p>{getRegionName(event.regionId)}</p>
          <span>{ZONE_LABELS[getMacroZone(event.regionId)]}</span>
          <small>{event.lat.toFixed(4)} N // {event.lng.toFixed(4)} E</small>
        </section>

        <section className="details-organizer hud-panel">
          <p className="panel-code">ORGANIZER</p>
          <span className="organizer-logo">{event.organizer.slice(0, 2).toUpperCase()}</span>
          <div><h3>{event.organizer}</h3><p>Верифицированный организатор</p></div>
        </section>
      </div>
    </main>
  );
}
