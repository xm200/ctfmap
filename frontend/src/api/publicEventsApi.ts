import type { CtfEvent, EventDifficulty, RegionFeatureCollection } from '../types';
import type { AdminEvent } from '../types/admin';
import { apiRequest } from './client';

function validDifficulty(value: string): EventDifficulty {
  return ['Начальный', 'Средний', 'Высокий', 'Экспертный'].includes(value)
    ? value as EventDifficulty
    : 'Средний';
}

function dayOffset(value: string): number {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

type RegionCenter = { lat: number; lng: number };

function hasUsableCoordinates(event: AdminEvent): event is AdminEvent & RegionCenter {
  return Number.isFinite(event.lat) && Number.isFinite(event.lng)
    && Math.abs(event.lat ?? 0) > 1 && Math.abs(event.lng ?? 0) > 1;
}

function ringArea(ring: number[][]): number {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area / 2;
}

function ringCenter(ring: number[][]): RegionCenter | null {
  const area = ringArea(ring);
  if (Math.abs(area) < Number.EPSILON) return null;
  let lng = 0;
  let lat = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    const cross = current[0] * next[1] - next[0] * current[1];
    lng += (current[0] + next[0]) * cross;
    lat += (current[1] + next[1]) * cross;
  }
  return { lng: lng / (6 * area), lat: lat / (6 * area) };
}

function regionCenters(collection: RegionFeatureCollection): Map<string, RegionCenter> {
  const centers = new Map<string, RegionCenter>();
  for (const feature of collection.features) {
    const polygons = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    // Для составных субъектов флаг ставится в центр крупнейшей территории,
    // а не в середину общего bounding box, которая может оказаться вне региона.
    const outerRing = polygons
      .map((polygon) => polygon[0] as number[][])
      .sort((left, right) => Math.abs(ringArea(right)) - Math.abs(ringArea(left)))[0];
    const center = outerRing ? ringCenter(outerRing) : null;
    if (center && Number.isFinite(center.lng) && Number.isFinite(center.lat)) {
      centers.set(feature.properties.shapeISO, center);
    }
  }
  return centers;
}

export function toPublicEvent(event: AdminEvent, fallback?: RegionCenter): CtfEvent {
  const startOffsetDays = dayOffset(event.startDate);
  const endOffsetDays = dayOffset(event.endDate);
  const fullDescription = event.fullDescription?.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  const coordinates = hasUsableCoordinates(event) ? event : fallback;
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    shortTitle: event.shortTitle || event.title,
    category: event.category,
    difficulty: validDifficulty(event.difficulty),
    format: event.format,
    regionId: event.regionId,
    city: event.city,
    lat: coordinates?.lat ?? 0,
    lng: coordinates?.lng ?? 0,
    startOffsetDays,
    durationDays: Math.max(0, endOffsetDays - startOffsetDays),
    rating: event.rating,
    weight: event.weight,
    organizer: event.organizer || 'Организатор не указан',
    url: event.url || '',
    ctftimeUrl: event.ctftimeUrl || '',
    ctfNewsUrl: event.ctfNewsUrl || '',
    registrationUrl: event.registrationUrl || event.url || '',
    description: event.description || 'Описание будет опубликовано организатором.',
    fullDescription: fullDescription?.length ? fullDescription : event.description ? [event.description] : [],
    tags: event.tags || [],
    taskCategories: event.taskCategories || [],
    schedule: [
      { offsetDays: 0, time: '00:00', title: 'Начало соревнования' },
      { offsetDays: Math.max(1, endOffsetDays - startOffsetDays), time: '23:59', title: 'Завершение соревнования' },
    ],
    teamSize: event.teamSize || 'Уточняется',
    requirements: event.requirements || [],
    contacts: event.contacts || event.organizer || 'Уточняются',
  };
}

export async function listPublic(signal?: AbortSignal): Promise<CtfEvent[]> {
  const [events, collection] = await Promise.all([
    apiRequest<AdminEvent[]>('/events', { auth: false, signal }),
    fetch('/data/russia-regions.geojson', { signal }).then((response) => {
      if (!response.ok) throw new Error('Не удалось загрузить географию регионов.');
      return response.json() as Promise<RegionFeatureCollection>;
    }),
  ]);
  const centers = regionCenters(collection);
  return events
    .filter((event) => event.regionId && (hasUsableCoordinates(event) || centers.has(event.regionId)))
    .map((event) => toPublicEvent(event, centers.get(event.regionId)));
}
