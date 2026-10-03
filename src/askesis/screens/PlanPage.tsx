import { useMemo, useState } from 'react';
import { addDays, mondayOnOrBefore } from '../../core/scheduling/dates';
import type { Nav } from '../app/App';
import { pathFor, startPlan, useEntries, usePlanState, useSettings, useToday } from '../app/state';
import { BackLink, Segmented, Switch, useUndo } from '../app/ui';
import { inUnit, METERS } from '../core/pace';
import { aimDistances, aimWords, buildPath, defaultWeekdays, joinWeekFor, weekAt, weekMinutes, type Aim, type Plan } from '../core/plans';
import { savePlan, saveSettings } from '../data/store';
import GoalLink, { moveGoalTime } from './GoalLink';

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Kind = Aim['kind'];
type Step = 'now' | 'aim' | 'plan';

/** How long someone can run without stopping today. */
type Ability = 'carry' | 'none' | 'few' | 'ten' | 'twenty' | 'half' | 'hour';

const abilities: {
  id: Exclude<Ability, 'carry'>;
  label: string;
  minutes: number;
  week?: number;
}[] = [
  { id: 'none', label: 'Not yet', minutes: 0, week: 1 },
  { id: 'few', label: 'A few minutes', minutes: 3, week: 5 },
  { id: 'ten', label: '10 to 15 minutes', minutes: 10, week: 7 },
  { id: 'twenty', label: '20 to 30 minutes', minutes: 20, week: 9 },
  { id: 'half', label: '30 minutes to an hour', minutes: 30 },
  { id: 'hour', label: 'Over an hour', minutes: 60 },
];
const weeklyChoices = [60, 120, 180, 240, 300];
const timeChoices = [20, 30, 45, 60, 90, 120];

const sameAim = (a: Aim, b: Aim) => JSON.stringify(a) === JSON.stringify(b);
const isKnown = (meters: number) => aimDistances.some((d) => Math.abs(d.meters - meters) < 5);

/** The week someone joins a path at, from where they are now. */
function joinFor(plan: Plan, ability: Ability, weekly: number, carryWeek: number, carryWeekly: number): number {
  const last = plan.weeks.length;
  if (ability === 'carry') {
    // Still in the walk-run weeks: those are the same on every path, so the week stays.
    if (carryWeek <= 10) return Math.min(last, carryWeek);
    return Math.min(last, Math.max(11, joinWeekFor(plan, carryWeekly)));
  }
  const fixed = abilities.find((each) => each.id === ability)?.week;
  if (fixed) return Math.min(last, fixed);
  return Math.min(last, Math.max(11, joinWeekFor(plan, weekly)));
}

/**
 * Setting an aim in three steps: where the person is now, where they want to
 * be, and the plan between. The path is redrawn whenever any of it changes.
 */
