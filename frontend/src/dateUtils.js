export const VLADIVOSTOK_TIME_ZONE = 'Asia/Vladivostok';

const pad = (number) => String(number).padStart(2, '0');

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getTodayISO() {
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: VLADIVOSTOK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function parseISODate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateShort(isoDate) {
  if (!isoDate) return '';
  const date = parseISODate(isoDate);
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

export function formatDateLong(isoDate) {
  if (!isoDate) return 'Дата не назначена';
  return parseISODate(isoDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function dayName(isoDate) {
  return parseISODate(isoDate).toLocaleDateString('ru-RU', { weekday: 'long' });
}

export function getWeekDays(anchorISO = getTodayISO()) {
  const anchor = parseISODate(anchorISO);
  const day = anchor.getDay() || 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - day + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toISODate(date);
  });
}

export function shiftWeek(anchorISO, deltaWeeks) {
  const date = parseISODate(anchorISO);
  date.setDate(date.getDate() + deltaWeeks * 7);
  return toISODate(date);
}

export function formatWeekRange(days) {
  if (!days?.length) return '';
  const start = parseISODate(days[0]);
  const end = parseISODate(days[days.length - 1]);
  const fmt = (date) => date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  return `${fmt(start)} - ${fmt(end)}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: VLADIVOSTOK_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
