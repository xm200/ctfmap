import type { CtfEvent, EventCategory } from '../types';

export const CATEGORY_META: Record<EventCategory, { label: string; color: string; short: string }> = {
  elite: { label: 'Профессиональные', color: '#a855f7', short: 'ПРОФИ' },
  local: { label: 'Локальные', color: '#ff7a00', short: 'МЕСТНЫЕ' },
  training: { label: 'Тренировки', color: '#f4f7ff', short: 'ТРЕНИНГ' },
};

const DEFAULT_SCHEDULE = [
  { offsetDays: -2, time: '20:00', title: 'Окончание регистрации', description: 'После дедлайна состав команды фиксируется.' },
  { offsetDays: 0, time: '10:00', title: 'Старт соревнования', description: 'Открывается платформа и публикуются задания.' },
  { offsetDays: 1, time: '18:00', title: 'Финиш и заморозка таблицы', description: 'Решения после указанного времени не принимаются.' },
  { offsetDays: 1, time: '20:00', title: 'Результаты и разборы', description: 'Организаторы публикуют таблицу и первые разборы решений.' },
];

const DEFAULT_MATERIALS = [
  { title: 'Руководство по CTF', description: 'Базовая методология решения задач и организация командной работы.', url: 'https://ctf101.org/', level: 'Начальный' as const },
  { title: 'Академия веб-безопасности PortSwigger', description: 'Практические лабораторные работы для подготовки к категории веб-безопасности.', url: 'https://portswigger.net/web-security', level: 'Средний' as const },
  { title: 'Колледж бинарной эксплуатации', description: 'Интерактивный курс по системной безопасности, обратной разработке и бинарной эксплуатации.', url: 'https://pwn.college/', level: 'Высокий' as const },
];

const EVENT_DEFAULTS = {
  ctftimeUrl: 'https://ctftime.org/',
  ctfNewsUrl: 'https://ctfnews.ru/',
  registrationUrl: 'https://ctftime.org/',
  fullDescription: [
    'Соревнование объединяет практические задачи по информационной безопасности и ориентировано на командное решение в ограниченное время.',
    'Участникам предстоит анализировать приложения и инфраструктуру, находить уязвимости, восстанавливать данные и получать флаги. Формат подойдёт тем, кто хочет проверить навыки в условиях, близких к реальной работе специалистов по безопасности.',
  ],
  taskCategories: ['Веб-безопасность', 'Бинарная эксплуатация', 'Обратная разработка', 'Криптография', 'Цифровая криминалистика', 'Разведка по открытым источникам'],
  schedule: DEFAULT_SCHEDULE,
  teamSize: '2–5 участников',
  requirements: ['Ноутбук с операционной системой на базе Линукс или виртуальной машиной', 'Стабильное интернет-соединение', 'Канал связи с организаторами', 'Учётная запись на платформе соревнования'],
  contacts: 'Организаторы отвечают на вопросы в официальных каналах связи соревнования.',
};

