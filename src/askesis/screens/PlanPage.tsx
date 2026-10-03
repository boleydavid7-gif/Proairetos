import { useMemo, useState } from 'react';
import { addDays, mondayOnOrBefore } from '../../core/scheduling/dates';
import type { Nav } from '../app/App';
import { pathFor, startPlan, useEntries, usePlanState, useSettings, useToday } from '../app/state';
import { BackLink, Segmented, Switch, useUndo } from '../app/ui';
import { inUnit, METERS } from '../core/pace';
import { aimDistances, aimWords, buildPath, defaultWeekdays, joinWeekFor, weekAt, weekMinutes, type Aim } from '../core/plans';
import { savePlan, saveSettings } from '../data/store';
import GoalLink, { moveGoalTime } from './GoalLink';

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Kind = Aim['kind'];
/** Where someone is now, as minutes a week; -1 is "about 30 minutes at a time", -2 "where I am on my path". */
type Now = number;

const sameAim = (a: Aim, b: Aim) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Setting an aim: the person's own, in their words. The path is drawn from
 * where they are to that aim, and redrawn whenever they change it.
 */
export default function PlanPage({ nav, first }: { nav: Nav; first?: boolean }) {
  const today = useToday();
  const settings = useSettings();
  const current = usePlanState();
  const entries = useEntries() ?? [];
  const undo = useUndo();
  const unit = settings.unit;
  const currentMeters = current?.aim.kind === 'distance' ? current.aim.meters : undefined;
  const ownAtStart = currentMeters !== undefined && !aimDistances.some((d) => Math.abs(d.meters - currentMeters) < 50);

  const [kind, setKind] = useState<Kind>(current?.aim.kind ?? 'time');
  const [minutes, setMinutes] = useState(current?.aim.kind === 'time' ? current.aim.minutes : 30);
  const [meters, setMeters] = useState(currentMeters ?? 5000);
  const [own, setOwn] = useState(ownAtStart);
  const [ownText, setOwnText] = useState(ownAtStart && currentMeters ? String(Number(inUnit(currentMeters, unit).toFixed(1))) : '');
  const [words, setWords] = useState(current?.aimWords ?? '');
  const [dated, setDated] = useState(Boolean(current?.raceDate));
  const [raceDate, setRaceDate] = useState(current?.raceDate ?? addDays(today, 84));
  const [gentler, setGentler] = useState(Boolean(current?.gentler));
  const [days, setDays] = useState(current?.days ?? 3);
  const [weekdays, setWeekdays] = useState<number[]>(current?.weekdays ?? defaultWeekdays(3));

  // From the log: the last two weeks' running, as minutes a week.
  const monday = mondayOnOrBefore(today);
  const logged = entries
    .filter((entry) => entry.date >= addDays(monday, -14) && entry.date < monday)
    .reduce((sum, entry) => sum + (entry.seconds ?? 0), 0);
  const fromLog = Math.round(logged / 60 / 2);
  const [now, setNow] = useState<Now>(current ? -2 : fromLog >= 60 ? fromLog : 0);

  const aim: Aim =
    kind === 'steady'
      ? { kind: 'steady' }
      : kind === 'time'
        ? { kind: 'time', minutes }
        : { kind: 'distance', meters: own ? (Number(ownText.replace(',', '.')) || 0) * METERS[unit] : meters };
  const aimReady = aim.kind !== 'distance' || aim.meters >= 1000;
  const chosenDays = weekdays.length <= days ? weekdays : defaultWeekdays(days);
  const daysReady = chosenDays.length === days;

  const naturalPath = useMemo(
    () => (aimReady ? buildPath({ aim, days, gentler }) : undefined),
    [JSON.stringify(aim), days, gentler, aimReady],
  );
  const join = useMemo(() => {
    if (!naturalPath) return 1;
    if (now === 0) return 1;
    if (now === -1) return Math.min(naturalPath.weeks.length, 11);
    if (now === -2 && current) return joinWeekFor(naturalPath, weekMinutes(weekAt(pathFor(current), current.week)));
    return joinWeekFor(naturalPath, now);
  }, [naturalPath, now]);
  const path = aimReady ? buildPath({ aim, days, gentler, raceDate: dated ? raceDate : undefined, joinWeek: join, today }) : undefined;

  const unchanged = Boolean(
    current &&
      sameAim(current.aim, aim) &&
      Boolean(current.gentler) === gentler &&
      (current.raceDate ?? '') === (dated ? raceDate : '') &&
      current.days === days &&
      now === -2,
  );

  const pickDays = (next: number) => {
    setDays(next);
    setWeekdays(defaultWeekdays(next));
  };
  const toggleDay = (day: number) => {
    if (chosenDays.includes(day)) setWeekdays(chosenDays.filter((d) => d !== day));
    else if (chosenDays.length < days) setWeekdays([...chosenDays, day].sort((a, b) => a - b));
    else setWeekdays([...chosenDays.slice(1), day].sort((a, b) => a - b));
  };

  const save = () => {
    if (!path) return;
    if (unchanged && current) {
      // Same path: only the days or words change; the week stays, and time set aside for the goal follows the days.
      savePlan({ ...current, weekdays: chosenDays, moves: {}, aimWords: words.trim() || undefined });
      if (chosenDays.join() !== [...current.weekdays].sort((a, b) => a - b).join())
        void moveGoalTime(current.goalId, chosenDays, today).then((putBack) =>
          undo(putBack ? 'Run days and protected time moved' : 'Run days changed', () => {
            savePlan(current);
            void putBack?.();
          }),
        );
    } else {
      const before = current;
      startPlan(
        { aim, days, gentler, raceDate: dated ? raceDate : undefined, weekdays: chosenDays, week: join, aimWords: words },
        today,
      );
      if (before) undo('A new path', () => savePlan(before));
    }
    if (first) {
      saveSettings({ ...settings, started: true });
      nav.swap({ name: 'home' });
    } else nav.back();
  };

  const weeksToAim = path && !path.cycleFrom ? path.weeks.length - join + 1 : undefined;
  const joinWeek = path ? weekAt(path, join) : undefined;

  return (
    <div className="page">
      {!first && <BackLink label="More" onBack={nav.back} />}
      <h1 className="title">{first ? 'What are you aiming for?' : 'Your aim'}</h1>
      <p className="lead">Your own aim, at your pace. Change it any time; the path redraws from where you are.</p>

      <Segmented
        label="Aim"
        value={kind}
        options={[
          { id: 'time', label: 'A time' },
          { id: 'distance', label: 'A distance' },
          { id: 'steady', label: 'Keep running' },
        ]}
        onChange={setKind}
      />

      {kind === 'time' && (
        <section className="field">
          <h2 className="label">Run without stopping for</h2>
          <div className="stepper">
            <button type="button" className="stepper__button" aria-label="Less" onClick={() => setMinutes(Math.max(10, minutes - 5))}>
              −
            </button>
            <span className="stepper__value">{minutes} minutes</span>
            <button type="button" className="stepper__button" aria-label="More" onClick={() => setMinutes(Math.min(180, minutes + 5))}>
              +
            </button>
          </div>
        </section>
      )}

      {kind === 'distance' && (
        <section className="field">
          <h2 className="label">Run</h2>
          <div className="chip-row" role="group" aria-label="Distance">
            {aimDistances.map((each) => (
              <button
                key={each.name}
                type="button"
                className="chip"
                aria-pressed={!own && Math.abs(meters - each.meters) < 50}
                onClick={() => {
                  setOwn(false);
                  setMeters(each.meters);
                }}
              >
                {each.name}
              </button>
            ))}
            <button type="button" className="chip" aria-pressed={own} onClick={() => setOwn(true)}>
              Your own
            </button>
          </div>
          {own && (
            <div className="input-row">
              <input
                className="input"
                inputMode="decimal"
                aria-label={`Distance in ${unit}`}
                placeholder={unit === 'mi' ? 'For example 5' : 'For example 8'}
                value={ownText}
                onChange={(event) => setOwnText(event.target.value)}
              />
              <span className="hint input-unit">{unit}</span>
            </div>
          )}
        </section>
      )}

      {kind === 'steady' && (
        <p className="muted">
          No target: a steady rhythm on your days, gently varied, round and round. If you are new to running, it starts with the
          walk-run weeks.
        </p>
      )}

      <label className="field">
        <span className="label">In your words, if you like</span>
        <input className="input" value={words} placeholder={aimWords(aim, unit)} onChange={(event) => setWords(event.target.value)} />
      </label>

      {kind !== 'steady' && (
        <section className="field">
          <h2 className="label">When</h2>
          <Segmented
            label="When"
            value={dated ? 'date' : 'none'}
            options={[
              { id: 'none', label: 'No date' },
              { id: 'date', label: 'A date' },
            ]}
            onChange={(value) => setDated(value === 'date')}
            small
          />
          {dated && (
            <input
              className="input"
              type="date"
              min={addDays(today, 7)}
              aria-label="The date"
              value={raceDate}
              onChange={(event) => setRaceDate(event.target.value)}
            />
          )}
        </section>
      )}

      <div className="card switches">
        <Switch
          on={gentler}
          label="Go gentler"
          detail="Weekly time grows about 5% a week instead of about 7%. More weeks, the same place."
          onToggle={() => setGentler(!gentler)}
        />
      </div>

      <section className="field">
        <h2 className="label">Where you are now</h2>
        <div className="chip-row" role="group" aria-label="Where you are now">
          {current && (
            <button type="button" className="chip" aria-pressed={now === -2} onClick={() => setNow(-2)}>
              Where I am on my path
            </button>
          )}
          <button type="button" className="chip" aria-pressed={now === 0} onClick={() => setNow(0)}>
            Not running yet
          </button>
          <button type="button" className="chip" aria-pressed={now === -1} onClick={() => setNow(-1)}>
            About 30 minutes at a time
          </button>
          {fromLog >= 60 && (
            <button type="button" className="chip" aria-pressed={now === fromLog} onClick={() => setNow(fromLog)}>
              From my log: about {Math.round(fromLog / 6) / 10} h a week
            </button>
          )}
          {[120, 180, 240].map((each) => (
            <button key={each} type="button" className="chip" aria-pressed={now === each} onClick={() => setNow(each)}>
              About {each / 60}
              {each === 240 ? '+' : ''} hours a week
            </button>
          ))}
        </div>
      </section>

      <section className="field">
        <h2 className="label">Days a week</h2>
        <Segmented
          label="Days a week"
          value={String(days)}
          options={[3, 4, 5, 6].map((d) => ({ id: String(d), label: `${d} days` }))}
          onChange={(next) => pickDays(Number(next))}
        />
        <div className="weekday-row" role="group" aria-label="Which days">
          {weekdayNames.map((name, day) => (
            <button key={name} type="button" className="weekday" aria-pressed={chosenDays.includes(day)} onClick={() => toggleDay(day)}>
              {name}
            </button>
          ))}
        </div>
        <p className="hint">
          The longest run goes on the last of these. Days after a night of work are marked, if you use Proairetos here.
        </p>
      </section>

      {path && joinWeek && (
        <section className="card path-summary" aria-label="Your path">
          <span className="card__eyebrow">Your path</span>
          <p>
            You join at week {join}: {joinWeek.stage.toLowerCase()}, {joinWeek.theme.charAt(0).toLowerCase() + joinWeek.theme.slice(1)}.
          </p>
          {path.cycleFrom ? (
            <p className="muted">Then a steady rhythm, gently varied, for as long as you like.</p>
          ) : (
            weeksToAim !== undefined && (
              <p className="muted">
                {path.fit === 'shortened'
                  ? `The date comes sooner than a gentle path needs, so it grows for fewer weeks, never faster: ${weeksToAim} weeks.`
                  : path.fit === 'held'
                    ? `${weeksToAim} weeks to the date, with a few holding steady before the sharper ones.`
                    : `About ${weeksToAim} ${weeksToAim === 1 ? 'week' : 'weeks'} to your aim${gentler ? ', gently' : ''}.`}
              </p>
            )
          )}
        </section>
      )}

      {first && (
        <section className="field">
          <h2 className="label">Distances in</h2>
          <Segmented
            label="Distances in"
            value={unit}
            options={[
              { id: 'mi', label: 'Miles' },
              { id: 'km', label: 'Kilometres' },
            ]}
            onChange={(next) => saveSettings({ ...settings, unit: next })}
          />
        </section>
      )}

      {!first && current && unchanged && <GoalLink plan={current} />}

      {!daysReady && (
        <p className="hint" role="status">
          Pick {days - chosenDays.length} more {days - chosenDays.length === 1 ? 'day' : 'days'}.
        </p>
      )}
      <button type="button" className="button-main" onClick={save} disabled={!daysReady || !path}>
        {first ? 'Begin' : unchanged ? 'Keep this path' : 'Start this path'}
      </button>
    </div>
  );
}
