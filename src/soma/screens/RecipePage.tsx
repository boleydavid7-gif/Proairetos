import { useEffect, useState } from 'react';
import { reflectionService } from '../../app/services';
import type { Nav } from '../app/App';
import { ClockIcon, HeartIcon, PotIcon, ServesIcon, ShareIcon } from '../app/icons';
import { dishScene } from '../app/scenes';
import { newId, useGroceries, useRecipes, useSettings, useToday } from '../app/state';
import { startTimer, stopTimer, timeLeft, useTimers } from '../app/timers';
import { BackLink, dayLabel, Segmented, useUndo } from '../app/ui';
import { addToList, usuallyHave } from '../core/groceries';
import { convertLine, scaleLine } from '../core/ingredients';
import { headingText, isHeading, marks, minutesLabel, servingsNumber, timeOf, timersIn, type Recipe } from '../core/recipes';
import { stepsWithAmounts, timerName } from '../core/cookAids';
import { swapsFor } from '../core/swaps';
import { recipeAsText } from '../core/share';
import { togglePlanned, weekFrom } from '../core/week';
import { usePeople } from '../app/proairetos';
import { waysToTry } from '../core/tryIt';
import { deleteRecipe, loadSettings, putRecipe, saveGroceries } from '../data/store';
import { listBills, getBudget, loadSettings as loadOikonomiaSettings } from '../../oikonomia/data/store';
import { budgetTotals, monthKey, recipeBudgetComparison } from '../../oikonomia/core/budget';
import { formatMoney } from '../../oikonomia/core/bills';

type Tab = 'ingredients' | 'steps' | 'notes';

export function StepTimers({ step }: { step: string }) {
  const timers = useTimers();
  const found = timersIn(step);
  if (!found.length) return null;
  return (
    <span className="cook__timers" style={{ margin: '4px 0 0' }}>
      {found.map(({ minutes, label }) => {
        const running = timers.find((timer) => timer.label === label && !timer.done);
        const rang = timers.find((timer) => timer.label === label && timer.done);
        return running ? (
          <button key={label} type="button" className="timer-chip timer-chip--running" onClick={() => stopTimer(running.id)} aria-label={`Stop the ${label} timer`}>
            {timeLeft(running)}
          </button>
        ) : (
          <button
            key={label}
            type="button"
            className="timer-chip"
            onClick={() => {
              if (rang) stopTimer(rang.id);
              startTimer(label, minutes, timerName(step, label));
            }}
          >
            <ClockIcon size={16} /> {rang ? 'Again: ' : ''}
            {label}
          </button>
        );
      })}
    </span>
  );
}

/** Every timer running or rung, wherever it was started. */
export function TimerTray() {
  const timers = useTimers();
  if (!timers.length) return null;
  return (
    <div className="timer-tray" role="status" aria-label="Timers">
      {timers.map((timer) => (
        <button key={timer.id} type="button" className={`timer-chip${timer.done ? '' : ' timer-chip--running'}`} onClick={() => stopTimer(timer.id)} aria-label={timer.done ? `${timer.name} is done. Dismiss` : `Stop ${timer.name}`}>
          {timer.name} · {timer.done ? 'done' : timeLeft(timer)}
        </button>
      ))}
    </div>
  );
}

export function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="step-list">
      {steps.map((step, i) =>
        isHeading(step) ? (
          <li key={i} className="step-list__heading" style={{ listStyle: 'none' }}>
            {headingText(step)}
          </li>
        ) : (
          <li key={i} className="step-list__item">
            <span>
              {step}
              <StepTimers step={step} />
            </span>
          </li>
        ),
      )}
    </ol>
  );
}

