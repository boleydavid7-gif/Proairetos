import { useEffect, useState } from 'react';
import { Empty, offerUndo } from '../../app/family/shell';
import { BackIcon, MoonIcon, PlusIcon } from '../../app/family/icons';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import type { DiaitaNav } from '../app/App';
import { dynamisWorkouts, experiment, settings, sleeps, usePlan } from '../app/state';
import { weekdayText } from '../app/ui';
import { Switch } from '../../askesis/app/ui';
import { RangeChart } from '../../app/family/charts';
import { clockAt, hourLabel, nightAxis, placeNight } from '../core/nightChart';
import { QUALITY_NAMES, clockText, hoursText, isNight, sleepFacts, sleepWeekFacts, sleptMinutes, type SleepQuality, type SleepRecord } from '../core/rhythm';
import { EXPERIMENTS, caffeineAfterCutoffDates, experimentFacts, sideBySide, suggestionFor, type ContextDates } from '../core/evidence';

type Kept = SleepRecord & { id: string };

/** "6h 27m", "7h": short enough to sit on one line in a night's pill. */
const shortHours = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

function SideBySide({ records, nightDates, trainingDates, cutoffHours }: { records: readonly SleepRecord[]; nightDates: readonly string[]; trainingDates: readonly string[]; cutoffHours: number }) {
  const [runDates, setRunDates] = useState<string[]>();
  const [caffeineDates, setCaffeineDates] = useState<string[]>();
  const recordSignature = records.map((record) => `${record.date}:${record.bed}:${record.up}`).join('|');
  useEffect(() => {
    let live = true;
    void import('../../app/askesis/runs').then(({ readRuns }) => readRuns().then((runs) => {
      if (live) setRunDates(runs.workouts.map((workout) => workout.date));
    })).catch(() => {
      if (live) setRunDates([]);
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    let live = true;
    void import('../../hydros/data/store').then(({ listDrinks }) => listDrinks().then((drinks) => {
      if (live) setCaffeineDates(caffeineAfterCutoffDates(records, drinks, cutoffHours));
    })).catch(() => {
      if (live) setCaffeineDates([]);
    });
    return () => {
      live = false;
    };
  }, [recordSignature, cutoffHours]);
  const contexts: ContextDates[] = [
    ...(runDates ? [{ label: 'Nights after an Askesis run', dates: runDates }] : []),
    { label: 'Nights after Dynamis training', dates: trainingDates },
    ...(caffeineDates ? [{ label: 'Nights after caffeine after cutoff', dates: caffeineDates }] : []),
    { label: 'Nights on a night shift', dates: nightDates },
  ];
  const comparisons = contexts.map((context) => ({ ...context, groups: sideBySide(records, context.dates, context.label) })).filter((context) => context.groups.length >= 2);
  if (!comparisons.length) return null;
  return (
    <section className="card diaita-side-by-side">
      <h2 className="card__title">Side by side</h2>
      {comparisons.map((comparison) => <div className="diaita-side-by-side__comparison" key={comparison.label}><p className="label">{comparison.label}</p><div className="diaita-fact-row">{comparison.groups.map((group) => <span key={group.label}><strong>{hoursText(group.averageMinutes)}</strong><small>{group.label} · {group.nights} {group.nights === 1 ? 'night' : 'nights'}</small></span>)}</div></div>)}
    </section>
  );
}

function Suggestion({ records, chosenHours }: { records: readonly SleepRecord[]; chosenHours: number }) {
  const current = settings.use();
  const today = toLocalDate(new Date());
  const suggestion = suggestionFor(records, chosenHours, today);
  if (!suggestion || current.dismissedSuggestions?.includes(suggestion.id)) return null;
  return (
    <section className="card diaita-suggestion">
      <div className="section-head"><h2 className="card__title">From your log</h2><button type="button" className="text-link" onClick={() => settings.save({ ...settings.load(), dismissedSuggestions: [...new Set([...(current.dismissedSuggestions ?? []), suggestion.id])] })}>Not for me</button></div>
      <strong>{suggestion.title}</strong>
      <p className="muted">{suggestion.body}</p>
      <details className="diaita-source-detail"><summary>Source</summary><span>{suggestion.source}</span></details>
    </section>
  );
}

function ExperimentCard({ records, today }: { records: readonly SleepRecord[]; today: string }) {
  const current = experiment.use().current;
  const option = current && EXPERIMENTS.find((each) => each.kind === current.kind);
  if (current && option) {
    const facts = experimentFacts(records, current, today);
    return (
      <section className="card diaita-experiment">
        <div className="section-head"><h2 className="card__title">Two-week try</h2><button type="button" className="text-link" onClick={() => experiment.save({})}>End this try</button></div>
        <strong>{option.label}</strong>
        <p className="muted">{option.detail} {current.startedOn}–{current.endsOn}.</p>
        {facts.current && <div className="diaita-fact-row"><span><strong>{hoursText(facts.current.averageMinutes)}</strong><small>This try · {facts.current.nights} {facts.current.nights === 1 ? 'night' : 'nights'}</small></span>{facts.before && <span><strong>{hoursText(facts.before.averageMinutes)}</strong><small>Previous two weeks · {facts.before.nights} {facts.before.nights === 1 ? 'night' : 'nights'}</small></span>}</div>}
        <details className="diaita-source-detail"><summary>Source</summary><span>{option.source}</span></details>
      </section>
    );
  }
  return (
    <details className="card diaita-experiment">
      <summary className="card__title">Try something for two weeks</summary>
      <div className="diaita-experiment__options">
        {EXPERIMENTS.map((item) => <div key={item.kind} className="diaita-experiment__option"><div><strong>{item.label}</strong><span>{item.detail}</span><details className="diaita-source-detail"><summary>Source</summary><span>{item.source}</span></details></div><button type="button" className="button-quiet button--sm" onClick={() => experiment.save({ current: { kind: item.kind, startedOn: today, endsOn: addDays(today, 13) } })}>Try this</button></div>)}
      </div>
    </details>
  );
}

/** The last 14 nights from going to bed to getting up, over the planned night, as Apple Health and Oura draw them. */
function NightsChart({ records, today, bedtime, sleepHours }: { records: readonly Kept[]; today: string; bedtime: string; sleepHours: number }) {
  const dates = Array.from({ length: 14 }, (_, index) => addDays(today, index - 13));
  const nights = dates.map((date) => records.find((each) => each.date === date));
  const plannedUp = (() => {
    const [hours, minutes] = bedtime.split(':').map(Number);
    const total = (hours * 60 + minutes + Math.round(sleepHours * 60)) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  })();
  const planned = { bed: bedtime, up: plannedUp };
  const axis = nightAxis([...nights.filter((night): night is Kept => Boolean(night)), planned]);
  if (!axis) return null;
  const band = placeNight(planned, axis.startHour);
  return (
    <RangeChart
      title="Last 14 nights"
      min={axis.from}
      max={axis.to}
      band={band}
      tick={(value) => (value % 60 === 0 ? hourLabel(axis, value) : clockText(clockAt(axis, value)))}
      days={dates.map((date, index) => {
        const night = nights[index];
        const day = new Date(`${date}T12:00`);
        return {
          label: day.toLocaleDateString(undefined, { weekday: 'narrow' }),
          long: day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
          range: night ? placeNight(night, axis.startHour) : undefined,
          detail: night ? shortHours(sleptMinutes(night)) : undefined,
        };
      })}
    />
  );
}

function SleepForm({ record, onDone }: { record?: Kept; onDone: () => void }) {
  const today = toLocalDate(new Date());
  const [date, setDate] = useState(record?.date ?? today);
  const [bed, setBed] = useState(record?.bed ?? '23:00');
  const [up, setUp] = useState(record?.up ?? '07:00');
  const [how, setHow] = useState<SleepQuality | undefined>(record?.how);
  const [note, setNote] = useState(record?.note ?? '');
  const [snoring, setSnoring] = useState(record?.snoring ?? false);
  const [gasping, setGasping] = useState(record?.gasping ?? false);

  const save = () => {
    const before = record;
    const replaced = sleeps.get(date);
    if (record && record.id !== date) sleeps.remove(record.id);
    sleeps.put({ id: date, date, bed, up, how, note: note.trim() || undefined, snoring: snoring || undefined, gasping: gasping || undefined });
    offerUndo(record ? 'Sleep changed' : 'Sleep saved', () => {
      sleeps.remove(date);
      if (replaced) sleeps.put(replaced);
      if (before) sleeps.put(before);
    });
    onDone();
  };

  return (
    <section className="card diaita-form">
      <label className="field">
        <span className="field__label">Woke on</span>
        <input className="input" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
      </label>
      <div className="input-row">
        <label className="field">
          <span className="field__label">Bed</span>
          <input className="input" type="time" value={bed} onChange={(event) => setBed(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Up</span>
          <input className="input" type="time" value={up} onChange={(event) => setUp(event.target.value)} />
        </label>
      </div>
      <div className="chip-row" role="group" aria-label="How you slept">
        {(['well', 'okay', 'poorly'] as const).map((option) => (
          <button key={option} type="button" className="chip" aria-pressed={how === option} onClick={() => setHow(how === option ? undefined : option)}>
            {QUALITY_NAMES[option]}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="field__label">Note (optional)</span>
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <div className="diaita-sleep-signs">
        <p className="field__label">Optional signs to record</p>
        <div className="switches">
          <Switch on={snoring} label="Loud snoring" onToggle={() => setSnoring(!snoring)} />
          <Switch on={gasping} label="Waking gasping" onToggle={() => setGasping(!gasping)} />
        </div>
      </div>
      <div className="button-row">
        <button type="button" className="button-quiet" onClick={onDone}>Cancel</button>
        <button type="button" className="button-main" disabled={!date || !bed || !up} onClick={save}>Save</button>
      </div>
      {record && (
        <button
          type="button"
          className="text-link diaita-remove"
          onClick={() => {
            sleeps.remove(record.id);
            offerUndo('Sleep removed', () => sleeps.put(record));
            onDone();
          }}
        >
          Remove
        </button>
      )}
    </section>
  );
}

export default function SleepPage({ nav, adding }: { nav: DiaitaNav; adding?: string | true }) {
  const all = [...sleeps.use()].sort((a, b) => b.date.localeCompare(a.date));
  const current = settings.use();
  const [editing, setEditing] = useState<string | true | undefined>(adding);
  const [shown, setShown] = useState(14);
  const today = toLocalDate(new Date());
  const { blocks } = usePlan(addDays(today, -14), today);
  const trainingDates = dynamisWorkouts.use().map((workout) => workout.date);
  const nightDates = blocks.filter(isNight).map((block) => toLocalDate(block.start));
  const recent = all.filter((record) => record.date > addDays(today, -14));
  const facts = sleepFacts(recent);
  const weekFacts = sleepWeekFacts(all.filter((record) => record.date > addDays(today, -7)), current.sleepHours);
  const editingRecord = typeof editing === 'string' ? all.find((record) => record.id === editing) : undefined;
  const done = () => (adding ? nav.back() : setEditing(undefined));

  return (
    <div className="page diaita-page">
      <div className="page-top">
        {adding ? (
          <button type="button" className="back-link" onClick={nav.back}><BackIcon size={18} />Back</button>
        ) : (
          <h1 className="title">Sleep</h1>
        )}
      </div>

      {editing ? (
        <SleepForm key={String(editing)} record={editingRecord} onDone={done} />
      ) : (
        <>
          {/* What the log says, in one place: the last two weeks, and this week against the amount chosen. */}
          {facts && (
            <section className="card diaita-summary">
              <h2 className="card__title">Your sleep</h2>
              <div className="diaita-fact-row">
                <span><strong>{hoursText(facts.averageMinutes)}</strong><small>Average, last 2 weeks</small></span>
                <span><strong>{facts.nights}</strong><small>{facts.nights === 1 ? 'Night logged' : 'Nights logged'}</small></span>
              </div>
              {weekFacts && (
                <div className="diaita-fact-row">
                  <span><strong>{hoursText(weekFacts.totalMinutes)}</strong><small>This week, {weekFacts.nights} {weekFacts.nights === 1 ? 'night' : 'nights'}</small></span>
                  <span><strong>{hoursText(weekFacts.chosenMinutes)}</strong><small>Your chosen amount</small></span>
                </div>
              )}
              {/* How much bedtimes and waking vary needs two nights to say anything. */}
              {weekFacts && weekFacts.nights > 1 && (
                <div className="diaita-fact-row">
                  <span><strong>{hoursText(weekFacts.bedSpreadMinutes)}</strong><small>Bedtime varied by</small></span>
                  <span><strong>{hoursText(weekFacts.upSpreadMinutes)}</strong><small>Waking varied by</small></span>
                </div>
              )}
            </section>
          )}
          <NightsChart records={all} today={today} bedtime={current.bedtime} sleepHours={current.sleepHours} />

          <div className="section-head">
            <h2>Nights</h2>
            <button type="button" className="text-link diaita-add" onClick={() => setEditing(true)}><PlusIcon size={18} />Add</button>
          </div>
          {all.length === 0 ? (
            <Empty icon={<MoonIcon size={28} />} title="No nights yet" />
          ) : (
            <ul className="rows rows--plain diaita-nights">
              {all.slice(0, shown).map((record) => (
                <li key={record.id}>
                  <button type="button" className="row diaita-night" onClick={() => setEditing(record.id)}>
                    <span className="diaita-night__hours">{shortHours(sleptMinutes(record))}</span>
                    <span className="row__text">
                      <span>{weekdayText(record.date, today)}</span>
                      <span className="row__detail">{clockText(record.bed)}–{clockText(record.up)}{record.how ? ` · ${QUALITY_NAMES[record.how]}` : ''}{record.note ? ` · ${record.note}` : ''}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {all.length > shown && <button type="button" className="text-link" onClick={() => setShown(all.length)}>All {all.length} nights</button>}

          {/* Ways to look closer, after the log: what the log suggests, nights side by side, and a two-week try. */}
          {all.length > 0 && <p className="ll-section-label">Look closer</p>}
          <Suggestion records={all} chosenHours={current.sleepHours} />
          <SideBySide records={all} nightDates={nightDates} trainingDates={trainingDates} cutoffHours={current.cutoffHours} />
          <ExperimentCard records={all} today={today} />
        </>
      )}
    </div>
  );
}
