import { useEffect, useState } from 'react';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { reflectionService } from '../../app/services';
import { BookIcon, BreatheIcon, ChevronRightIcon, CompassIcon, LotusIcon, MoreIcon, PenIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import { toLocalDate } from '../../core/scheduling/dates';
import type { InnerWeather, Reflection } from '../../core/reflections/types';
import { dayLabel } from './format';
import { promptText } from './prompts';
import { entryMark } from './weather';
import { formatTemp } from '../../core/weather/sky';
import { weatherOptions } from './weather';

function TimelineEntry({ reflection, showDay }: { reflection: Reflection; showDay: boolean }) {
  const [open, setOpen] = useState(false);
  const { openDecision, offerUndo } = useOverlays();
  const time = new Date(reflection.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const mark = reflection.decisionId ? { icon: PenIcon, label: 'Note on a decision' } : entryMark(reflection);
  const Icon = mark.icon;
  const prompt = reflection.decisionId ? 'Note on a decision' : promptText(reflection.promptKey);

  return (
    <li className="timeline-entry">
      <span className="timeline-entry__mark" role="img" aria-label={mark.label}>
        <Icon size={28} />
      </span>
      <div className="timeline-entry__body">
        <div className="timeline-entry__head">
          <span className="timeline-entry__time">
            {showDay ? `${dayLabel(reflection.createdAt)}, ${time}` : time}
            {reflection.sky && <span className="timeline-entry__temp"> · {formatTemp(reflection.sky)}</span>}
          </span>
          <button
            type="button"
            className="check-row__more"
            aria-label="More"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <MoreIcon size={20} />
          </button>
        </div>
        {prompt && <span className="timeline-entry__prompt">{prompt}</span>}
        <button
          type="button"
          className={`timeline-entry__text${open ? ' timeline-entry__text--full' : ''}`}
          onClick={() => (reflection.decisionId ? openDecision(reflection.decisionId) : setOpen(!open))}
        >
          {reflection.body}
        </button>
        {open && (
          <div className="reflection-entry__actions">
            {reflection.decisionId && (
              <button type="button" className="button-quiet" onClick={() => openDecision(reflection.decisionId!)}>
                Open decision
              </button>
            )}
            <button
              type="button"
              className="button-quiet"
              onClick={async () => {
                const deletion = await reflectionService.remove(reflection.id);
                offerUndo('Reflection deleted', deletion.undo);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function MoreRow({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail?: string; onClick: () => void }) {
  return (
    <button type="button" className="settings-row" onClick={onClick}>
      <span className="settings-row__icon">{icon}</span>
      <span className="settings-row__text">
        <span>{title}</span>
        {detail && <span className="settings-row__detail">{detail}</span>}
      </span>
      <ChevronRightIcon size={18} className="settings-row__chevron" />
    </button>
  );
}

function DailyCheckIn({ entries, onSaved }: { entries: Reflection[]; onSaved: () => void }) {
  const today = toLocalDate(new Date());
  const existing = entries
    .filter((entry) => entry.promptKey === 'daily-check-in' && toLocalDate(new Date(entry.createdAt)) === today)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(existing?.body ?? '');
  const [weather, setWeather] = useState<InnerWeather | undefined>(existing?.weather);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBody(existing?.body ?? '');
    setWeather(existing?.weather);
    setOpen(false);
  }, [existing?.id]);

  const save = async () => {
    if (!body.trim() || saving) return;
    setSaving(true);
    try {
      await reflectionService.write({ body: body.trim(), promptKey: 'daily-check-in', weather });
      setOpen(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`reflect-checkin${open ? ' reflect-checkin--open' : ''}`} aria-label="Daily check-in">
      <button
        type="button"
        className="settings-row reflect-checkin__toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="settings-row__icon"><BreatheIcon size={22} /></span>
        <span className="settings-row__text">
          <span>Daily check-in</span>
          <span className="settings-row__detail">
            {existing?.body || 'How are things today?'}
          </span>
        </span>
        <span className="settings-row__value">{existing ? 'Done' : 'Start'}</span>
        <ChevronRightIcon size={18} className="settings-row__chevron reflect-checkin__chevron" />
      </button>
      {open && (
        <div className="reflect-checkin__form">
          <p className="reflect-checkin__captain-line">Remember, you can only control the sails, not the seas.</p>
          <div className="weather-picker weather-picker--compact" role="group" aria-label="Inner weather">
            {weatherOptions.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className="weather-picker__option"
                aria-pressed={weather === id}
                onClick={() => setWeather(weather === id ? undefined : id)}
              >
                <Icon size={22} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <textarea
            className="field-input field-input--area reflect-checkin__input"
            rows={2}
            aria-label="What’s your weather like today?"
            placeholder="A few words about how things are going…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="reflect-checkin__actions">
            <button type="button" className="button-quiet" onClick={() => setOpen(false)}>Not now</button>
            <button type="button" className="button-accent button--sm" disabled={!body.trim() || saving} onClick={() => void save()}>
              {existing ? 'Update check-in' : 'Save check-in'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ReflectPage() {
  const shows = useTodayParts();
  const navigate = useNavigate();
  const all = useServiceData(reflectionService.subscribe, () => reflectionService.all());
  const appPrompts = new Set(['after-run', 'after-meal', 'after-study', 'after-reading', 'after-strength', 'after-trip']);
  const recent = (all ?? [])
    .filter((entry) => entry.promptKey !== 'daily-check-in' && !appPrompts.has(entry.promptKey ?? '') && !entry.decisionId && entry.body.trim())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  const openReflectionsLibrary = () => navigate('connections', { search: '?category=reflections' });

  return (
    <div className="page reflect-home">
      <PageHeader title="Reflect" subtitle="Pause. Notice. Choose." settings />

      <button type="button" className="button-accent reflect-write-button" onClick={() => navigate('journal')}>
        <PenIcon size={18} />
        Write a reflection
      </button>

      <section className="reflect-tools-section" aria-label="Reflect tools">
        <div className="settings-list reflect-tools">
          <DailyCheckIn entries={all ?? []} onSaved={() => reflectionService.refresh()} />
          <MoreRow
            icon={<CompassIcon size={22} />}
            title="Compass"
            detail="Your values and direction."
            onClick={() => navigate('compass')}
          />
          {shows('insights') && (
            <MoreRow
              icon={<BreatheIcon size={22} />}
              title="Insights"
              detail="A clear look at what you’ve recorded."
              onClick={() => navigate('insights')}
            />
          )}
          {shows('weekly-review') && (
            <MoreRow
              icon={<BookIcon size={22} />}
              title="Weekly review"
              detail="A quiet look at the week."
              onClick={() => navigate('review')}
            />
          )}
          {shows('meditate') && (
            <MoreRow
              icon={<LotusIcon size={22} />}
              title="Meditate"
              detail="Breathing, sounds and time to pause."
              onClick={() => navigate('meditate')}
            />
          )}
        </div>
      </section>

      <section className="reflect-recent" aria-labelledby="reflect-recent-title">
        <div className="reflect-section-heading reflect-recent__heading">
          <h2 id="reflect-recent-title">Recent reflections</h2>
          <button type="button" className="text-link" onClick={openReflectionsLibrary}>View all</button>
        </div>
        {recent.length > 0 ? (
          <ol className="timeline reflect-recent__list">
            {recent.map((reflection) => (
              <TimelineEntry key={reflection.id} reflection={reflection} showDay />
            ))}
          </ol>
        ) : (
          <div className="reflect-recent__empty">
            <p>{all ? 'Your reflections will gather here as you write them.' : 'Loading reflections…'}</p>
            {all && <button type="button" className="text-link" onClick={openReflectionsLibrary}>Open Library</button>}
          </div>
        )}
      </section>
    </div>
  );
}
