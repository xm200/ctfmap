export const FORMAT_LABELS = {
  online: 'ОНЛАЙН',
  offline: 'ОЧНО',
  hybrid: 'ГИБРИДНЫЙ',
} as const;

export const CATEGORY_LABELS = {
  elite: 'ПРОФЕССИОНАЛЬНЫЕ',
  local: 'ЛОКАЛЬНЫЕ',
  training: 'ТРЕНИРОВКИ',
} as const;

export const ROLE_LABELS = {
  organizer: 'ОРГАНИЗАТОР',
  admin: 'АДМИНИСТРАТОР',
} as const;

export const SOURCE_LABELS: Record<string, string> = {
  application: 'ЗАЯВКА',
  manual: 'ВРУЧНУЮ',
  import: 'ИМПОРТ',
};
