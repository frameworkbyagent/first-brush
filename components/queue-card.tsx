'use client';

import { useEffect, useMemo, useState } from 'react';
import { QueueState, formatDateRu, getNextChild } from '@/lib/queue';

type BusyAction = 'complete' | 'toggle' | 'reset' | 'unlock' | null;

export function QueueCard() {
  const [state, setState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParentUnlocked, setIsParentUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinHint, setPinHint] = useState('PIN из 4 цифр');

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const [stateResponse, pinResponse] = await Promise.all([
        fetch('/api/state', { cache: 'no-store' }),
        fetch('/api/pin', { cache: 'no-store' }),
      ]);

      if (!stateResponse.ok) throw new Error('STATE_FETCH_FAILED');
      const data = (await stateResponse.json()) as QueueState;
      setState(data);

      if (pinResponse.ok) {
        const pinData = (await pinResponse.json()) as { hint?: string };
        setPinHint(pinData.hint ?? 'PIN из 4 цифр');
      }
    } catch {
      setError('Не удалось загрузить состояние.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function runAction(action: 'complete' | 'toggle' | 'reset') {
    setBusyAction(action);
    setError(null);

    try {
      const endpoint = action === 'complete' ? '/api/complete' : action === 'toggle' ? '/api/toggle' : '/api/reset';
      const response = await fetch(endpoint, { method: 'POST' });
      if (!response.ok) throw new Error('ACTION_FAILED');
      const data = (await response.json()) as QueueState;
      setState(data);
    } catch {
      setError('Действие не выполнилось. Попробуй ещё раз.');
    } finally {
      setBusyAction(null);
    }
  }

  async function unlockParentMode() {
    setBusyAction('unlock');
    setError(null);

    try {
      const response = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) throw new Error('PIN_FAILED');
      setIsParentUnlocked(true);
      setPin('');
    } catch {
      setError('PIN не подошёл.');
    } finally {
      setBusyAction(null);
    }
  }

  const tomorrowFirst = useMemo(() => {
    if (!state) return null;
    return getNextChild(state.today.first);
  }, [state]);

  if (loading && !state) {
    return <main className="page-shell"><section className="hero-card"><p>Загружаю очередь…</p></section></main>;
  }

  if (!state) {
    return <main className="page-shell"><section className="hero-card"><p>Не удалось открыть данные.</p></section></main>;
  }

  return (
    <main className="page-shell">
      <section className="top-banner">
        <div>
          <p className="eyebrow">First Brush</p>
          <h2>Спокойная вечерняя очередь</h2>
        </div>
        <span className="badge">Давид ↔ Анна</span>
      </section>

      <section className="hero-card">
        <p className="eyebrow">Сегодня первым чистит</p>
        <h1>{state.today.first}</h1>
        <p className="subtle">{formatDateRu(state.today.date)}</p>
        <p className={`today-status ${state.today.completed ? 'done' : 'pending'}`}>
          {state.today.completed ? 'На сегодня уже отмечено' : 'Сегодня ещё не отмечено'}
        </p>

        <div className="actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => runAction('complete')}
            disabled={busyAction !== null || state.today.completed}
          >
            {state.today.completed ? 'Чистка уже отмечена' : busyAction === 'complete' ? 'Сохраняю…' : 'Отметить, что почистили'}
          </button>
        </div>
      </section>

      <section className="info-grid">
        <article className="info-card warm">
          <p className="eyebrow">Завтра первым</p>
          <strong>{tomorrowFirst}</strong>
        </article>

        <article className="info-card soft">
          <p className="eyebrow">Сегодняшний статус</p>
          <strong>{state.today.completed ? 'День закрыт' : 'Ждёт отметки'}</strong>
        </article>
      </section>

      <section className="parent-card">
        <div className="section-header">
          <h2>Родительский режим</h2>
          <span>{isParentUnlocked ? 'Открыт' : pinHint}</span>
        </div>

        {!isParentUnlocked ? (
          <div className="pin-box">
            <input
              className="pin-input"
              inputMode="numeric"
              maxLength={6}
              placeholder="Введите PIN"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={unlockParentMode}
              disabled={busyAction !== null || pin.length < 4}
            >
              {busyAction === 'unlock' ? 'Проверяю…' : 'Открыть родительский режим'}
            </button>
          </div>
        ) : (
          <div className="parent-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => runAction('toggle')}
              disabled={busyAction !== null}
            >
              {busyAction === 'toggle' ? 'Меняю…' : 'Поменять очередь на сегодня'}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => runAction('reset')}
              disabled={busyAction !== null}
            >
              {busyAction === 'reset' ? 'Сбрасываю…' : 'Сбросить день к плану'}
            </button>
          </div>
        )}

        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="history-card">
        <div className="section-header">
          <h2>История</h2>
          <span>Сохраняется между рестартами</span>
        </div>

        <div className="history-list">
          {state.history.map((entry) => (
            <div key={entry.date} className="history-row">
              <div>
                <p className="history-date">{formatDateRu(entry.date)}</p>
                <p className="history-name">Первым был {entry.first}</p>
              </div>
              <span className={entry.completed ? 'status done' : 'status pending'}>
                {entry.completed ? 'Отмечено' : 'План'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
