import { useEffect, useMemo, useState } from 'react';
import * as eventsApi from '../../api/eventsApi';
import { EmptyPanel, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { AdminEvent } from '../../types/admin';
import { CATEGORY_LABELS, FORMAT_LABELS, SOURCE_LABELS } from '../../utils/labels';

type EventSortKey = 'id' | 'competition' | 'organizer' | 'schedule' | 'location' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortState<T> {
  key: T;
  direction: SortDirection;
}

const compareText = (left: string, right: string) => left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' });

const compareId = (left: string, right: string) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return compareText(left, right);
};

export function EventsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [sort, setSort] = useState<SortState<EventSortKey> | null>(null);

  useEffect(() => { void eventsApi.list().then(setEvents); }, []);

  const toggleSort = (key: EventSortKey) => {
    setSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const sortedEvents = useMemo(() => {
    const items = [...(events ?? [])];
    if (!sort) {
      return items;
    }

    const direction = sort.direction === 'asc' ? 1 : -1;
    items.sort((left, right) => {
      let result = 0;

      switch (sort.key) {
        case 'id':
          result = compareId(left.id, right.id);
          break;
        case 'competition':
          result = compareText(
            `${left.title} ${left.difficulty} ${CATEGORY_LABELS[left.category]}`.trim(),
            `${right.title} ${right.difficulty} ${CATEGORY_LABELS[right.category]}`.trim(),
          );
          break;
        case 'organizer':
          result = compareText(
            `${left.organizer} ${SOURCE_LABELS[left.source] ?? left.source}`.trim(),
            `${right.organizer} ${SOURCE_LABELS[right.source] ?? right.source}`.trim(),
          );
          break;
        case 'schedule':
          result = new Date(left.startDate).getTime() - new Date(right.startDate).getTime();
          if (result === 0) {
            result = new Date(left.endDate).getTime() - new Date(right.endDate).getTime();
          }
          break;
        case 'location':
          result = compareText(`${left.city} ${FORMAT_LABELS[left.format]}`.trim(), `${right.city} ${FORMAT_LABELS[right.format]}`.trim());
          break;
        case 'status':
          result = compareText(left.status, right.status);
          break;
      }

      return result * direction;
    });

    return items;
  }, [events, sort]);

  const renderSortIcon = (key: EventSortKey) => {
    if (sort?.key !== key) {
      return '↕';
    }
    return sort.direction === 'asc' ? '↑' : '↓';
  };

  return <>
    <PageHeader code="АДМИНИСТРАТОР / СОРЕВНОВАНИЯ" title="Управление соревнованиями" description="Поиск, классификация и редактирование соревновательных узлов." actions={<div className="header-count"><span>ВСЕГО</span><b>{String(events?.length ?? 0).padStart(2, '0')}</b></div>} />
    {!events ? <LoadingPanel /> : <section className="admin-table event-table">
      <div className="table-row table-head">
        <span><button type="button" className="table-sort" onClick={() => toggleSort('id')}><span className="table-sort__label">ID</span><span className="table-sort__icon">{renderSortIcon('id')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('competition')}><span className="table-sort__label">СОРЕВНОВАНИЕ</span><span className="table-sort__icon">{renderSortIcon('competition')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('organizer')}><span className="table-sort__label">ОРГАНИЗАТОР</span><span className="table-sort__icon">{renderSortIcon('organizer')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('schedule')}><span className="table-sort__label">РАСПИСАНИЕ</span><span className="table-sort__icon">{renderSortIcon('schedule')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('location')}><span className="table-sort__label">МЕСТО / ФОРМАТ</span><span className="table-sort__icon">{renderSortIcon('location')}</span></button></span>
        <span><button type="button" className="table-sort" onClick={() => toggleSort('status')}><span className="table-sort__label">СТАТУС</span><span className="table-sort__icon">{renderSortIcon('status')}</span></button></span>
        <span />
      </div>
      {sortedEvents.length === 0
        ? <div className="table-empty"><EmptyPanel title="События не обнаружены" text="В системе пока нет соревнований для отображения." /></div>
        : sortedEvents.map((event) => <button className="table-row" key={event.id} onClick={() => onNavigate(`/admin/events/${event.id}`)}><span className="mono-value">{event.id}</span><span><strong>{event.title}</strong><em>{event.difficulty} // {CATEGORY_LABELS[event.category]}</em></span><span>{event.organizer}<small>{SOURCE_LABELS[event.source] ?? event.source}</small></span><span>{event.startDate}<small>ДО {event.endDate}</small></span><span>{event.city}<small>{FORMAT_LABELS[event.format]}</small></span><span><StatusIndicator status={event.status} /></span><span className="row-arrow">→</span></button>)}
    </section>}
  </>;
}