export default function RecipePage({ nav, id }: { nav: Nav; id: string }) {
  const recipes = useRecipes();
  const recipe = recipes?.find((each) => each.id === id);
  const groceries = useGroceries() ?? [];
  const settings = useSettings();
  const today = useToday();
  const undo = useUndo();
  const [tab, setTab] = useState<Tab>('ingredients');
  const [gathered, setGathered] = useState<Set<number>>(new Set());
  const base = servingsNumber(recipe?.servings);
  const [serves, setServes] = useState<number | undefined>(base);
  const [picking, setPicking] = useState(false);
  const [notes, setNotes] = useState(recipe?.notes ?? '');
  const [afterLine, setAfterLine] = useState<string>();
  const [cookedFor, setCookedFor] = useState<string[]>([]);
  const [otherName, setOtherName] = useState('');
  const [sheet, setSheet] = useState<'swaps' | 'plan'>();
  const [copied, setCopied] = useState(false);
  const people = usePeople();
  useTimers();

  useEffect(() => {
    setNotes(recipe?.notes ?? '');
    setServes(servingsNumber(recipe?.servings));
  }, [recipe?.id]);

  if (!recipes) return null;
  if (!recipe)
    return (
      <div className="page">
        <BackLink label="Back" onBack={nav.back} />
        <p className="muted">This recipe is not here any more.</p>
      </div>
    );

  const factor = base && serves ? serves / base : 1;
  const sourceLines = recipe.ingredients.map((line) => scaleLine(line, factor));
  const lines = sourceLines.map((line) => (isHeading(line) ? line : convertLine(line, settings.units)));
  const save = (change: Partial<Recipe>) => putRecipe({ ...recipe, ...change, updatedAt: new Date().toISOString() });
  const time = minutesLabel(timeOf(recipe));
  const ways = settings.waysToTry ? waysToTry(recipe) : [];
  const lastCooked = recipe.cooked?.at(-1);
  const note = recipe.notes.trim();

  const share = async () => {
    const text = recipeAsText(recipe);
    try {
      if (navigator.share) await navigator.share({ title: recipe.title, text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      // Closed without sharing.
    }
  };

  const remove = async () => {
    const putBack = await deleteRecipe(recipe.id);
    nav.back();
    undo('Recipe removed', () => void putBack());
  };

  return (
    <div className="page recipe">
      <div className="recipe-hero">
        <img src={recipe.image || dishScene(recipe.id)} alt="" />
        <div className="recipe-hero__bar">
          <button type="button" className="round-button" onClick={nav.back} aria-label="Back">
            ‹ Back
          </button>
          <span style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="round-button"
              aria-pressed={Boolean(recipe.favorite)}
              aria-label={recipe.favorite ? 'Take out of favourites' : 'Keep as a favourite'}
              onClick={() => void save({ favorite: !recipe.favorite })}
            >
              <HeartIcon size={20} filled={recipe.favorite} />
            </button>
            <button type="button" className="round-button" aria-label="Share this recipe" onClick={() => void share()}>
              <ShareIcon size={20} />
            </button>
            <button type="button" className="round-button" onClick={() => nav.go({ name: 'edit', id: recipe.id })}>
              Edit
            </button>
          </span>
        </div>
      </div>

      <h1 className="title">{recipe.title}</h1>
      <div className="recipe-meta">
        {time && (
          <span>
            <ClockIcon size={16} /> {time}
          </span>
        )}
        {recipe.servings && (
          <span>
            <ServesIcon size={16} /> {recipe.servings}
          </span>
        )}
        {recipe.estimatedCostCents !== undefined && (
          <span>
            Estimated cost · {formatMoney(recipe.estimatedCostCents, recipe.estimatedCostCurrency ?? loadOikonomiaSettings().currency)}
          </span>
        )}
        {recipe.url ? (
          <a href={recipe.url} target="_blank" rel="noreferrer">
            {recipe.source ?? 'Source'}
          </a>
        ) : (
          recipe.source && <span>{recipe.source}</span>
        )}
      </div>
      <RecipeBudgetHint recipe={recipe} recipes={recipes} />
      {copied && (
        <p className="hint" role="status">
          Copied, ready to paste.
        </p>
      )}
      {note && tab !== 'notes' && (
        <button type="button" className="recipe-note" onClick={() => setTab('notes')}>
          {note.split('\n')[0]}
        </button>
      )}
      <div className="chip-grid recipe-marks" role="group" aria-label="Your marks">
        {marks.map((mark) => {
          const on = Boolean(recipe.marks?.includes(mark.id));
          return (
            <button
              key={mark.id}
              type="button"
              className="chip chip--small"
              aria-pressed={on}
              onClick={() => void save({ marks: on ? recipe.marks!.filter((each) => each !== mark.id) : [...(recipe.marks ?? []), mark.id] })}
            >
              {mark.label}
            </button>
          );
        })}
      </div>
      {recipe.tags.length > 0 && (
        <div className="tags">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <Segmented
        label="Recipe"
        value={tab}
        options={[
          { id: 'ingredients', label: 'Ingredients' },
          { id: 'steps', label: 'Steps' },
          { id: 'notes', label: 'Notes' },
        ]}
        onChange={setTab}
      />

      {tab === 'ingredients' && (
        <section aria-label="Ingredients">
          {base && serves && (
            <div className="servings">
              <span>Servings</span>
              <span className="stepper">
                <button type="button" className="stepper__button" aria-label="Fewer" onClick={() => setServes(Math.max(1, serves - 1))}>
                  −
                </button>
                <span className="stepper__value">{serves}</span>
                <button type="button" className="stepper__button" aria-label="More" onClick={() => setServes(serves + 1)}>
                  +
                </button>
              </span>
            </div>
          )}
          <ul className="check-list">
            {lines.map((line, i) =>
              isHeading(line) ? (
                <li key={i} className="check-list__heading">
                  {headingText(line)}
                </li>
              ) : (
                <li key={i}>
                  <button
                    type="button"
                    className="check-row"
                    aria-pressed={gathered.has(i)}
                    onClick={() => {
                      const next = new Set(gathered);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      setGathered(next);
                    }}
                  >
                    <span className="check-row__box">{gathered.has(i) ? '✓' : ''}</span>
                    <span className="check-row__text">{line}</span>
                  </button>
                </li>
              ),
            )}
          </ul>
          {lines.length > 0 && (
            <button type="button" className="button-main" onClick={() => setPicking(true)}>
              Add to groceries
            </button>
          )}
          {swapsFor(recipe.ingredients).length > 0 && (
            <button type="button" className="text-link" onClick={() => setSheet('swaps')}>
              Missing something?
            </button>
          )}
        </section>
      )}

      {tab === 'steps' && (
        <section aria-label="Steps">
          <StepList steps={stepsWithAmounts(recipe.steps, recipe.ingredients, factor, settings.units)} />
          {recipe.steps.length > 0 && (
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'cook', id: recipe.id, servings: serves })}>
              <PotIcon size={20} /> Cook, step by step
            </button>
          )}
        </section>
      )}

      {tab === 'notes' && (
        <section aria-label="Notes">
          <textarea
            className="notes-box"
            aria-label="Your notes"
            placeholder="What you changed, what you would try next time."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => notes !== recipe.notes && void save({ notes })}
          />
          {ways.length > 0 && (
            <>
              <div className="section-head">
                <h2>Ways to try it</h2>
              </div>
              <div className="ways">
                {ways.map((way) => {
                  const kept = recipe.notes.includes(way.title);
                  return (
                    <div key={way.id} className="way">
                      <div className="way__title">{way.title}</div>
                      <p className="way__detail">{way.detail}</p>
                      <span className="way__source">{way.source}</span>
                      <button
                        type="button"
                        className="text-link"
                        disabled={kept}
                        onClick={() => {
                          const next = `${recipe.notes.trim() ? `${recipe.notes.trim()}\n` : ''}Try: ${way.title}.`;
                          setNotes(next);
                          void save({ notes: next });
                          undo('Kept in your notes', () => {
                            setNotes(recipe.notes);
                            void save({ notes: recipe.notes });
                          });
                        }}
                      >
                        {kept ? 'In your notes' : 'Keep in my notes'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      <section className="field" aria-label="Cooked">
        <div className="button-row">
          <button type="button" className="button-quiet" onClick={() => setSheet('plan')}>
            Plan it for a day
          </button>
        </div>
        {afterLine === undefined ? (
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              void save({ cooked: [...(recipe.cooked ?? []).filter((day) => day !== today), today] });
              setCookedFor(recipe.cookedFor?.[today] ?? []);
              setAfterLine('');
            }}
          >
            I cooked this
          </button>
        ) : (
          <div className="card">
            <p>That’s recorded.</p>
            <span className="label">Cooked for, if you like</span>
            <div className="chip-grid" role="group" aria-label="Cooked for">
              {[...new Set([...people, ...cookedFor])].map((name) => {
                const on = cookedFor.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className="chip chip--small"
                    aria-pressed={on}
                    onClick={() => {
                      const next = on ? cookedFor.filter((each) => each !== name) : [...cookedFor, name];
                      setCookedFor(next);
                      const map = { ...(recipe.cookedFor ?? {}) };
                      if (next.length) map[today] = next;
                      else delete map[today];
                      void save({ cookedFor: map });
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <form
              className="add-row"
              onSubmit={(event) => {
                event.preventDefault();
                const name = otherName.trim();
                if (!name || cookedFor.includes(name)) return;
                const next = [...cookedFor, name];
                setCookedFor(next);
                setOtherName('');
                void save({ cookedFor: { ...(recipe.cookedFor ?? {}), [today]: next } });
              }}
            >
              <input className="input" aria-label="Someone else" placeholder="Someone else" value={otherName} onChange={(event) => setOtherName(event.target.value)} />
              <button type="submit" className="button-quiet" disabled={!otherName.trim()}>
                Add
              </button>
            </form>
            <label className="field">
              <span className="label">How did you feel after? If you like</span>
              <input className="input" value={afterLine} onChange={(event) => setAfterLine(event.target.value)} placeholder="Light and full of energy" />
            </label>
            <button
              type="button"
              className="button-quiet"
              disabled={!afterLine.trim()}
              onClick={async () => {
                const reflection = await reflectionService.write({ body: `${recipe.title}: ${afterLine.trim()}`, kind: 'FREE', promptKey: 'after-meal' });
                setAfterLine(undefined);
                undo('Kept in Proairetos Reflect', () => void reflectionService.remove(reflection.id));
              }}
            >
              Keep in Reflect
            </button>
          </div>
        )}
        {lastCooked && <p className="hint">Last cooked {dayLabel(lastCooked, today, true).toLowerCase()}.</p>}
        <button type="button" className="text-link" onClick={() => void remove()}>
          Remove this recipe
        </button>
      </section>

      {sheet === 'swaps' && <Swaps ingredients={recipe.ingredients} onClose={() => setSheet(undefined)} />}
      {sheet === 'plan' && (
        <PlanDays
          recipe={recipe}
          today={today}
          onClose={() => setSheet(undefined)}
          onToggle={(day) => void putRecipe({ ...togglePlanned(recipe, day, today), updatedAt: new Date().toISOString() })}
          onWeek={() => {
            setSheet(undefined);
            nav.go({ name: 'week' });
          }}
        />
      )}
      {picking && (
        <AddToGroceries
          lines={lines}
          sourceLines={sourceLines}
          onClose={() => setPicking(false)}
          onAdd={async (chosen) => {
            const before = groceries;
            const next = addToList(
              groceries,
              chosen.map((line) => ({ line, recipe: { id: recipe.id, title: recipe.title } })),
              loadSettings().aisleChoices,
              new Date().toISOString(),
              newId,
            );
            await saveGroceries(next);
            setPicking(false);
            undo(`Added ${chosen.length} to groceries`, () => void saveGroceries(before));
          }}
        />
      )}
    </div>
  );
}

function RecipeBudgetHint({ recipe, recipes }: { recipe: Recipe; recipes: Recipe[] }) {
  const [state, setState] = useState<{ currency: string; limit: number; remaining: number; label: string; mismatch?: boolean }>();
  const mealCost = recipe.estimatedCostCents;
  useEffect(() => {
    if (mealCost === undefined) return;
    let live = true;
    const month = monthKey();
    void Promise.all([listBills(), getBudget(month)]).then(([bills, budget]) => {
      if (!live) return;
      if (!budget) {
        setState(undefined);
        return;
      }
      const currency = budget.currency;
      if (recipe.estimatedCostCurrency && recipe.estimatedCostCurrency !== currency) {
        setState({ currency: recipe.estimatedCostCurrency, limit: 0, remaining: 0, label: 'Currency mismatch', mismatch: true });
        return;
      }
      const totals = budgetTotals(bills, recipes, month, currency);
      const comparison = recipeBudgetComparison(recipe, budget, totals);
      setState(comparison ? { currency, limit: comparison.limitCents, remaining: comparison.remainingCents, label: comparison.label } : undefined);
    });
    return () => {
      live = false;
    };
  }, [mealCost, recipe.id, recipe.planned?.join(','), recipes]);

  if (mealCost === undefined) return null;
  if (state?.mismatch) return <p className="recipe-budget-hint">Estimated cost · {formatMoney(mealCost, state.currency)} · Oikonomia uses another currency for this plan.</p>;
  if (!state || state.limit <= 0) return <p className="recipe-budget-hint">Estimated cost · {formatMoney(mealCost, recipe.estimatedCostCurrency ?? state?.currency ?? loadOikonomiaSettings().currency)} · Set a monthly or food limit in Oikonomia to compare.</p>;
  const after = state.remaining;
  return (
    <div className="recipe-budget-hint">
      <span><strong>This meal</strong> {formatMoney(mealCost, state.currency)}</span>
      <span><strong>{state.label}</strong> {formatMoney(state.limit, state.currency)} · {after >= 0 ? `${formatMoney(after, state.currency)} left after it` : `${formatMoney(Math.abs(after), state.currency)} over after it`}</span>
    </div>
  );
}

/** Choose what to buy: everything starts chosen except what is usually at home. */
function AddToGroceries({ lines, sourceLines, onClose, onAdd }: { lines: string[]; sourceLines: string[]; onClose: () => void; onAdd: (lines: string[]) => void }) {
  const have = loadSettings().usuallyHave;
  const items = lines.map((line, i) => ({ line, sourceLine: sourceLines[i] ?? line, i })).filter(({ line }) => !isHeading(line));
  const [chosen, setChosen] = useState<Set<number>>(new Set(items.filter(({ line }) => !usuallyHave(line, have)).map(({ i }) => i)));
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Add to groceries" onClick={(event) => event.stopPropagation()}>
        <h2 className="sheet__title">Add to groceries</h2>
        <ul className="check-list">
          {items.map(({ line, i }) => (
            <li key={i}>
              <button
                type="button"
                className="check-row"
                aria-pressed={chosen.has(i)}
                onClick={() => {
                  const next = new Set(chosen);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  setChosen(next);
                }}
              >
                <span className="check-row__box">{chosen.has(i) ? '✓' : ''}</span>
                <span>{line}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="button-main" disabled={chosen.size === 0} onClick={() => onAdd(items.filter(({ i }) => chosen.has(i)).map(({ sourceLine }) => sourceLine))}>
          Add {chosen.size}
        </button>
        <button type="button" className="button-quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

/** Swaps for what this recipe has, shown only when asked. */
function Swaps({ ingredients, onClose }: { ingredients: string[]; onClose: () => void }) {
  useEscape(onClose);
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Missing something?" onClick={(event) => event.stopPropagation()}>
        <h2 className="sheet__title">Missing something?</h2>
        <ul className="swaps">
          {swapsFor(ingredients).map(({ line, swap }) => (
            <li key={swap.for} className="way">
              <div className="way__title">{swap.for}</div>
              <p className="way__detail">{swap.use}</p>
              <span className="way__source">
                For {line} · {swap.source}
              </span>
            </li>
          ))}
        </ul>
        <button type="button" className="button-quiet" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/** Put a recipe on one or more of the next seven days. */
function PlanDays({ recipe, today, onClose, onToggle, onWeek }: { recipe: Recipe; today: string; onClose: () => void; onToggle: (day: string) => void; onWeek: () => void }) {
  useEscape(onClose);
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Plan it for a day" onClick={(event) => event.stopPropagation()}>
        <h2 className="sheet__title">{recipe.title}</h2>
        <div className="chip-grid" role="group" aria-label="Days">
          {weekFrom(today).map((day) => (
            <button key={day} type="button" className="chip" aria-pressed={Boolean(recipe.planned?.includes(day))} onClick={() => onToggle(day)}>
              {dayLabel(day, today, true)}
            </button>
          ))}
        </div>
        <div className="button-row">
          <button type="button" className="button-quiet" onClick={onWeek}>
            This week
          </button>
          <button type="button" className="button-quiet" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
