import { directionAlong, transition } from '../../app/transitions';
import lake from '../../assets/images/scenes/lake.webp';
import lakeLight from '../../assets/images/scenes/lake-light.webp';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { useEffect, useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { reflectionService } from '../../app/services';
import { pursuits, needsPursuitCheckIn } from '../../app/pursuits';
import { BookIcon, BreatheIcon, ChevronRightIcon, CompassIcon, MoreIcon, PenIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import { periodRange, type ReflectPeriod } from '../../core/reflections/periods';
import { toLocalDate } from '../../core/scheduling/dates';
import { useRuns } from '../../app/askesis/runs';
import RunEntry from './RunEntry';
import MealEntry from './MealEntry';
import StudyEntry from './StudyEntry';
import { combineReadingSessions, studyBetween, useStudy } from '../../app/praxis/study';
import { cookedForBetween, useRecipesFromSoma } from '../../app/soma/meals';
import type { InnerWeather, Reflection } from '../../core/reflections/types';
import { dayLabel } from './format';
import { promptText } from './prompts';
import { entryMark } from './weather';
import { formatTemp } from '../../core/weather/sky';
import { weatherOptions } from './weather';
import { openCompassTab } from '../compass/CompassPage';
import { openPursuit } from '../compass/PursuitsSection';

const periods: { id: ReflectPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

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
        <Icon size={32} />
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
  const [open, setOpen] = useState(!existing);
  const [body, setBody] = useState(existing?.body ?? '');
  const [weather, setWeather] = useState<InnerWeather | undefined>(existing?.weather);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBody(existing?.body ?? '');
    setWeather(existing?.weather);
    setOpen(!existing);
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
    <section className="reflect-checkin" aria-label="Daily check-in">
      <div className="reflect-checkin__head">
        <div>
          <p className="eyebrow">Set the sails for the day</p>
          <h2 className="reflect-checkin__title">Are you running into clear skies or a bit of a storm right now?</h2>
          <p className="reflect-checkin__captain-line">Notice the weather. Adjust the sails. The sea is not yours to control.</p>
        </div>
        {existing && <span className="reflect-checkin__saved">Checked in</span>}
      </div>
      {open ? (
        <div className="reflect-checkin__form">
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
            aria-label="Daily check-in"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="reflect-checkin__actions">
            {existing && <button type="button" className="button-quiet" onClick={() => setOpen(false)}>Close</button>}
            <button type="button" className="button-accent button--sm" disabled={!body.trim() || saving} onClick={() => void save()}>
              {existing ? 'Update check-in' : 'Save check-in'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="reflect-checkin__summary" onClick={() => setOpen(true)}>
          <span>{existing?.body}</span>
          <span className="text-link">Edit</span>
        </button>
      )}
    </section>
  );
}

function KeepInView() {
  const navigate = useNavigate();
  const activePursuits = pursuits.use()
    .filter((pursuit) => pursuit.status === 'active')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  if (activePursuits.length === 0) return null;

  return (
    <section className="reflect-keep" aria-label="Keep in view">
      <div className="section-heading"><h2 className="section-label">Keep in view</h2></div>
      <div className="reflect-keep__items">
        {activePursuits.map((pursuit) => (
          <button key={pursuit.id} type="button" className="reflect-keep__item" onClick={() => { openPursuit(pursuit.id); openCompassTab('motion'); navigate('compass'); }}>
            <span className="reflect-keep__kind">{needsPursuitCheckIn(pursuit) ? 'Project · Check-in due' : 'Project'}</span>
            <strong>{pursuit.title}</strong>
            <span>{pursuit.nextMove || pursuit.outcome || 'Open this pursuit.'}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function ReflectPage() {
  const shows = useTodayParts();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<ReflectPeriod>('today');
  const reflections = useServiceData(reflectionService.subscribe, () => reflectionService.listFor(period), [period]);
  const all = useServiceData(reflectionService.subscribe, () => reflectionService.all()) ?? [];
  // Runs logged in Askesis sit in the same timeline, if the person keeps them in view.
  const runs = useRuns();
  const range = periodRange(period, new Date());
  const ran = shows('askesis')
    ? (runs?.workouts ?? []).filter((entry) => entry.date >= toLocalDate(range.start) && entry.date < toLocalDate(range.end))
    : [];
  // Meals cooked for someone, marked in Soma, likewise.
  const recipes = useRecipesFromSoma();
  const cooked = shows('soma') ? cookedForBetween(recipes, toLocalDate(range.start), toLocalDate(range.end)) : [];
  // Study recorded in Praxis, likewise.
  const study = useStudy(shows('praxis'));
  const studied = shows('praxis') ? combineReadingSessions(studyBetween(study?.sessions ?? [], range.start, range.end)) : [];
  const timeline = [
    ...(reflections ?? []).map((reflection) => ({ at: reflection.createdAt, reflection })),
    ...studied.map((session) => ({ at: session.at, study: session })),
    ...ran.map((run) => ({ at: run.createdAt, run })),
    // A meal has a day, not a time: it sits at the end of its day.
    ...cooked.map((meal) => ({ at: new Date(`${meal.day}T23:59:00`).toISOString(), meal })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const lastReview = all
    .filter((reflection) => reflection.promptKey === 'weekly-review')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div className="page">
      <PageHeader title="Reflect" settings />

      <button type="button" className="add-reflection" onClick={() => navigate('journal')}>
        <PenIcon size={18} />
        Add a reflection
      </button>

      <DailyCheckIn entries={all} onSaved={() => reflectionService.refresh()} />
      <KeepInView />

      <div className="reflect-section-heading">
        <h2>Reflections</h2>
      </div>

      <div className="segmented" role="tablist" aria-label="Period">
        {periods.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={period === option.id}
            className="segmented__option"
            onClick={() =>
              transition(
                directionAlong(
                  periods.map((each) => each.id),
                  period,
                  option.id,
                ),
                () => setPeriod(option.id),
                'panel',
              )
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {reflections && (
        <section key={period} className="vt-panel" aria-label="Your reflections">
          {timeline.length === 0 ? (
            <p className="empty-note">Nothing written {period === 'today' ? 'today' : `this ${period}`} yet.</p>
          ) : (
            <ol className="timeline">
              {timeline.map((entry) =>
                'study' in entry ? (
                  <StudyEntry key={entry.study.id} session={entry.study} showDay={period !== 'today'} />
                ) : 'meal' in entry ? (
                  <MealEntry key={entry.meal.id} meal={entry.meal} showDay={period !== 'today'} />
                ) : 'run' in entry ? (
                  <RunEntry key={entry.run.id} entry={entry.run} unit={runs!.unit} showDay={period !== 'today'} />
                ) : (
                  <TimelineEntry key={entry.reflection.id} reflection={entry.reflection} showDay={period !== 'today'} />
                ),
              )}
            </ol>
          )}
        </section>
      )}

      <div className="reflect-explore">
        <div className="reflect-section-heading">
          <div>
            <h2>Explore</h2>
          </div>
        </div>
        <div className="reflect-places">
          {shows('meditate') && (
            <button type="button" className="place-row" onClick={() => navigate('meditate')}>
              <span className="place-row__thumb" style={{ backgroundImage: `url(${lake})`, '--photo-light': `url(${lakeLight})` } as React.CSSProperties} aria-hidden="true" />
              <span className="place-row__text">
                <span className="place-row__title">Meditate</span>
                <span className="place-row__detail">Sessions, breathing, sounds and music</span>
              </span>
              <ChevronRightIcon size={18} className="place-row__chevron" />
            </button>
          )}
          <button type="button" className="place-row" onClick={() => navigate('compass')}>
            <span className="place-row__thumb place-row__thumb--compass place-row__thumb--room" aria-hidden="true"><CompassIcon size={32} /></span>
            <span className="place-row__text">
              <span className="place-row__title">Compass</span>
              <span className="place-row__detail">Direction, pursuits and people</span>
            </span>
            <ChevronRightIcon size={18} className="place-row__chevron" />
          </button>
        </div>
      </div>

      <div className="settings-list">
        {shows('insights') && (
        <MoreRow
          icon={<BreatheIcon size={22} />}
          title="Insights"
          onClick={() => navigate('insights')}
        />
        )}
        {shows('weekly-review') && (
        <MoreRow
          icon={<BookIcon size={22} />}
          title="Weekly review"
          detail={`About 15 minutes.${lastReview ? ` Last one ${dayLabel(lastReview.createdAt).toLowerCase()}.` : ''}`}
          onClick={() => navigate('review')}
        />
        )}
      </div>

    </div>
  );
}
