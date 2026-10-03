import { useState } from 'react';
import type { Nav } from '../app/App';
import { dishScene } from '../app/scenes';
import { newId, useGroceries, useRecipes, useToday } from '../app/state';
import { BackLink, dayLabel, useUndo } from '../app/ui';
import { addToList, usuallyHave } from '../core/groceries';
import { kitchenNames, usesFromKitchen } from '../core/kitchen';
import { isHeading, marks, searchRecipes, type Mark, type Recipe } from '../core/recipes';
import { plannedAhead, plannedOn, togglePlanned, weekFrom } from '../core/week';
import { loadSettings, putRecipe, saveGroceries } from '../data/store';

/** A loose week: a few recipes placed on days, nothing to fill. Their groceries in one tap. */
export default function WeekPage({ nav, mark }: { nav: Nav; mark?: Mark }) {
  const recipes = useRecipes() ?? [];
  const groceries = useGroceries() ?? [];
  const today = useToday();
  const undo = useUndo();
  const [picking, setPicking] = useState<string>();
  const days = weekFrom(today);
  const ahead = plannedAhead(recipes, today);

  const toggle = (recipe: Recipe, day: string) => {
    const before = recipe;
    void putRecipe({ ...togglePlanned(recipe, day, today), updatedAt: new Date().toISOString() });
    return () => void putRecipe({ ...before, updatedAt: new Date().toISOString() });
  };

  const buyFor = async () => {
    const have = loadSettings().usuallyHave;
    const kitchen = kitchenNames(groceries);
    const lines = ahead.flatMap((recipe) =>
      recipe.ingredients
        .filter((line) => !isHeading(line) && !usuallyHave(line, have) && usesFromKitchen([line], kitchen).length === 0)
        .map((line) => ({ line, recipe: { id: recipe.id, title: recipe.title } })),
    );
    const before = groceries;
    await saveGroceries(addToList(groceries, lines, loadSettings().aisleChoices, new Date().toISOString(), newId));
    undo(`Added ${lines.length} to groceries`, () => void saveGroceries(before));
  };

  return (
    <div className="page">
      <BackLink label="Home" onBack={nav.back} />
      <h1 className="title">This week</h1>
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
                  <button
                    type="button"
                    className="week__remove"
                    aria-label={`Take ${recipe.title} off ${dayLabel(day, today, true)}`}
                    onClick={() => undo(`${recipe.title} taken off`, toggle(recipe, day))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </li>
          );
        })}
      </ul>
      {ahead.length > 0 && (
        <button type="button" className="button-main" onClick={() => void buyFor()}>
          Groceries for these
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
                <img src={recipe.image || dishScene(recipe.id)} alt="" />
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
