import { useState, type FormEvent } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { reflectionService } from '../../app/services';
import { ChevronRightIcon, MoonIcon, PenIcon, SunIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import type { ReflectPeriod } from '../../core/reflections/periods';
import type { Reflection } from '../../core/reflections/types';
import { dayLabel, isDaytime } from './format';

const periods: { id: ReflectPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

function ReflectionCard({ reflection }: { reflection: Reflection }) {
  const [open, setOpen] = useState(false);
  const time = new Date(reflection.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <button type="button" className="list-card list-card--button" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="list-card__icon">
        {isDaytime(reflection.createdAt) ? <SunIcon size={26} /> : <MoonIcon size={24} />}
      </span>
      <span className="list-card__text">
        <span className="list-card__title">
          {dayLabel(reflection.createdAt)} <span className="list-card__time">{time}</span>
        </span>
        <span className={`list-card__detail${open ? ' list-card__detail--full' : ''}`}>{reflection.body}</span>
      </span>
      <ChevronRightIcon size={18} className="list-card__chevron" />
    </button>
  );
}

function Composer() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    await reflectionService.write({ body: draft });
    setDraft('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="list-card list-card--button" onClick={() => setOpen(true)}>
        <span className="list-card__icon list-card__icon--accent">
          <PenIcon size={22} />
        </span>
        <span className="list-card__text">
          <span className="list-card__title">Write a reflection</span>
          <span className="list-card__detail">A few words is enough.</span>
        </span>
        <ChevronRightIcon size={18} className="list-card__chevron" />
      </button>
    );
  }

  return (
    <form className="composer" onSubmit={submit} aria-label="Write a reflection">
      <textarea
        className="composer__input"
        rows={4}
        autoFocus
        placeholder="Write whatever you want to keep"
        aria-label="Reflection"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="composer__actions">
        <button type="button" className="button-quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="button-accent" disabled={!draft.trim()}>
          Save
        </button>
      </div>
    </form>
  );
}

export default function ReflectPage() {
  const [period, setPeriod] = useState<ReflectPeriod>('today');
  const reflections = useServiceData(reflectionService.subscribe, () => reflectionService.listFor(period), [period]);

  return (
    <div className="page">
      <PageHeader title="Reflect" subtitle="Look back, notice patterns, and return to what matters." />

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

      <Composer />

      {reflections && (
        <section aria-label="Your reflections" className="stack-tight">
          <h2 className="section-label">Your reflections</h2>
          {reflections.length === 0 ? (
            <p className="empty-note">Nothing written in this period yet.</p>
          ) : (
            reflections.map((reflection) => <ReflectionCard key={reflection.id} reflection={reflection} />)
          )}
        </section>
      )}
    </div>
  );
}
