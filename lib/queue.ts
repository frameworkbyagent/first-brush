export type ChildName = 'Давид' | 'Анна';

export type QueueEntry = {
  date: string;
  first: ChildName;
  completed: boolean;
};

const CHILDREN: ChildName[] = ['Давид', 'Анна'];
const START_DATE = new Date('2026-03-31T00:00:00+03:00');
const START_CHILD: ChildName = 'Давид';

function daysBetween(a: Date, b: Date) {
  const msInDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msInDay);
}

export function getFirstChildForDate(date: Date): ChildName {
  const offset = daysBetween(START_DATE, date);
  const startIndex = CHILDREN.indexOf(START_CHILD);
  const safeIndex = ((startIndex + offset) % CHILDREN.length + CHILDREN.length) % CHILDREN.length;
  return CHILDREN[safeIndex];
}

export function getTodayInMinsk() {
  return new Date(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Minsk',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()));
}

export function formatDateRu(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Minsk',
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);
}

export function buildRecentQueue(days = 7): QueueEntry[] {
  const today = getTodayInMinsk();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);

    return {
      date: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Minsk',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date),
      first: getFirstChildForDate(date),
      completed: index !== 0,
    };
  });
}
