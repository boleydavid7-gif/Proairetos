import { useState } from 'react';
import type { Nav } from '../app/App';
import DishImage from '../app/DishImage';
import { newId, useGroceries, useRecipes, useToday } from '../app/state';
import { BackLink, dayLabel, useUndo } from '../app/ui';
import { addToList, isGrocery, usuallyHave } from '../core/groceries';
import { kitchenNames, usesFromKitchen } from '../core/kitchen';
import { isHeading, marks, searchRecipes, type Mark, type Recipe } from '../core/recipes';
import { movePlanned, plannedOn, plannedWeek, repeatWeekBefore, togglePlanned, weekFrom } from '../core/week';
import { addDays } from '../../core/scheduling/dates';
import { loadSettings, putRecipe, saveGroceries } from '../data/store';
import { Sym } from '../../lamplight/icons';

/** A loose week: a few recipes placed on days, nothing to fill. Their groceries in one tap. */
export default function WeekPage({ nav, mark }: { nav: Nav; mark?: Mark }) {
  const recipes = useRecipes() ?? [];
  const groceries = useGroceries() ?? [];
  const today = useToday();
  const undo = useUndo();
  const [picking, setPicking] = useState<string>();
  const [moving, setMoving] = useState<{ recipe: Recipe; from: string }>();
  // This week and up to three ahead; each shows seven days from its start.
  const [offset, setOffset] = useState(0);
  const start = addDays(today, offset * 7);
  const days = weekFrom(start);
  const meals = plannedWeek(recipes, start);
  const again = repeatWeekBefore(recipes, start, today);

  const toggle = (recipe: Recipe, day: string) => {
    const before = recipe;
    void putRecipe({ ...togglePlanned(recipe, day, today), updatedAt: new Date().toISOString() });
    return () => void putRecipe({ ...before, updatedAt: new Date().toISOString() });
  };

  const move = (recipe: Recipe, from: string, to: string) => {
    if (to === from) return;
    const occupied = plannedOn(recipes, to).filter((each) => each.id !== recipe.id);
    if (occupied.length > 0 && !window.confirm(`Replace ${occupied.map((each) => each.title).join(' and ')} on ${dayLabel(to, today, true)}?`)) return;
    const affected = [recipe, ...occupied];
    const before = affected.map((each) => ({ ...each, planned: each.planned ? [...each.planned] : undefined }));
    const now = new Date().toISOString();
    void putRecipe({ ...movePlanned(recipe, from, to, today), updatedAt: now });
    for (const each of occupied) void putRecipe({ ...togglePlanned(each, to, today), updatedAt: now });
    setMoving(undefined);
    undo(`${recipe.title} moved to ${dayLabel(to, today, true)}`, () => {
      for (const each of before) void putRecipe({ ...each, updatedAt: new Date().toISOString() });
    });
  };

  const buyFor = async () => {
    const have = loadSettings().usuallyHave;
    const kitchen = kitchenNames(groceries);
    const lines = meals.flatMap((recipe) =>
      recipe.ingredients
        .filter((line) => !isHeading(line) && isGrocery(line) && !usuallyHave(line, have) && usesFromKitchen([line], kitchen).length === 0)
        .map((line) => ({ line, recipe: { id: recipe.id, title: recipe.title } })),
    );
    const before = groceries;
    await saveGroceries(addToList(groceries, lines, loadSettings().aisleChoices, new Date().toISOString(), newId));
    undo(`Added ${lines.length} to groceries`, () => void saveGroceries(before));
  };

  return (
    <div className="page">
      <BackLink label="Home" onBack={nav.back} />
      <div className="week-steps">
        <button type="button" className="chip" aria-label="Week before" disabled={offset === 0} onClick={() => setOffset(offset - 1)}><Sym name="back" /></button>
        <h1 className="title">{offset === 0 ? 'This week' : offset === 1 ? 'Next week' : `From ${dayLabel(start, today, true)}`}</h1>
        <button type="button" className="chip" aria-label="Week after" disabled={offset === 3} onClick={() => setOffset(offset + 1)}><Sym name="chevron" /></button>
      </div>
      {again.length > 0 && (
        <button
          type="button"
          className="text-link week-repeat"
          onClick={() => {
            const before = recipes.filter((recipe) => again.some((each) => each.id === recipe.id));
            const now = new Date().toISOString();
            for (const recipe of again) void putRecipe({ ...recipe, updatedAt: now });
            undo(again.length === 1 ? 'One meal placed again' : `${again.length} meals placed again`, () => {
              for (const recipe of before) void putRecipe({ ...recipe, updatedAt: new Date().toISOString() });
            });
          }}
        >
          Repeat the week before
        </button>
      )}
      <ul className="week">
        {days.map((day) => {
          const on = plannedOn(recipes, day);
          return (
            <li key={day} className="week__day">
              <div className="week__head">
                <span>{dayLabel(day, today, true)}</span>
                <button type="button" className="text-link" onClick={() => setPicking(day)} aria-label={`Add a recipe for ${dayLabel(day, today, true)}`}>
                  Add
                </button>
              </div>
              {on.map((recipe) => (
                <div key={recipe.id} className="week__meal">
                  <button type="button" className="week__title" onClick={() => nav.go({ name: 'recipe', id: recipe.id })}>
                    {recipe.title}
                  </button>
                  <button type="button" className="week__move" onClick={() => setMoving({ recipe, from: day })}>
                    Move
                  </button>
                  <button
                    type="button"
                    className="week__remove"
                    aria-label={`Take ${recipe.title} off ${dayLabel(day, today, true)}`}
                    onClick={() => undo(`${recipe.title} taken off`, toggle(recipe, day))}
                  ><Sym name="close" /></button>
                </div>
              ))}
            </li>
          );
        })}
      </ul>
      {meals.length > 0 && (
        <button type="button" className="button-main" onClick={() => void buyFor()}>
          {offset === 0 ? 'Build groceries for this week' : 'Build groceries for next week'}
        </button>
      )}

      {picking && (
        <PickRecipe
          recipes={recipes}
          startMark={mark}
          title={dayLabel(picking, today, true)}
          onClose={() => setPicking(undefined)}
          onPick={(recipe) => {
            const back = toggle(recipe, picking);
            setPicking(undefined);
            undo(`${recipe.title} on ${dayLabel(picking, today, true)}`, back);
          }}
        />
      )}
      {moving && (
        <MoveRecipe
          recipe={moving.recipe}
          from={moving.from}
          days={days}
          today={today}
          onClose={() => setMoving(undefined)}
          onMove={(to) => move(moving.recipe, moving.from, to)}
        />
      )}
    </div>
  );
}

