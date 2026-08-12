import { Brand } from '../components/Brand';
import { CATEGORY_META } from '../data/events';
import { getMacroZone, getRegionName, ZONE_LABELS } from '../data/regions';
import type { CtfEvent } from '../types';
import { formatDate, getCountdownLabel, getEventTiming, getScheduleDate, getStartLabel } from '../utils/date';

interface EventPageProps {
  event: CtfEvent;
  onBack: () => void;
}

const FORMAT_LABELS = {
  online: 'Онлайн',
  offline: 'Очно',
  hybrid: 'Гибридный',
} as const;

export function EventPage({ event, onBack }: EventPageProps) {
  const meta = CATEGORY_META[event.category];
  const timing = getEventTiming(event);

  return (
    <main className="details-page" style={{ '--event-color': meta.color } as React.CSSProperties}>
      <div className="noise" />
      <header className="topbar details-topbar">
        <Brand />
        <button className="back-button" type="button" onClick={onBack}>← Назад к карте</button>
        <div className="system-status"><span><i />СОБЫТИЕ</span><small>{event.id.toUpperCase()}</small></div>
      </header>

      <article className="event-dossier">
        <header className="dossier-hero">
          <div className="details-breadcrumb">CTFMAP / {getRegionName(event.regionId).toUpperCase()} / {event.shortTitle}</div>
          <div className="dossier-hero__meta">
            <span className="event-category large"><i />{meta.label}</span>
            <span className={`dossier-live dossier-live--${timing.status}`}>{getCountdownLabel(event)} · {getStartLabel(event)}</span>
          </div>
          <div className="dossier-hero__content">
            <div>
              <h1>{event.title}</h1>
              <p>{event.description}</p>
            </div>
            <div className="dossier-score">
              <span>Рейтинг CTFтайм</span>
              <strong>{event.rating.toFixed(1)}</strong>
              <small>Вес события: {event.weight.toFixed(1)}</small>
            </div>
          </div>
          <div className="dossier-actions">
            {event.registrationUrl && <a className="button button--primary" href={event.registrationUrl} target="_blank" rel="noreferrer">Регистрация ↗</a>}
            {event.ctfNewsUrl && <a className="button button--ghost" href={event.ctfNewsUrl} target="_blank" rel="noreferrer">Читать в «Новости CTF» ↗</a>}
            {event.ctftimeUrl && <a className="button button--ghost" href={event.ctftimeUrl} target="_blank" rel="noreferrer">Страница CTFтайм ↗</a>}
            {event.url && <a className="button button--ghost" href={event.url} target="_blank" rel="noreferrer">Сайт организатора ↗</a>}
          </div>
        </header>

        <section className="dossier-facts" aria-label="Ключевая информация">
          <div><span>Даты</span><strong>{formatDate(timing.start)} — {formatDate(timing.end)}</strong></div>
          <div><span>Формат</span><strong>{FORMAT_LABELS[event.format]}</strong></div>
          <div><span>Команда</span><strong>{event.teamSize}</strong></div>
          <div><span>Сложность</span><strong>{event.difficulty}</strong></div>
        </section>

        <div className="dossier-layout">
          <div className="dossier-main">
            {(event.fullDescription.length > 0 || event.taskCategories.length > 0) && <section className="dossier-section">
              <p className="section-kicker">01 / ОБЗОР</p>
              <h2>О соревновании</h2>
              <div className="dossier-copy">
                {event.fullDescription.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <div className="task-tags" aria-label="Категории заданий">
                {event.taskCategories.map((category) => <span key={category}>{category}</span>)}
              </div>
            </section>}

            {event.schedule.length > 0 && <section className="dossier-section">
              <p className="section-kicker">02 / РАСПИСАНИЕ</p>
              <h2>Расписание</h2>
              <ol className="event-timeline">
                {event.schedule.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    <div className="timeline-date">
                      <strong>{formatDate(getScheduleDate(event, item.offsetDays))}</strong>
                      <span>{item.time}</span>
                    </div>
                    <div><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</div>
                  </li>
                ))}
              </ol>
            </section>}

            {event.requirements.length > 0 && <section className="dossier-section">
              <p className="section-kicker">03 / УЧАСТИЕ</p>
              <h2>Что потребуется</h2>
              <ul className="requirement-list">
                {event.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}
              </ul>
            </section>}

            {event.learningMaterials && event.learningMaterials.length > 0 && (
              <section className="dossier-section dossier-learning">
                <p className="section-kicker">04 / ДОПОЛНИТЕЛЬНО</p>
                <h2>Материалы для подготовки</h2>
                <p className="section-intro">Организатор рекомендует эти материалы перед участием в соревновании.</p>
                <div className="learning-grid">
                  {event.learningMaterials.map((material, index) => (
                    <a key={material.title} href={material.url} target="_blank" rel="noreferrer">
                      <span>{String(index + 1).padStart(2, '0')} · {material.level}</span>
                      <h3>{material.title}</h3>
                      <p>{material.description}</p>
                      <b>Открыть материал ↗</b>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="dossier-sidebar">
            <section>
              <p className="section-kicker">СВОДКА</p>
              <dl className="summary-list">
                <div><dt>Статус</dt><dd className={`status status--${timing.status}`}>{getStartLabel(event)}</dd></div>
                <div><dt>Начало</dt><dd>{formatDate(timing.start, true)}</dd></div>
                <div><dt>Завершение</dt><dd>{formatDate(timing.end, true)}</dd></div>
                <div><dt>Категория</dt><dd>{meta.label}</dd></div>
                <div><dt>Формат</dt><dd>{FORMAT_LABELS[event.format]}</dd></div>
                <div><dt>Город</dt><dd>{event.city}</dd></div>
                <div><dt>Регион</dt><dd>{getRegionName(event.regionId)}</dd></div>
                <div><dt>Зона</dt><dd>{ZONE_LABELS[getMacroZone(event.regionId)]}</dd></div>
              </dl>
            </section>

            <section className="organizer-summary">
              <p className="section-kicker">ОРГАНИЗАТОР</p>
              <span className="organizer-logo">{event.organizer.slice(0, 2).toUpperCase()}</span>
              <h3>{event.organizer}</h3>
              <p>{event.contacts}</p>
            </section>

            <section className="dossier-note">
              <p className="section-kicker">ВАЖНО</p>
              <p>Проверьте дедлайн регистрации и правила соревнования на официальной странице. Расписание организатора имеет приоритет.</p>
            </section>
          </aside>
        </div>
      </article>
    </main>
  );
}
