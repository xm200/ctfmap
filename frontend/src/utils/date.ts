import type { CtfEvent, EventTiming } from '../types';

export function getEventTiming(event: CtfEvent): EventTiming {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() + event.startOffsetDays);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + event.durationDays);

  return {
    start,
    end,
    status: event.startOffsetDays <= 0 && event.startOffsetDays + event.durationDays >= 0
      ? 'ongoing'
      : 'upcoming',
  };
}

export function formatDate(date: Date, withTime = false): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date).replace('.', '');
}

export function getStartLabel(event: CtfEvent): string {
  const timing = getEventTiming(event);
  if (timing.status === 'ongoing') return 'Идёт сейчас';
  if (event.startOffsetDays === 1) return 'Старт завтра';
  return `Старт через ${event.startOffsetDays} дн.`;
}

export function getCountdownLabel(event: CtfEvent): string {
  const timing = getEventTiming(event);
  if (timing.status === 'ongoing') return 'LIVE';
  if (event.startOffsetDays <= 0) return 'SOON';
  if (event.startOffsetDays === 1) return 'T−24H';
  return `T−${String(event.startOffsetDays).padStart(2, '0')}D`;
}

export function getUrgencyLevel(event: CtfEvent): 'live' | 'critical' | 'near' | 'soon' | 'normal' {
  const timing = getEventTiming(event);
  if (timing.status === 'ongoing') return 'live';
  if (event.startOffsetDays <= 1) return 'critical';
  if (event.startOffsetDays <= 3) return 'near';
  if (event.startOffsetDays <= 7) return 'soon';
  return 'normal';
}

export function getScheduleDate(event: CtfEvent, offsetDays: number): Date {
  const { start } = getEventTiming(event);
  const date = new Date(start);
  date.setDate(date.getDate() + offsetDays);
  return date;
}
