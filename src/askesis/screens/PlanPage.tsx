import { useMemo, useState } from 'react';
import { addDays, mondayOnOrBefore } from '../../core/scheduling/dates';
import type { Nav } from '../app/App';
import { pathFor, startPlan, useEntries, usePlanState, useSettings, useToday } from '../app/state';
import { BackLink, Segmented, Switch, useUndo } from '../app/ui';
import { inUnit, METERS } from '../core/pace';
import {
  aimDistances,
  aimWords,
  buildPath,
  defaultWeekdays,
  fromWeek,
  joinFor,
  lastWeekOf,
  matchingWeek,
  placementFor,
  runChoices,
  suggestedLevel,
  walkChoices,
  weekAt,
  type Aim,
  type Level,
  type RunNow,
  type StartTest,
  type WalkNow,
} from '../core/plans';
import { savePlan, saveSettings } from '../data/store';
import GoalLink, { moveGoalTime } from './GoalLink';

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Kind = Aim['kind'];
type Step = 'now' | 'aim' | 'plan';

const weeklyChoices = [60, 120, 180, 240, 300];
const timeChoices = [20, 30, 45, 60, 90, 120];
const levelNames: Record<Level, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

const sameAim = (a: Aim, b: Aim) => JSON.stringify(a) === JSON.stringify(b);
const isKnown = (meters: number) => aimDistances.some((d) => Math.abs(d.meters - meters) < 5);

/** The answers so far, kept on the phone so a test run can come back to them. */
const TEST_KEY = 'askesis:startTest';
type Draft = { walk?: WalkNow; run?: RunNow };
function readDraft(): Draft {
  try {
    return JSON.parse(localStorage.getItem(TEST_KEY) ?? '{}') as Draft;
  } catch {
    return {};
  }
}
function writeDraft(draft: Draft) {
  try {
    localStorage.setItem(TEST_KEY, JSON.stringify(draft));
  } catch {
    // Only a convenience.
  }
}