const rawEvents: Array<Omit<CtfEvent, keyof typeof EVENT_DEFAULTS> & Partial<Pick<CtfEvent, keyof typeof EVENT_DEFAULTS>>> = [
  {
    id: 'evt-001', slug: 'cyber-moscow-finals', title: 'Кибер-Москва: финал 2026', shortTitle: 'КМ 2026',
    category: 'elite', difficulty: 'Экспертный', format: 'hybrid', regionId: 'RU-MOW', city: 'Москва',
    lat: 55.7558, lng: 37.6173, startOffsetDays: 5, durationDays: 2, rating: 96.4, weight: 82.5,
    organizer: 'Кибер-Москва', url: 'https://ctftime.org/',
    description: 'Финал всероссийского командного турнира: веб-безопасность, бинарная эксплуатация, обратная разработка, криптография и цифровая криминалистика.',
    tags: ['Задачи', 'Финал', 'Командное'],
  },
  {
    id: 'evt-002', slug: 'spb-neon-ctf', title: 'Неоновый CTF Петербурга', shortTitle: 'НЕОН CTF',
    category: 'local', difficulty: 'Высокий', format: 'offline', regionId: 'RU-SPE', city: 'Санкт-Петербург',
    lat: 59.9343, lng: 30.3351, startOffsetDays: 12, durationDays: 1, rating: 78.8, weight: 41.2,
    organizer: 'Безопасность Невы', url: 'https://ctftime.org/',
    description: 'Открытый турнир Северо-Запада с квалификацией и очным финалом.',
    tags: ['Задачи', 'Студенческое'],
  },
  {
    id: 'evt-003', slug: 'volga-web-lab', title: 'Лаборатория веб-безопасности «Волга»', shortTitle: 'ВОЛГА ЛАБ',
    category: 'training', difficulty: 'Начальный', format: 'online', regionId: 'RU-TA', city: 'Казань',
    lat: 55.7961, lng: 49.1064, startOffsetDays: -1, durationDays: 3, rating: 64.2, weight: 0,
    organizer: 'Казанское сообщество CTF', url: 'https://ctftime.org/',
    description: 'Тренировочный полигон для знакомства с основами веб-безопасности.',
    tags: ['Веб-безопасность', 'Для начинающих', 'Онлайн'],
  },
  {
    id: 'evt-004', slug: 'ural-industrial-ctf', title: 'Уральский промышленный CTF', shortTitle: 'УРАЛ АСУ ТП',
    category: 'elite', difficulty: 'Экспертный', format: 'offline', regionId: 'RU-SVE', city: 'Екатеринбург',
    lat: 56.8389, lng: 60.6057, startOffsetDays: 20, durationDays: 2, rating: 91.1, weight: 73.4,
    organizer: 'Уральская киберлаборатория', url: 'https://ctftime.org/',
    description: 'Соревнование по защите промышленных систем и атаке инфраструктуры.',
    tags: ['Атака и защита', 'АСУ ТП', 'Командное'],
  },
  {
    id: 'evt-005', slug: 'nsk-siberia-ctf', title: 'Открытый CTF Сибири', shortTitle: 'СИБИРЬ CTF',
    category: 'elite', difficulty: 'Высокий', format: 'hybrid', regionId: 'RU-NVS', city: 'Новосибирск',
    lat: 55.0084, lng: 82.9357, startOffsetDays: 8, durationDays: 2, rating: 89.7, weight: 68.9,
    organizer: 'Сибирская команда безопасности', url: 'https://ctftime.org/',
    description: 'Межрегиональный CTF с онлайн-квалификацией и финалом в Новосибирске.',
    tags: ['Задачи', 'Отбор', 'Финал'],
  },
  {
    id: 'evt-006', slug: 'tomsk-reverse-night', title: 'Томская ночь реверса', shortTitle: 'НОЧЬ РЕВЕРСА',
    category: 'local', difficulty: 'Средний', format: 'offline', regionId: 'RU-TOM', city: 'Томск',
    lat: 56.4846, lng: 84.9476, startOffsetDays: 3, durationDays: 1, rating: 72.5, weight: 28.3,
    organizer: 'Томский CTF', url: 'https://ctftime.org/',
    description: 'Ночной турнир по обратной разработке для студенческих команд Сибири.',
    tags: ['Обратная разработка', 'Студенческое'],
  },
  {
    id: 'evt-007', slug: 'krasnoyarsk-pwn-school', title: 'Школа бинарной эксплуатации Красноярска', shortTitle: 'ШКОЛА БИНАРНОЙ ЭКСПЛУАТАЦИИ',
    category: 'training', difficulty: 'Средний', format: 'online', regionId: 'RU-KYA', city: 'Красноярск',
    lat: 56.0153, lng: 92.8932, startOffsetDays: 16, durationDays: 4, rating: 67.1, weight: 0,
    organizer: 'Красноярская безопасность', url: 'https://ctftime.org/',
    description: 'Практический интенсив и набор задач по бинарной эксплуатации.',
    tags: ['Бинарная эксплуатация', 'Практикум', 'Онлайн'],
  },
  {
    id: 'evt-008', slug: 'baikal-crypto-quest', title: 'Байкальский криптографический квест', shortTitle: 'БАЙКАЛЬСКИЙ КВЕСТ',
    category: 'local', difficulty: 'Высокий', format: 'hybrid', regionId: 'RU-IRK', city: 'Иркутск',
    lat: 52.2864, lng: 104.2807, startOffsetDays: 26, durationDays: 1, rating: 74.9, weight: 36.8,
    organizer: 'Байкальская кибербезопасность', url: 'https://ctftime.org/',
    description: 'Региональный турнир с упором на криптографию и стеганографию.',
    tags: ['Криптография', 'Стеганография'],
  },
  {
    id: 'evt-009', slug: 'vladivostok-pacific-rim', title: 'Тихоокеанский CTF', shortTitle: 'ТИХООКЕАНСКИЙ CTF',
    category: 'elite', difficulty: 'Экспертный', format: 'online', regionId: 'RU-PRI', city: 'Владивосток',
    lat: 43.1155, lng: 131.8855, startOffsetDays: 10, durationDays: 2, rating: 93.3, weight: 79.1,
    organizer: 'Дальневосточный киберсоюз', url: 'https://ctftime.org/',
    description: 'Международный онлайн-турнир команд Азиатско-Тихоокеанского региона.',
    tags: ['Международное', 'Задачи', 'Онлайн'],
  },
  {
    id: 'evt-010', slug: 'khabarovsk-defense-line', title: 'Линия обороны: Хабаровск', shortTitle: 'ЛИНИЯ ОБОРОНЫ',
    category: 'local', difficulty: 'Средний', format: 'offline', regionId: 'RU-KHA', city: 'Хабаровск',
    lat: 48.4802, lng: 135.0719, startOffsetDays: 18, durationDays: 1, rating: 76.0, weight: 33.7,
    organizer: 'Дальневосточная безопасность', url: 'https://ctftime.org/',
    description: 'Командное соревнование по защите сервисов для Дальнего Востока.',
    tags: ['Атака и защита', 'Региональное'],
  },
  {
    id: 'evt-011', slug: 'yakutia-forensic-ice', title: 'Ледовый лагерь криминалистики', shortTitle: 'ЛЕДОВЫЙ ЛАГЕРЬ',
    category: 'training', difficulty: 'Начальный', format: 'online', regionId: 'RU-SA', city: 'Якутск',
    lat: 62.0355, lng: 129.6755, startOffsetDays: 1, durationDays: 5, rating: 61.8, weight: 0,
    organizer: 'Центр информационных технологий Якутии', url: 'https://ctftime.org/',
    description: 'Серия тренировочных задач по цифровой криминалистике и разведке по открытым источникам.',
    tags: ['Цифровая криминалистика', 'Разведка по открытым источникам', 'Для начинающих'],
  },
  {
    id: 'evt-012', slug: 'kamchatka-signal-hunt', title: 'Охота за сигналом: Камчатка', shortTitle: 'ОХОТА ЗА СИГНАЛОМ',
    category: 'local', difficulty: 'Высокий', format: 'online', regionId: 'RU-KAM', city: 'Петропавловск-Камчатский',
    lat: 53.037, lng: 158.6559, startOffsetDays: 29, durationDays: 1, rating: 70.6, weight: 22.4,
    organizer: 'Камчатская безопасность', url: 'https://ctftime.org/',
    description: 'Онлайн-квест по радиосигналам, разведке по открытым источникам и анализу сетевого трафика.',
    tags: ['Разное', 'Разведка по открытым источникам', 'Сети'],
  },
];

export const events: CtfEvent[] = rawEvents.map((event) => ({
  ...EVENT_DEFAULTS,
  ...(event.category === 'training' ? { learningMaterials: DEFAULT_MATERIALS } : {}),
  ...event,
}));
