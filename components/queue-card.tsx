'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChildName, QueueState, getNextChild } from '@/lib/queue';

type BusyAction = 'complete' | 'toggle' | 'reset' | 'unlock' | 'changePin' | null;
type Stage = 'loading' | 'first' | 'second' | 'done';
type TransitionStage = 'idle' | 'exiting' | 'entering';

type HeroChild = {
  name: ChildName;
  imageSrc: string;
};

function getAvatar(name: ChildName): HeroChild {
  return name === 'Давид'
    ? { name, imageSrc: '/avatars/david.jpg' }
    : { name, imageSrc: '/avatars/anna.jpg' };
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
  const [transitionStage, setTransitionStage] = useState<TransitionStage>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const stage = useMemo<Stage>(() => {
    if (!state) return 'loading';
    const p = state.today.progress;
    if (p.completed) return 'done';
    if (p.firstDone) return 'second';
    return 'first';
  }, [state]);

  useEffect(() => {
    if (stage === 'done' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [stage]);

  async function animateStateChange(nextState: QueueState) {
    setTransitionStage('exiting');
    await new Promise((resolve) => setTimeout(resolve, 260));
    setState(nextState);
    setTransitionStage('entering');
    await new Promise((resolve) => setTimeout(resolve, 420));
    setTransitionStage('idle');
  }

  async function runAction(action: 'complete' | 'toggle' | 'reset') {
    setBusyAction(action);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = action === 'complete' ? '/api/complete' : action === 'toggle' ? '/api/toggle' : '/api/reset';
      const response = await fetch(endpoint, { method: 'POST' });
      if (!response.ok) throw new Error('ACTION_FAILED');
      const data = (await response.json()) as QueueState;

      if (action === 'complete') {
        await animateStateChange(data);
      } else {
        setState(data);
      }

      if (action === 'reset') setSuccess('День сброшен к плану.');
      if (action === 'toggle') setSuccess('Порядок на сегодня обновлён.');
    } catch {
      setError('Действие не выполнилось. Попробуй ещё раз.');
      setTransitionStage('idle');
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

  const activeChild = useMemo(() => {
    if (!state) return null;
    const p = state.today.progress;
    if (p.completed) return null;
    return getAvatar(p.firstDone ? p.second : p.first);
  }, [state]);

  const celebrationChild = useMemo(() => {
    if (!state) return [] as HeroChild[];
    const p = state.today.progress;
    return [getAvatar(p.first), getAvatar(p.second)];
  }, [state]);

  const nextUp = useMemo(() => {
    if (!state) return null;
    return getNextChild(state.today.progress.first);
  }, [state]);

  if (loading && !state) {
    return <main className="page-shell"><section className="hero-card"><p>Загружаю…</p></section></main>;
  }

  if (!state) {
    return <main className="page-shell"><section className="hero-card"><p>Не удалось открыть данные.</p></section></main>;
  }

  return (
    <main className="page-shell kid-mode">
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAAAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA" type="audio/wav" />
      </audio>

      <section className="top-banner">
        <div>
          <p className="eyebrow">First Brush</p>
          <h2>Вечерняя чистка</h2>
        </div>
        <span className="badge">По очереди</span>
      </section>

      <section className={`hero-card hero-kids stage-${stage} transition-${transitionStage}`}>
        {stage !== 'done' && activeChild ? (
          <>
            <div className="hero-avatar-wrap solo">
              <div className="hero-avatar-frame giant-frame pulse-frame">
                <Image
                  src={activeChild.imageSrc}
                  alt={activeChild.name}
                  width={280}
                  height={280}
                  className="hero-avatar-image"
                  priority
                />
              </div>
            </div>

            <p className="hero-name">{activeChild.name}</p>

            <div className="actions">
              <button
                type="button"
                className="primary-button giant ready-button"
                onClick={() => runAction('complete')}
                disabled={busyAction !== null || transitionStage !== 'idle'}
              >
                <span className="ready-icon">✅</span>
                <span>Готово</span>
              </button>
            </div>
          </>
        ) : (
          <div className="celebration-screen burst-in">
            <div className="confetti-layer" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} className={`confetti confetti-${(index % 6) + 1}`} style={{ left: `${(index * 5.5) % 100}%`, animationDelay: `${index * 0.08}s` }} />
              ))}
            </div>
            <div className="celebration-stars" aria-hidden="true">✨ 🎉 ✨</div>
            <div className="celebration-avatars">
              {celebrationChild.map((child, index) => (
                <div key={child.name} className={`mini-hero-avatar bounce-${index + 1}`}>
                  <Image src={child.imageSrc} alt={child.name} width={120} height={120} className="hero-avatar-image" />
                </div>
              ))}
            </div>
            <h1 className="celebration-title">Все почистили зубы!</h1>
            <p className="celebration-subtitle">На сегодня всё готово ✅</p>
          </div>
        )}
      </section>

      <section className="info-grid kid-stats compact-info">
        <article className="info-card warm">
          <p className="eyebrow">Сейчас</p>
          <strong>
            {stage === 'done'
              ? 'Все готовы'
              : stage === 'first'
                ? 'Первый ребёнок'
                : 'Второй ребёнок'}
          </strong>
        </article>

        <article className="info-card soft">
          <p className="eyebrow">Завтра первым</p>
          <strong>{nextUp}</strong>
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
                {busyAction === 'toggle' ? 'Меняю…' : 'Поменять порядок на сегодня'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => runAction('reset')}
                disabled={busyAction !== null}
              >
                {busyAction === 'reset' ? 'Сбрасываю…' : 'Сбросить день'}
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
    </main>
  );
}