/**
 * Setting an aim in three steps: where the person is now (a short test that
 * suggests a level), where they want to be, and the plan between. Every
 * level begins at its own week 1.
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

  const draft = useMemo(readDraft, []);
  const [step, setStep] = useState<Step>('now');
  const [carry, setCarry] = useState(Boolean(current) && !draft.run);
  const [walkNow, setWalkNow] = useState<WalkNow | undefined>(draft.walk);
  const [runNow, setRunNow] = useState<RunNow | undefined>(draft.run);
  const [weekly, setWeekly] = useState(fromLog >= 45 ? nearestWeekly : 120);
  const [levelPick, setLevelPick] = useState<Level>();

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
  const [gentlerPick, setGentlerPick] = useState<boolean | undefined>(current ? Boolean(current.gentler) : undefined);
  const [days, setDays] = useState(current?.days ?? 3);
  const [weekdays, setWeekdays] = useState<number[]>(current?.weekdays ?? defaultWeekdays(3));

  const pickWalk = (walk: WalkNow) => {
    setWalkNow(walk);
    writeDraft({ walk, run: runNow });
  };
  const pickRun = (run: RunNow) => {
    setRunNow(run);
    writeDraft({ walk: walkNow, run });
  };

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
  const runs = runNow === '30to60' || runNow === 'over60';

  // The test: answers, the level they suggest, and what the chosen level means here.
  const test: StartTest | undefined = walkNow && runNow ? { walk: walkNow, run: runNow, weekly: runs ? weekly : undefined } : undefined;
  const suggested = test && suggestedLevel(test);
  const level = levelPick ?? suggested;
  const placement = test && level ? placementFor(test, level) : undefined;
  const gentler = gentlerPick ?? Boolean(carry ? current?.gentler : placement?.gentler);
  const walkFirst = carry ? Boolean(current?.walkFirst) : Boolean(placement?.walkFirst);
  const tested = carry || Boolean(placement);

  const naturalPath = useMemo(
    () => (aimReady ? buildPath({ aim, days, gentler, walkFirst }) : undefined),
    [JSON.stringify(aim), days, gentler, walkFirst, aimReady],
  );
  // The week of the full path where the runner is now, and the number they know it by.
  const ownWeek = carry && current ? current.week : 1;
  const nowWeek = useMemo(() => {
    if (!naturalPath) return 1;
    if (carry && current) return Math.max(1, matchingWeek(weekAt(pathFor(current), current.week), naturalPath));
    return placement ? joinFor(naturalPath, placement) : 1;
  }, [naturalPath, carry, current, JSON.stringify(placement)]);
  const path = aimReady
    ? fromWeek(
        buildPath({ aim, days, gentler, walkFirst, raceDate: dated ? raceDate : undefined, joinWeek: nowWeek, today }),
        nowWeek - ownWeek + 1,
      )
    : undefined;

  // Someone who can already run as long as a time aim asks for is there.
  const ableMinutes = runChoices.find((each) => each.id === runNow)?.minutes ?? 0;
  const alreadyThere = aim.kind === 'time' && !carry && ableMinutes >= aim.minutes;

  const unchanged = Boolean(
    current &&
    carry &&
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
          walkFirst,
          raceDate: dated ? raceDate : undefined,
          weekdays: chosenDays,
          week: nowWeek,
          ownWeek,
          aimWords: words,
        },
        today,
        carry && current ? { ...own, startWeeks: current.startWeeks, startedOn: current.startedOn } : own,
      );
      if (before) undo('A new path', () => savePlan(before));
    }
    writeDraft({});
    if (first) {
      saveSettings({ ...settings, started: true });
      nav.swap({ name: 'home' });
    } else nav.back();
  };

  const weeksToAim = path && !path.cycleFrom ? lastWeekOf(path) - ownWeek + 1 : undefined;
  const joinWeek = path ? weekAt(path, ownWeek) : undefined;
  const firstSession = joinWeek?.workouts.find((workout) => workout.kind !== 'walk') ?? joinWeek?.workouts[0];

  if (step === 'now')
    return (
      <div className="page">
        {!first && <BackLink label="More" onBack={nav.back} />}
        <h1 className="title">Where you are now</h1>

        {current && (
          <div className="choice-list" role="group" aria-label="Your path">
            <button type="button" className="chip" aria-pressed={carry} onClick={() => setCarry(true)}>
              Carry on from week {current.week}
            </button>
            <button type="button" className="chip" aria-pressed={!carry} onClick={() => setCarry(false)}>
              Start again at week 1
            </button>
          </div>
        )}

        {!carry && (
          <>
            <section className="field">
              <h2 className="label">How long can you walk briskly at once?</h2>
              <div className="choice-list" role="group" aria-label="How long can you walk briskly at once?">
                {walkChoices.map((each) => (
                  <button key={each.id} type="button" className="chip" aria-pressed={walkNow === each.id} onClick={() => pickWalk(each.id)}>
                    {each.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="field">
              <h2 className="label">How long can you run without stopping?</h2>
              <div className="choice-list" role="group" aria-label="How long can you run without stopping?">
                {runChoices.map((each) => (
                  <button key={each.id} type="button" className="chip" aria-pressed={runNow === each.id} onClick={() => pickRun(each.id)}>
                    {each.label}
                  </button>
                ))}
              </div>
              <button type="button" className="text-link test-link" onClick={() => nav.go({ name: 'test' })}>
                Not sure? Try a test run
              </button>
            </section>

            {runs && (
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

            {suggested && level && (
              <section className="card level" aria-label="Your level">
                <span className="card__eyebrow">Suggested: {levelNames[suggested]}</span>
                <div className="chip-row" role="group" aria-label="Level">
                  {(Object.keys(levelNames) as Level[]).map((each) => (
                    <button key={each} type="button" className="chip" aria-pressed={level === each} onClick={() => setLevelPick(each)}>
                      {levelNames[each]}
                    </button>
                  ))}
                </div>
                <p className="muted">
                  {level === 'beginner'
                    ? placement?.walkFirst
                      ? 'Two weeks of walking, then walk-run, building to 30 minutes of running.'
                      : 'Walk-run, building to 30 minutes of running.'
                    : level === 'intermediate'
                      ? `Easy running from about ${(placement?.weekly ?? 120) / 60} hours a week, building week by week.`
                      : `More running from about ${(placement?.weekly ?? 240) / 60} hours a week, and sharper sessions sooner.`}
                </p>
              </section>
            )}
          </>
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

        <button type="button" className="button-main" onClick={() => goTo('aim')} disabled={!tested}>
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

        <label className="field">
          <span className="label">Name it (optional)</span>
          <input className="input" value={words} placeholder={aimWords(aim, unit)} onChange={(event) => setWords(event.target.value)} />
        </label>

        <label className="field">
          <span className="label">Why it matters (optional)</span>
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
        <h2 className="label">When and where (optional)</h2>
        <div className="input-pair">
          <input className="input" type="time" aria-label="Usual time" value={runAt} onChange={(event) => setRunAt(event.target.value)} />
          <input className="input" aria-label="Where" placeholder="Where" value={place} onChange={(event) => setPlace(event.target.value)} />
        </div>
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
          <Switch on={gentler} label="Go gentler" detail="More weeks to the same place." onToggle={() => setGentlerPick(!gentler)} />
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
              Week {ownWeek}: {joinWeek.theme.charAt(0).toLowerCase() + joinWeek.theme.slice(1)}.
            </p>
            {firstSession && <p className="muted">First session: {firstSession.summary.charAt(0).toLowerCase() + firstSession.summary.slice(1)}.</p>}
            {path.cycleFrom ? (
              <p className="muted">Then a steady rhythm.</p>
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
