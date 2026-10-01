import { useState, type FormEvent } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { reflectionService } from '../../app/services';
import { BookIcon, ChevronRightIcon, MoonIcon, PenIcon, SunIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import type { ReflectPeriod } from '../../core/reflections/periods';
import type { Reflection } from '../../core/reflections/types';
import DecisionsSection from './DecisionsSection';
import Observations from './Observations';
import { dayLabel, isDaytime } from './format';
import { promptText, reflectionPrompts } from './prompts';

const periods: { id: ReflectPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

function ReflectionCard({ reflection }: { reflection: Reflection }) {
  const [open, setOpen] = useState(false);
  const { openDecision } = useOverlays();
  if (reflection.decisionId) {
    return (
      <button type="button" className="list-card list-card--button" onClick={() => openDecision(reflection.decisionId!)}>
        <span className="list-card__icon">
          <PenIcon size={22} />
        </span>
        <span className="list-card__text">
          <span className="list-card__title">Note on a decision</span>
          <span className="list-card__detail">{reflection.body}</span>
        </span>
        <ChevronRightIcon size={18} className="list-card__chevron" />
      </button>
    );
  }
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
        {promptText(reflection.promptKey) && <span className="list-card__prompt">{promptText(reflection.promptKey)}</span>}
        <span className={`list-card__detail${open ? ' list-card__detail--full' : ''}`}>{reflection.body}</span>
      </span>
      <ChevronRightIcon size={18} className="list-card__chevron" />
    </button>
  );
}

function Composer() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [promptKey, setPromptKey] = useState<string | undefined>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    await reflectionService.write({ body: draft, promptKey });
    setDraft('');
    setPromptKey(undefined);
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
      <div className="chip-row" role="group" aria-label="A place to start (optional)">
        {reflectionPrompts.map((prompt) => (
          <button
            key={prompt.key}
            type="button"
            className="chip chip--prompt"
            aria-pressed={promptKey === prompt.key}
            onClick={() => setPromptKey(promptKey === prompt.key ? undefined : prompt.key)}
          >
            {prompt.text}
          </button>
        ))}
      </div>
      {promptKey && <p className="composer__prompt">{promptText(promptKey)}</p>}
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

function WeeklyReviewCard() {
  const navigate = useNavigate();
  const all = useServiceData(reflectionService.subscribe, () => reflectionService.all()) ?? [];
  const last = all
    .filter((reflection) => reflection.promptKey === 'weekly-review')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <button type="button" className="list-card list-card--button" onClick={() => navigate('review')}>
      <span className="list-card__icon list-card__icon--accent">
        <BookIcon size={22} />
      </span>
      <span className="list-card__text">
        <span className="list-card__title">Weekly review</span>
        <span className="list-card__detail">
          About 15 minutes, every step optional.
          {last ? ` Last one ${dayLabel(last.createdAt).toLowerCase()}.` : ''}
        </span>
      </span>
      <ChevronRightIcon size={18} className="list-card__chevron" />
    </button>
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

      <WeeklyReviewCard />

      <Observations period={period} />

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

      <DecisionsSection />
    </div>
  );
}