export default function PlanPage({ nav, first }: { nav: Nav; first?: boolean }) {
  const today = useToday();
  const settings = useSettings();
  const current = usePlanState();
  const entries = useEntries() ?? [];
  const undo = useUndo();
  const unit = settings.unit;
  const currentMeters = current?.aim.kind === 'distance' ? current.aim.meters : undefined;
  const ownAtStart = currentMeters !== undefined && !isKnown(currentMeters);

  // From the log: the last two weeks' running, as minutes a week.
  const monday = mondayOnOrBefore(today);
  const logged = entries
    .filter((entry) => entry.date >= addDays(monday, -14) && entry.date < monday)
    .reduce((sum, entry) => sum + (entry.seconds ?? 0), 0);
  const fromLog = Math.round(logged / 60 / 2);
  const nearestWeekly = weeklyChoices.reduce((best, each) => (Math.abs(each - fromLog) < Math.abs(best - fromLog) ? each : best));

  const [step, setStep] = useState<Step>('now');
  const [ability, setAbility] = useState<Ability | undefined>(current ? 'carry' : undefined);
  const [weekly, setWeekly] = useState(fromLog >= 45 ? nearestWeekly : 120);

  const [kind, setKind] = useState<Kind>(current?.aim.kind ?? 'time');
  const [minutes, setMinutes] = useState(current?.aim.kind === 'time' ? current.aim.minutes : 30);
  const [meters, setMeters] = useState(currentMeters ?? 5000);
  const [own, setOwn] = useState(ownAtStart);
  const [ownText, setOwnText] = useState(ownAtStart && currentMeters ? String(Number(inUnit(currentMeters, unit).toFixed(1))) : '');
  const [words, setWords] = useState(current?.aimWords ?? '');
  const [why, setWhy] = useState(current?.why ?? '');
  const [runAt, setRunAt] = useState(current?.runAt ?? '');
  const [place, setPlace] = useState(current?.place ?? '');
  const [ifThen, setIfThen] = useState(current?.ifThen ?? '');

  const [dated, setDated] = useState(Boolean(current?.raceDate));
  const [raceDate, setRaceDate] = useState(current?.raceDate ?? addDays(today, 84));
  const [gentler, setGentler] = useState(Boolean(current?.gentler));
  const [days, setDays] = useState(current?.days ?? 3);
  const [weekdays, setWeekdays] = useState<number[]>(current?.weekdays ?? defaultWeekdays(3));

  const aim: Aim =
    kind === 'steady'
      ? { kind: 'steady' }
      : kind === 'time'
        ? { kind: 'time', minutes }
        : {
            kind: 'distance',
            meters: own ? (Number(ownText.replace(',', '.')) || 0) * METERS[unit] : meters,
          };
  const aimReady = aim.kind !== 'distance' || aim.meters >= 1000;
  const chosenDays = weekdays.length <= days ? weekdays : defaultWeekdays(days);
  const daysReady = chosenDays.length === days;
  const running = ability === 'half' || ability === 'hour';

  const naturalPath = useMemo(
    () => (aimReady ? buildPath({ aim, days, gentler }) : undefined),
    [JSON.stringify(aim), days, gentler, aimReady],
  );
  const carryWeekly = useMemo(() => (current ? weekMinutes(weekAt(pathFor(current), current.week)) : 0), [current]);
  const join = naturalPath && ability ? joinFor(naturalPath, ability, weekly, current?.week ?? 1, carryWeekly) : 1;
  const path = aimReady
    ? buildPath({
        aim,
        days,
        gentler,
        raceDate: dated ? raceDate : undefined,
        joinWeek: join,
        today,
      })
    : undefined;

  // Someone who can already run as long as a time aim asks for is there.
  const ableMinutes = abilities.find((each) => each.id === ability)?.minutes ?? 0;
  const alreadyThere = aim.kind === 'time' && ability !== 'carry' && ableMinutes >= aim.minutes;

  const unchanged = Boolean(
    current &&
    ability === 'carry' &&
    sameAim(current.aim, aim) &&
    Boolean(current.gentler) === gentler &&
    (current.raceDate ?? '') === (dated ? raceDate : '') &&
    current.days === days,
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
  const goTo = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const save = () => {
    if (!path) return;
    const own = {
      why: why.trim() || undefined,
      runAt: runAt || undefined,
      place: place.trim() || undefined,
      ifThen: ifThen.trim() || undefined,
    };
    if (unchanged && current) {
      // Same path: only the days or words change; the week stays, and time set aside for the goal follows the days.
      savePlan({
        ...current,
        weekdays: chosenDays,
        moves: {},
        aimWords: words.trim() || undefined,
        ...own,
      });
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
        {
          aim,
          days,
          gentler,
          raceDate: dated ? raceDate : undefined,
          weekdays: chosenDays,
          week: join,
          aimWords: words,
        },
        today,
        own,
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

  if (step === 'now')
    return (
      <div className="page">
        {!first && <BackLink label="More" onBack={nav.back} />}
        <h1 className="title">Where you are now</h1>

        <section className="field">
          <h2 className="label">How long can you run without stopping?</h2>
          <div className="choice-list" role="group" aria-label="How long can you run without stopping?">
            {current && (
              <button type="button" className="chip" aria-pressed={ability === 'carry'} onClick={() => setAbility('carry')}>
                Carry on from week {current.week}
              </button>
            )}
            {abilities.map((each) => (
              <button key={each.id} type="button" className="chip" aria-pressed={ability === each.id} onClick={() => setAbility(each.id)}>
                {each.label}
              </button>
            ))}
          </div>
        </section>

        {running && (
          <section className="field">
            <h2 className="label">Running each week, about</h2>
            <div className="chip-row" role="group" aria-label="Running each week">
              {weeklyChoices.map((each) => (
                <button key={each} type="button" className="chip" aria-pressed={weekly === each} onClick={() => setWeekly(each)}>
                  {each / 60}
                  {each === 300 ? '+' : ''} {each === 60 ? 'hour' : 'hours'}
                </button>
              ))}
            </div>
            {fromLog >= 45 && <p className="hint">Your log: about {Math.round(fromLog / 6) / 10} h a week lately.</p>}
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

        <button type="button" className="button-main" onClick={() => goTo('aim')} disabled={!ability}>
          Next
        </button>
      </div>
    );

  if (step === 'aim')
    return (
      <div className="page">
        <BackLink label="Where you are now" onBack={() => goTo('now')} />
        <h1 className="title">Where you want to be</h1>

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
            <div className="chip-row" role="group" aria-label="Minutes">
              {timeChoices.map((each) => (
                <button key={each} type="button" className="chip" aria-pressed={minutes === each} onClick={() => setMinutes(each)}>
                  {each < 60 ? `${each} min` : each === 60 ? '1 hour' : each === 90 ? '1½ hours' : '2 hours'}
                </button>
              ))}
            </div>
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
                  aria-pressed={!own && Math.abs(meters - each.meters) < 5}
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

        {kind === 'steady' && <p className="muted">A steady rhythm on your days, gently varied, for as long as you like.</p>}

        <label className="field">
          <span className="label">In your words, if you like</span>
          <input className="input" value={words} placeholder={aimWords(aim, unit)} onChange={(event) => setWords(event.target.value)} />
        </label>

        <label className="field">
          <span className="label">Why it matters to you, if you like</span>
          <textarea
            className="input input--area"
            rows={2}
            value={why}
            placeholder="For a clear head. To keep up with my kids."
            onChange={(event) => setWhy(event.target.value)}
          />
        </label>

        <button type="button" className="button-main" onClick={() => goTo('plan')} disabled={!aimReady}>
          Next
        </button>
      </div>
    );

  return (
    <div className="page">
      <BackLink label="Where you want to be" onBack={() => goTo('aim')} />
      <h1 className="title">Your plan</h1>

      <section className="field">
        <h2 className="label">Days a week</h2>
        <Segmented
          label="Days a week"
          value={String(days)}
          options={[3, 4, 5, 6].map((d) => ({
            id: String(d),
            label: `${d} days`,
          }))}
          onChange={(next) => pickDays(Number(next))}
        />
        <div className="weekday-row" role="group" aria-label="Which days">
          {weekdayNames.map((name, day) => (
            <button key={name} type="button" className="weekday" aria-pressed={chosenDays.includes(day)} onClick={() => toggleDay(day)}>
              {name}
            </button>
          ))}
        </div>
      </section>

      <section className="field">
        <h2 className="label">When and where, if you like</h2>
        <div className="input-pair">
          <input className="input" type="time" aria-label="Usual time" value={runAt} onChange={(event) => setRunAt(event.target.value)} />
          <input className="input" aria-label="Where" placeholder="Where" value={place} onChange={(event) => setPlace(event.target.value)} />
        </div>
        {runAt && <p className="hint">A reminder at this time comes through Proairetos notifications, when they are on.</p>}
      </section>

      <label className="field">
        <span className="label">If something gets in the way, I’ll…</span>
        <input className="input" value={ifThen} placeholder="Walk it instead" onChange={(event) => setIfThen(event.target.value)} />
      </label>

      {kind !== 'steady' && (
        <section className="field">
          <h2 className="label">By a date</h2>
          <Segmented
            label="By a date"
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

      {kind !== 'steady' && (
        <div className="card switches">
          <Switch on={gentler} label="Go gentler" detail="More weeks to the same place." onToggle={() => setGentler(!gentler)} />
        </div>
      )}

      {alreadyThere ? (
        <section className="card path-summary" aria-label="Your path">
          <span className="card__eyebrow">Your path</span>
          <p>You can already run this.</p>
          <div className="button-row">
            <button type="button" className="button-quiet" onClick={() => goTo('aim')}>
              A longer aim
            </button>
            <button
              type="button"
              className="button-quiet"
              onClick={() => {
                setKind('steady');
                setDated(false);
              }}
            >
              Keep running
            </button>
          </div>
        </section>
      ) : (
        path &&
        joinWeek && (
          <section className="card path-summary" aria-label="Your path">
            <span className="card__eyebrow">Your path</span>
            <p>
              Week {join}: {joinWeek.theme.charAt(0).toLowerCase() + joinWeek.theme.slice(1)}.
            </p>
            {path.cycleFrom ? (
              <p className="muted">Then a steady rhythm, gently varied.</p>
            ) : (
              weeksToAim !== undefined && (
                <p className="muted">
                  {path.fit === 'shortened'
                    ? `The date comes sooner than a gentle path needs, so it grows for fewer weeks, never faster: ${weeksToAim} weeks.`
                    : path.fit === 'held'
                      ? `${weeksToAim} weeks to the date, holding steady for a few.`
                      : `About ${weeksToAim} ${weeksToAim === 1 ? 'week' : 'weeks'} to your aim.`}
                </p>
              )
            )}
          </section>
        )
      )}

      {!first && current && unchanged && <GoalLink plan={current} />}

      {!daysReady && (
        <p className="hint" role="status">
          Pick {days - chosenDays.length} more {days - chosenDays.length === 1 ? 'day' : 'days'}.
        </p>
      )}
      <button type="button" className="button-main" onClick={save} disabled={!daysReady || !path || alreadyThere}>
        {first ? 'Begin' : unchanged ? 'Keep this path' : 'Start this path'}
      </button>
    </div>
  );
}
