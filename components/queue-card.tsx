'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { QueueState, formatDateRu, getNextChild } from '@/lib/queue';

type BusyAction = 'complete' | 'toggle' | 'reset' | 'unlock' | 'changePin' | null;

type ChildCardProps = {
  name: 'Давид' | 'Анна';
  active: boolean;
  subtitle: string;
  imageSrc: string;
  tint: 'blue' | 'pink';
};

function ChildCard({ name, active, subtitle, imageSrc, tint }: ChildCardProps) {
  return (
    <article className={`child-card ${tint} ${active ? 'active' : ''}`}>
      <div className="child-avatar image-avatar">
        <Image src={imageSrc} alt={name} width={72} height={72} className="avatar-image" />
      </div>
      <div>
        <p className="child-name">{name}</p>
        <p className="child-subtitle">{active ? subtitle : 'Ждёт свою очередь'}</p>
      </div>
      {active ? <span className="child-badge">Сегодня первый</span> : null}
    </article>
  );
}

export function QueueCard() {
  const [state, setState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isParentUnlocked, setIsParentUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinHint, setPinHint] = useState('PIN из 4 цифр');
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');

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
    setSuccess(null);

    try {
      const endpoint = action === 'complete' ? '/api/complete' : action === 'toggle' ? '/api/toggle' : '/api/reset';
      const response = await fetch(endpoint, { method: 'POST' });
      if (!response.ok) throw new Error('ACTION_FAILED');
      const data = (await response.json()) as QueueState;
      setState(data);
      if (action === 'reset') setSuccess('День сброшен к плановой очереди.');
      if (action === 'toggle') setSuccess('Очередь на сегодня обновлена.');
      if (action === 'complete') setSuccess('Готово. Чистка на сегодня отмечена.');
    } catch {
      setError('Действие не выполнилось. Попробуй ещё раз.');
    } finally {
      setBusyAction(null);
    }
  }

  async function unlockParentMode() {
    setBusyAction('unlock');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) throw new Error('PIN_FAILED');
      setIsParentUnlocked(true);
      setPin('');
      setSuccess('Родительский режим открыт.');
    } catch {
      setError('PIN не подошёл.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleChangePin() {
    setBusyAction('changePin');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, nextPin }),
      });

      if (!response.ok) throw new Error('CHANGE_PIN_FAILED');
      setCurrentPin('');
      setNextPin('');
      setSuccess('PIN обновлён.');
      const hintResponse = await fetch('/api/pin', { cache: 'no-store' });
      if (hintResponse.ok) {
        const pinData = (await hintResponse.json()) as { hint?: string };
        setPinHint(pinData.hint ?? 'PIN из 4 цифр');
      }
    } catch {
      setError('Не удалось сменить PIN. Проверь текущий код и новый формат.');
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
    <main className="page-shell kid-mode">
      <section className="top-banner">
        <div>
          <p className="eyebrow">First Brush</p>
          <h2>Кто сегодня идёт первым?</h2>
        </div>
        <span className="badge">Вечерняя очередь</span>
      </section>

      <section className="hero-card hero-kids">
        <p className="eyebrow">Сегодня первым чистит</p>
        <h1>{state.today.first}</h1>
        <p className="subtle">{formatDateRu(state.today.date)}</p>
        <p className={`today-status ${state.today.completed ? 'done' : 'pending'}`}>
          {state.today.completed ? 'Сегодня всё готово ✅' : 'Пора идти чистить 🪥'}
        </p>

        <div className="kids-grid">
          <ChildCard
            name="Давид"
            imageSrc="/avatars/david.jpg"
            tint="blue"
            active={state.today.first === 'Давид'}
            subtitle="Сегодня начинает Давид"
          />
          <ChildCard
            name="Анна"
            imageSrc="/avatars/anna.jpg"
            tint="pink"
            active={state.today.first === 'Анна'}
            subtitle="Сегодня начинает Анна"
          />
        </div>

        <div className="actions">
          <button
            type="button"
            className="primary-button giant"
            onClick={() => runAction('complete')}
            disabled={busyAction !== null || state.today.completed}
          >
            {state.today.completed ? 'На сегодня всё' : busyAction === 'complete' ? 'Сохраняю…' : 'Мы почистили зубы'}
          </button>
        </div>
      </section>

      <section className="info-grid kid-stats">
        <article className="info-card warm">
          <p className="eyebrow">Завтра первым</p>
          <strong>{tomorrowFirst}</strong>
        </article>

        <article className="info-card soft">
          <p className="eyebrow">Статус вечера</p>
          <strong>{state.today.completed ? 'Можно отдыхать' : 'Ждёт отметки'}</strong>
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
          <>
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

            <div className="change-pin-card">
              <p className="eyebrow">Сменить PIN</p>
              <div className="pin-box compact">
                <input
                  className="pin-input"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Текущий PIN"
                  value={currentPin}
                  onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ''))}
                />
                <input
                  className="pin-input"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Новый PIN"
                  value={nextPin}
                  onChange={(event) => setNextPin(event.target.value.replace(/\D/g, ''))}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleChangePin}
                  disabled={busyAction !== null || currentPin.length < 4 || nextPin.length < 4}
                >
                  {busyAction === 'changePin' ? 'Сохраняю PIN…' : 'Сменить PIN'}
                </button>
              </div>
            </div>
          </>
        )}

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
      </section>

      <section className="history-card">
        <div className="section-header">
          <h2>История</h2>
          <span>Последние дни</span>
        </div>

        <div className="history-list">
          {state.history.map((entry) => (
            <div key={entry.date} className="history-row">
              <div>
                <p className="history-date">{formatDateRu(entry.date)}</p>
                <p className="history-name">Первым был {entry.first}</p>
              </div>
              <span className={entry.completed ? 'status done' : 'status pending'}>
                {entry.completed ? 'Готово' : 'План'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
