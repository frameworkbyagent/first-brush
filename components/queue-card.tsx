import { buildRecentQueue, formatDateRu, getFirstChildForDate, getTodayInMinsk } from '@/lib/queue';

export function QueueCard() {
  const today = getTodayInMinsk();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayFirst = getFirstChildForDate(today);
  const tomorrowFirst = getFirstChildForDate(tomorrow);
  const history = buildRecentQueue();

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Сегодня первым чистит</p>
        <h1>{todayFirst}</h1>
        <p className="subtle">{formatDateRu(today)}</p>

        <div className="actions">
          <button type="button" className="primary-button">Отметить, что почистили</button>
          <button type="button" className="secondary-button">Поменять очередь на сегодня</button>
        </div>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <p className="eyebrow">Завтра первым</p>
          <strong>{tomorrowFirst}</strong>
        </article>

        <article className="info-card">
          <p className="eyebrow">Логика MVP</p>
          <strong>Чередование по дням</strong>
        </article>
      </section>

      <section className="history-card">
        <div className="section-header">
          <h2>История</h2>
          <span>Последние 7 дней</span>
        </div>

        <div className="history-list">
          {history.map((entry) => (
            <div key={entry.date} className="history-row">
              <div>
                <p className="history-date">{entry.date}</p>
                <p className="history-name">Первым был {entry.first}</p>
              </div>
              <span className={entry.completed ? 'status done' : 'status pending'}>
                {entry.completed ? 'Отмечено' : 'Сегодня'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