function MoveRecipe({ recipe, from, days, today, onClose, onMove }: { recipe: Recipe; from: string; days: string[]; today: string; onClose: () => void; onMove: (day: string) => void }) {
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`Move ${recipe.title}`} onClick={(event) => event.stopPropagation()}>
        <h2 className="sheet__title">Move {recipe.title}</h2>
        <p className="muted">Choose another day this week.</p>
        <div className="move-days">
          {days.filter((day) => day !== from).map((day) => (
            <button key={day} type="button" className="button-quiet move-days__day" onClick={() => onMove(day)}>
              {dayLabel(day, today, true)}
            </button>
          ))}
        </div>
        <button type="button" className="button-quiet" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function PickRecipe({ recipes, title, startMark, onClose, onPick }: { recipes: Recipe[]; title: string; startMark?: Mark; onClose: () => void; onPick: (recipe: Recipe) => void }) {
  const [query, setQuery] = useState('');
  const [mark, setMark] = useState<Mark | undefined>(startMark);
  const shown = searchRecipes(recipes, query).filter((recipe) => !mark || recipe.marks?.includes(mark));
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`A recipe for ${title}`} onClick={(event) => event.stopPropagation()}>
        <h2 className="sheet__title">{title}</h2>
        <input className="input" aria-label="Search your recipes" placeholder="Search your recipes" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="chip-grid" role="group" aria-label="Your marks">
          {marks.map((each) => (
            <button key={each.id} type="button" className="chip" aria-pressed={mark === each.id} onClick={() => setMark(mark === each.id ? undefined : each.id)}>
              {each.label}
            </button>
          ))}
        </div>
        <ul className="recipe-rows">
          {shown.slice(0, 30).map((recipe) => (
            <li key={recipe.id}>
              <button type="button" className="recipe-row" onClick={() => onPick(recipe)}>
                <DishImage recipe={recipe} />
                <span>
                  <span className="recipe-row__title">{recipe.title}</span>
                </span>
                <span />
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="muted">No recipes with that.</li>}
        </ul>
        <button type="button" className="button-quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
