export type ChildName = 'Давид' | 'Анна';

export type QueueHistoryEntry = {
  date: string;
  first: ChildName;
  completed: boolean;
  completedAt?: string;
};

export type QueueState = {
  today: {
    date: string;
    first: ChildName;
    completed: boolean;
    completedAt?: string;
  };
  history: QueueHistoryEntry[];
};

export const CHILDREN: ChildName[] = ['Давид', 'Анна'];
const START_DATE = new Date('2026-03-31T00:00:00+03:00');
const START_CHILD: ChildName = 'Давид';

function daysBetween(a: Date, b: Date) {
  const msInDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msInDay);
}

export function getMinskDateParts(date = new Date()) {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Minsk',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  const [year, month, day] = formatted.split('-').map(Number);
  return { year, month, day };
}

export function getTodayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Minsk',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function getFirstChildForDate(date: Date): ChildName {
  const parts = getMinskDateParts(date);
  const minskDate = new Date(parts.year, parts.month - 1, parts.day);
  const offset = daysBetween(START_DATE, minskDate);
  const startIndex = CHILDREN.indexOf(START_CHILD);
  const safeIndex = ((startIndex + offset) % CHILDREN.length + CHILDREN.length) % CHILDREN.length;
  return CHILDREN[safeIndex];
}

export function getDefaultFirstForDateKey(dateKey: string): ChildName {
  return getFirstChildForDate(getDateFromKey(dateKey));
}

export function formatDateRu(dateKey: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Minsk',
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(getDateFromKey(dateKey));
}

export function getNextChild(child: ChildName): ChildName {
  return child === 'Давид' ? 'Анна' : 'Давид';
}

export function buildInitialState(days = 7): QueueState {
  const todayKey = getTodayKey();
  const history: QueueHistoryEntry[] = [];

  for (let index = 0; index < days; index += 1) {
    const date = getDateFromKey(todayKey);
    date.setUTCDate(date.getUTCDate() - index);
    const dateKey = getTodayKey(date);

    history.push({
      date: dateKey,
      first: getDefaultFirstForDateKey(dateKey),
      completed: index !== 0,
    });
  }

  return {
    today: {
      date: todayKey,
      first: getDefaultFirstForDateKey(todayKey),
      completed: false,
    },
    history,
  };
}
