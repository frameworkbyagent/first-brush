import { promises as fs } from 'fs';
import path from 'path';
import { QueueState, buildInitialState, buildProgress, getDefaultFirstForDateKey, getTodayKey, getNextChild } from '@/lib/queue';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PIN_FILE = path.join(DATA_DIR, 'pin.json');
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

function rolloverIfNeeded(state: QueueState): QueueState {
  const todayKey = getTodayKey();
  if (state.today.date === todayKey) {
    return state;
  }

  const defaultFirst = getDefaultFirstForDateKey(todayKey);
  const nextFirst = state.today.progress.completed
    ? getNextChild(state.today.progress.first)
    : defaultFirst;

  return {
    today: {
      date: todayKey,
      progress: buildProgress(nextFirst),
    },
  };
}

async function readPinValue() {
  await ensureDataDir();

  try {
    const raw = await fs.readFile(PIN_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { pin?: string };
    return parsed.pin ?? DEFAULT_PIN;
  } catch {
    await writeJson(PIN_FILE, { pin: DEFAULT_PIN });
    return DEFAULT_PIN;
  }
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

export async function completeStep() {
  const state = await readState();
  const progress = state.today.progress;

  let nextProgress = progress;

  if (!progress.firstDone) {
    nextProgress = { ...progress, firstDone: true };
  } else if (!progress.secondDone) {
    nextProgress = {
      ...progress,
      secondDone: true,
      completed: true,
      completedAt: new Date().toISOString(),
    };
  }

  const nextState: QueueState = {
    today: {
      ...state.today,
      progress: nextProgress,
    },
  };

  await writeState(nextState);
  return nextState;
}

export async function toggleTodayFirst() {
  const state = await readState();
  const current = state.today.progress;
  const nextFirst = current.second;

  const nextState: QueueState = {
    today: {
      ...state.today,
      progress: {
        ...buildProgress(nextFirst),
        firstDone: false,
        secondDone: false,
        completed: false,
      },
    },
  };

  await writeState(nextState);
  return nextState;
}

export async function resetToday() {
  const state = await readState();
  const defaultFirst = getDefaultFirstForDateKey(state.today.date);
  const nextState: QueueState = {
    today: {
      ...state.today,
      progress: buildProgress(defaultFirst),
    },
  };

  await writeState(nextState);
  return nextState;
}

export async function verifyPin(pin: string) {
  const actualPin = await readPinValue();
  return actualPin === pin;
}

export async function changePin(currentPin: string, nextPin: string) {
  const actualPin = await readPinValue();
  if (actualPin !== currentPin) {
    return { ok: false as const, reason: 'CURRENT_PIN_INVALID' };
  }

  if (!/^\d{4,6}$/.test(nextPin)) {
    return { ok: false as const, reason: 'NEXT_PIN_INVALID' };
  }

  await writeJson(PIN_FILE, { pin: nextPin });
  return { ok: true as const };
}

export async function getPinHint() {
  const pin = await readPinValue();
  return `PIN из ${pin.length} цифр`;
}
