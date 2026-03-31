import { promises as fs } from 'fs';
import path from 'path';
import { QueueHistoryEntry, QueueState, buildInitialState, getDefaultFirstForDateKey, getNextChild, getTodayKey } from '@/lib/queue';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PIN_FILE = path.join(DATA_DIR, 'pin.json');
const HISTORY_LIMIT = 30;
const DEFAULT_PIN = process.env.PARENT_PIN ?? '1234';

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function writeJson(filePath: string, data: unknown) {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function writeState(state: QueueState) {
  await writeJson(STATE_FILE, state);
}

function mergeTodayIntoHistory(state: QueueState) {
  const filtered = state.history.filter((entry) => entry.date !== state.today.date);
  const updatedHistory: QueueHistoryEntry[] = [state.today, ...filtered]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, HISTORY_LIMIT);

  return {
    ...state,
    history: updatedHistory,
  };
}

function rolloverIfNeeded(state: QueueState): QueueState {
  const todayKey = getTodayKey();
  if (state.today.date === todayKey) {
    return mergeTodayIntoHistory(state);
  }

  const merged = mergeTodayIntoHistory(state);
  const nextDefault = getDefaultFirstForDateKey(todayKey);
  const previousFirst = merged.today.first;

  return {
    today: {
      date: todayKey,
      first: merged.today.completed ? getNextChild(previousFirst) : nextDefault,
      completed: false,
    },
    history: merged.history,
  };
}

export async function readState() {
  await ensureDataDir();

  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as QueueState;
    const normalized = rolloverIfNeeded(parsed);
    await writeState(normalized);
    return normalized;
  } catch {
    const initial = buildInitialState();
    await writeState(initial);
    return initial;
  }
}

export async function completeToday() {
  const state = await readState();
  const nextState: QueueState = mergeTodayIntoHistory({
    ...state,
    today: {
      ...state.today,
      completed: true,
      completedAt: new Date().toISOString(),
    },
  });

  await writeState(nextState);
  return nextState;
}

export async function toggleTodayFirst() {
  const state = await readState();
  const nextState: QueueState = mergeTodayIntoHistory({
    ...state,
    today: {
      ...state.today,
      first: getNextChild(state.today.first),
    },
  });

  await writeState(nextState);
  return nextState;
}

export async function resetToday() {
  const state = await readState();
  const nextState: QueueState = mergeTodayIntoHistory({
    ...state,
    today: {
      date: state.today.date,
      first: getDefaultFirstForDateKey(state.today.date),
      completed: false,
    },
  });

  await writeState(nextState);
  return nextState;
}

export async function verifyPin(pin: string) {
  await ensureDataDir();

  try {
    const raw = await fs.readFile(PIN_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { pin?: string };
    return (parsed.pin ?? DEFAULT_PIN) === pin;
  } catch {
    await writeJson(PIN_FILE, { pin: DEFAULT_PIN });
    return DEFAULT_PIN === pin;
  }
}

export async function getPinHint() {
  await ensureDataDir();

  try {
    const raw = await fs.readFile(PIN_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { pin?: string };
    const pin = parsed.pin ?? DEFAULT_PIN;
    return `PIN из ${pin.length} цифр`;
  } catch {
    await writeJson(PIN_FILE, { pin: DEFAULT_PIN });
    return `PIN из ${DEFAULT_PIN.length} цифр`;
  }
}
