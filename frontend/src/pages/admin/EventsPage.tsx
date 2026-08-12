import { useEffect, useMemo, useState } from 'react';
import * as eventsApi from '../../api/eventsApi';
import { EmptyPanel, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { AdminEvent } from '../../types/admin';
import { CATEGORY_LABELS, FORMAT_LABELS, SOURCE_LABELS } from '../../utils/labels';

interface EventFilters {
  id: string;
  competition: string;
  organizer: string;
  schedule: string;
  location: string;
  status: string;
}

const EMPTY_FILTERS: EventFilters = {
  id: '',
  competition: '',
  organizer: '',
  schedule: '',
  location: '',
  status: 'all',
};

const includes = (value: unknown, filter: string) => String(value ?? '').toLowerCase().includes(filter.trim().toLowerCase());

export function EventsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);

  useEffect(() => { void eventsApi.list().then(setEvents); }, []);

  const setFilter = (field: keyof EventFilters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const filtered = useMemo(() => (events ?? []).filter((event) => {
    const category = CATEGORY_LABELS[event.category];
    const format = FORMAT_LABELS[event.format];
    const source = SOURCE_LABELS[event.source] ?? event.source;
    const globalValue = `${event.id} ${event.title} ${event.difficulty} ${category} ${event.organizer} ${source} ${event.startDate} ${event.endDate} ${event.city} ${format}`;
    return includes(globalValue, query)
      && includes(event.id, filters.id)
      && includes(`${event.title} ${event.difficulty} ${category}`, filters.competition)
      && includes(`${event.organizer} ${source}`, filters.organizer)
      && includes(`${event.startDate} ${event.endDate}`, filters.schedule)
      && includes(`${event.city} ${format}`, filters.location)
      && (filters.status === 'all' || event.status === filters.status);
  }), [events, query, filters]);

  const hasFilters = Boolean(query.trim()) || Object.entries(filters).some(([key, value]) => value !== (key === 'status' ? 'all' : ''));
  const resetFilters = () => { setQuery(''); setFilters(EMPTY_FILTERS); };

  return <>
    <PageHeader code="АДМИНИСТРАТОР / СОРЕВНОВАНИЯ" title="Управление соревнованиями" description="Поиск, классификация и редактирование соревновательных узлов." actions={<div className="header-count"><span>ВСЕГО</span><b>{String(events?.length ?? 0).padStart(2, '0')}</b></div>} />
    <div className="toolbar table-toolbar">
      <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ОБЩИЙ ПОИСК ПО ВСЕМ КОЛОНКАМ..." /></label>
      <button type="button" className="filter-reset" onClick={resetFilters} disabled={!hasFilters}>СБРОСИТЬ ФИЛЬТРЫ</button>
    </div>
    {!events ? <LoadingPanel /> : <section className="admin-table event-table">
      <div className="table-row table-head"><span>ID</span><span>СОРЕВНОВАНИЕ</span><span>ОРГАНИЗАТОР</span><span>РАСПИСАНИЕ</span><span>МЕСТО / ФОРМАТ</span><span>СТАТУС</span><span /></div>
      <div className="table-row table-filters">
        <span><input aria-label="Фильтр по ID соревнования" value={filters.id} onChange={(event) => setFilter('id', event.target.value)} placeholder="ID" /></span>
        <span><input aria-label="Фильтр по соревнованию" value={filters.competition} onChange={(event) => setFilter('competition', event.target.value)} placeholder="НАЗВАНИЕ / ТИП" /></span>
        <span><input aria-label="Фильтр по организатору" value={filters.organizer} onChange={(event) => setFilter('organizer', event.target.value)} placeholder="ОРГАНИЗАТОР / ИСТОЧНИК" /></span>
        <span><input aria-label="Фильтр по расписанию" value={filters.schedule} onChange={(event) => setFilter('schedule', event.target.value)} placeholder="ДАТА" /></span>
        <span><input aria-label="Фильтр по месту или формату" value={filters.location} onChange={(event) => setFilter('location', event.target.value)} placeholder="МЕСТО / ФОРМАТ" /></span>
        <span><select aria-label="Фильтр по статусу" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}><option value="all">ВСЕ</option><option value="active">АКТИВНО</option><option value="draft">ЧЕРНОВИК</option><option value="archived">В АРХИВЕ</option></select></span><span />
      </div>
      {filtered.length === 0
        ? <div className="table-empty"><EmptyPanel title="События не обнаружены" text="Измените параметры поискового протокола." /></div>
        : filtered.map((event) => <button className="table-row" key={event.id} onClick={() => onNavigate(`/admin/events/${event.id}`)}><span className="mono-value">{event.id}</span><span><strong>{event.title}</strong><em>{event.difficulty} // {CATEGORY_LABELS[event.category]}</em></span><span>{event.organizer}<small>{SOURCE_LABELS[event.source] ?? event.source}</small></span><span>{event.startDate}<small>ДО {event.endDate}</small></span><span>{event.city}<small>{FORMAT_LABELS[event.format]}</small></span><span><StatusIndicator status={event.status} /></span><span className="row-arrow">→</span></button>)}
    </section>}
  </>;
}
