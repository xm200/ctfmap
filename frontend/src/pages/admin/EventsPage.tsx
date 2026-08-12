import { useEffect, useMemo, useState } from 'react';
import * as eventsApi from '../../api/eventsApi';
import { EmptyPanel, LoadingPanel, PageHeader } from '../../components/AdminUi';
import { StatusIndicator } from '../../components/StatusIndicator';
import type { AdminEvent } from '../../types/admin';

export function EventsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [events, setEvents] = useState<AdminEvent[] | null>(null); const [query, setQuery] = useState(''); const [status, setStatus] = useState('all');
  useEffect(() => { void eventsApi.list().then(setEvents); }, []);
  const filtered = useMemo(() => (events ?? []).filter((event) => (status === 'all' || event.status === status) && `${event.title} ${event.organizer} ${event.city} ${event.id}`.toLowerCase().includes(query.toLowerCase())), [events, query, status]);
  return <><PageHeader code="ADMIN / EVENTS" title="Event intelligence" description="Поиск, классификация и редактирование соревновательных узлов." actions={<div className="header-count"><span>TOTAL NODES</span><b>{String(events?.length ?? 0).padStart(2, '0')}</b></div>} />
    <div className="toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="SEARCH BY NAME, ID, ORGANIZER..." /></label><label className="select-box"><span>STATUS</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">ALL SIGNALS</option><option value="active">ACTIVE</option><option value="draft">DRAFT</option><option value="archived">ARCHIVED</option></select></label></div>
    {!events ? <LoadingPanel /> : filtered.length === 0 ? <EmptyPanel title="События не обнаружены" text="Измените параметры поискового протокола." /> : <section className="admin-table"><div className="table-row table-head"><span>EVENT NODE</span><span>ORGANIZER</span><span>SCHEDULE</span><span>LOCATION / FORMAT</span><span>STATUS</span><span /></div>{filtered.map((event) => <button className="table-row" key={event.id} onClick={() => onNavigate(`/admin/events/${event.id}`)}><span><small>{event.id.toUpperCase()}</small><strong>{event.title}</strong><em>{event.difficulty} // {event.category}</em></span><span>{event.organizer}<small>{event.source}</small></span><span>{event.startDate}<small>TO {event.endDate}</small></span><span>{event.city}<small>{event.format.toUpperCase()}</small></span><span><StatusIndicator status={event.status} /></span><span className="row-arrow">→</span></button>)}</section>}
  </>;
}
