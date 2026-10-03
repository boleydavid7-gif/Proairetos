import { useEffect, useState } from 'react';
import { reflectionService } from '../../app/services';
import type { Nav } from '../app/App';
import { ClockIcon, HeartIcon, PotIcon, ServesIcon } from '../app/icons';
import { dishScene } from '../app/scenes';
import { newId, useGroceries, useRecipes, useSettings, useToday } from '../app/state';
import { startTimer, stopTimer, timeLeft, useTimers } from '../app/timers';
import { BackLink, dayLabel, Segmented, useUndo } from '../app/ui';
import { addToList, usuallyHave } from '../core/groceries';
import { scaleLine } from '../core/ingredients';
import { headingText, isHeading, minutesLabel, servingsNumber, timeOf, timersIn, type Recipe } from '../core/recipes';
import { waysToTry } from '../core/tryIt';
import { deleteRecipe, loadSettings, putRecipe, saveGroceries } from '../data/store';

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
              startTimer(label, minutes);
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
  const lines = recipe.ingredients.map((line) => (isHeading(line) ? line : scaleLine(line, factor)));
  const save = (change: Partial<Recipe>) => putRecipe({ ...recipe, ...change, updatedAt: new Date().toISOString() });
  const time = minutesLabel(timeOf(recipe));
  const ways = settings.waysToTry ? waysToTry(recipe) : [];
  const lastCooked = recipe.cooked?.at(-1);

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
        {recipe.url ? (
          <a href={recipe.url} target="_blank" rel="noreferrer">
            {recipe.source ?? 'Source'}
          </a>
        ) : (
          recipe.source && <span>{recipe.source}</span>
        )}
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
        </section>
      )}

      {tab === 'steps' && (
        <section aria-label="Steps">
          <StepList steps={recipe.steps} />
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
        {afterLine === undefined ? (
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              void save({ cooked: [...(recipe.cooked ?? []).filter((day) => day !== today), today] });
              setAfterLine('');
            }}
          >
            I cooked this
          </button>
        ) : (
          <div className="card">
            <p>That’s recorded.</p>
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

      {picking && (
        <AddToGroceries
          lines={lines}
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

/** Choose what to buy: everything starts chosen except what is usually at home. */
function AddToGroceries({ lines, onClose, onAdd }: { lines: string[]; onClose: () => void; onAdd: (lines: string[]) => void }) {
  const have = loadSettings().usuallyHave;
  const items = lines.map((line, i) => ({ line, i })).filter(({ line }) => !isHeading(line));
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
        <button type="button" className="button-main" disabled={chosen.size === 0} onClick={() => onAdd(items.filter(({ i }) => chosen.has(i)).map(({ line }) => line))}>
          Add {chosen.size}
        </button>
        <button type="button" className="button-quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
