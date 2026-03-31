'use client';

import { useEffect, useMemo, useState } from 'react';
import { QueueState, formatDateRu, getNextChild } from '@/lib/queue';

export function QueueCard() {
  const [state, setState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'complete' | 'toggle' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/state', { cache: 'no-store' });
      if (!response.ok) throw new Error('STATE_FETCH_FAILED');
      const data = (await response.json()) as QueueState;
      setState(data);
    } catch {
      setError('Не удалось загрузить состояние.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function runAction(action: 'complete' | 'toggle') {
    setBusyAction(action);
    setError(null);

    try {
      const response = await fetch(action === 'complete' ? '/api/complete' : '/api/toggle', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('ACTION_FAILED');
      const data = (await response.json()) as QueueState;
      setState(data);
    } catch {
      setError('Действие не выполнилось. Попробуй ещё раз.');
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
          <button
            type="button"
            className="secondary-button"
            onClick={() => runAction('toggle')}
            disabled={busyAction !== null}
          >
            {busyAction === 'toggle' ? 'Меняю…' : 'Поменять очередь на сегодня'}
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="info-grid">
        <article className="info-card">
          <p className="eyebrow">Завтра первым</p>
          <strong>{tomorrowFirst}</strong>
        </article>

        <article className="info-card">
          <p className="eyebrow">Сегодняшний статус</p>
          <strong>{state.today.completed ? 'День закрыт' : 'Ждёт отметки'}</strong>
        </article>
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
