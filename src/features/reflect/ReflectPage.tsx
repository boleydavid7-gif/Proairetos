import { useState, type FormEvent } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { reflectionService } from '../../app/services';
import type { ReflectPeriod } from '../../core/reflections/periods';

const periods: { id: ReflectPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

function formatWhen(iso: string, period: ReflectPeriod): string {
  const date = new Date(iso);
  return period === 'today'
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ReflectPage() {
  const [period, setPeriod] = useState<ReflectPeriod>('today');
  const [draft, setDraft] = useState('');
  const reflections = useServiceData(reflectionService.subscribe, () => reflectionService.listFor(period), [period]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    await reflectionService.write({ body: draft });
    setDraft('');
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">Reflect</h1>
        <p className="page-header__subtitle">Look back, notice patterns, and return to what matters.</p>
      </header>

      <div className="segmented" role="tablist" aria-label="Period">
        {periods.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={period === option.id}
            className="segmented__option"
            onClick={() => setPeriod(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <form className="card stack-tight" onSubmit={submit} aria-label="Write a reflection">
        <textarea
          className="reflect-input"
          rows={3}
          placeholder="Write whatever you want to keep"
          aria-label="Reflection"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="chip chip--accent" disabled={!draft.trim()}>
          Save
        </button>
      </form>

      {reflections && reflections.length === 0 && <p className="empty-note">No reflections in this period yet.</p>}

      {reflections && reflections.length > 0 && (
        <section aria-label="Reflections" className="stack">
          {reflections.map((reflection) => (
            <article key={reflection.id} className="card">
              <p className="section-label">{formatWhen(reflection.createdAt, period)}</p>
              <p className="card__body">{reflection.body}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
