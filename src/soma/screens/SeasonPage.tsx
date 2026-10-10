import { useEffect, useState } from 'react';
import type { Nav } from '../app/App';
import DishImage from '../app/DishImage';
import { draftFrom, mealsWith, type Found } from '../app/mealdb';
import { latitude } from '../app/proairetos';
import { newId, useGroceries, useRecipes, useSettings } from '../app/state';
import { BackLink, useUndo } from '../app/ui';
import { addToList, onList } from '../core/groceries';
import { itemKey } from '../core/ingredients';
import {
  comingNext,
  KEEPING_SOURCE,
  kindNames,
  produceById,
  producePhoto,
  SEASON_SOURCE,
  seasonal,
  usesProduce,
  type Produce,
  type ProduceKind,
} from '../core/seasons';
import { loadSettings, saveGroceries } from '../data/store';

const monthShort = (m: number) => new Date(2026, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });

/** "Mar – Jun, Sep – Nov": the months it is at its best, where the person lives. */
export function monthsLabel(months: number[], south: boolean): string {
  const local = [...new Set(months.map((m) => (south ? ((m + 5) % 12) + 1 : m)))].sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const m of local) {
    const last = runs.at(-1);
    if (last && m === last[1] + 1) last[1] = m;
    else runs.push([m, m]);
  }
  // A run across the new year (Dec into Jan) reads as one.
  if (runs.length > 1 && runs[0][0] === 1 && runs.at(-1)![1] === 12) {
    const first = runs.shift()!;
    runs[runs.length - 1][1] = first[1];
  }
  return runs.map(([a, b]) => (a === b ? monthShort(a) : `${monthShort(a)} – ${monthShort(b)}`)).join(', ');
}

/** A photo of it from TheMealDB, or, offline or without one, a soft card with its first letter. */
export function ProducePicture({ item, large = false }: { item: Produce; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  const src = producePhoto(item, large ? 'large' : 'small');
  return (
    <span className={`produce-pic produce-pic--${item.kind}${large ? ' produce-pic--large' : ''}`} aria-hidden="true">
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : <span className="produce-pic__initial">{item.name.charAt(0)}</span>}
    </span>
  );
}

/** What is at its best this month, by kind; each opens its own page. */
export default function SeasonPage({ nav }: { nav: Nav }) {
  const month = new Date().getMonth();
  const lat = latitude();
  const now = seasonal(month, lat);
  const next = comingNext(month, lat);
  const kinds: ProduceKind[] = ['vegetable', 'fruit', 'herb'];
  return (
    <div className="page season-page">
      <BackLink label="Home" onBack={nav.back} />
      <h1 className="title">In season</h1>
      <p className="muted">{new Date().toLocaleDateString(undefined, { month: 'long' })}</p>
      {kinds.map((kind) => {
        const items = now.filter((item) => item.kind === kind);
        if (!items.length) return null;
        return (
          <section key={kind} className="season-group" aria-label={kindNames[kind]}>
            <h2 className="card__eyebrow">{kindNames[kind]}</h2>
            <ul className="produce-grid">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" className="produce-tile" onClick={() => nav.go({ name: 'produce', id: item.id })}>
                    <ProducePicture item={item} />
                    <span className="produce-tile__name">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {next.length > 0 && (
        <p className="season-next">
          <span className="card__eyebrow">Coming next month</span>
          {next.map((item) => item.name.toLowerCase()).join(', ')}
        </p>
      )}
      <span className="way__source">{SEASON_SOURCE}. Photos from TheMealDB.</span>
    </div>
  );
}

/** One thing in season: how to keep it, your recipes with it, ideas from TheMealDB, and onto the list. */
export function ProducePage({ nav, id }: { nav: Nav; id: string }) {
  const item = produceById(id);
  const recipes = useRecipes() ?? [];
  const groceries = useGroceries() ?? [];
  useSettings();
  const undo = useUndo();
  const [ideas, setIdeas] = useState<Found[]>();
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    let live = true;
    setIdeas(undefined);
    setProblem(undefined);
    mealsWith(item.lookup ?? item.photo ?? item.name)
      .then((found) => live && setIdeas(found.slice(0, 8)))
      .catch(() => live && setProblem('Ideas need a connection. Your own recipes work without one.'));
    return () => {
      live = false;
    };
  }, [id]);

  if (!item)
    return (
      <div className="page">
        <BackLink label="In season" onBack={nav.back} />
      </div>
    );

  const yours = recipes.filter((recipe) => usesProduce(recipe, item));
  const onTheList = groceries.some((each) => onList(each) && !each.checked && itemKey(each.name) === itemKey(item.name));
  const south = (latitude() ?? 0) < 0;

  const add = async () => {
    const before = groceries;
    await saveGroceries(addToList(groceries, [{ line: item.name.toLowerCase() }], loadSettings().aisleChoices, new Date().toISOString(), newId));
    undo(`${item.name} added to groceries`, () => void saveGroceries(before));
  };

  return (
    <div className="page produce-page">
      <BackLink label="In season" onBack={nav.back} />
      <header className="produce-head">
        <ProducePicture item={item} large />
        <div>
          <h1 className="title">{item.name}</h1>
          <p className="muted">At its best {monthsLabel(item.months, south)}</p>
        </div>
      </header>

      <section className="card" aria-label="Keeping it">
        <h2 className="card__eyebrow">Keeping it</h2>
        <p>{item.keep}</p>
        <span className="way__source">{KEEPING_SOURCE}</span>
      </section>

      <button type="button" className="button-quiet" disabled={onTheList} onClick={() => void add()}>
        {onTheList ? 'On your grocery list' : 'Add to groceries'}
      </button>

      {yours.length > 0 && (
        <section aria-label="Your recipes">
          <div className="section-head">
            <h2>Your recipes</h2>
          </div>
          <ul className="recipe-rows">
            {yours.map((recipe) => (
              <li key={recipe.id}>
                <button type="button" className="recipe-row" onClick={() => nav.go({ name: 'recipe', id: recipe.id })}>
                  <DishImage recipe={recipe} />
                  <span>
                    <span className="recipe-row__title">{recipe.title}</span>
                  </span>
                  <span />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Ideas">
        <div className="section-head">
          <h2>Ideas with {item.name.toLowerCase()}</h2>
        </div>
        {problem && <p className="muted">{problem}</p>}
        {!problem && !ideas && <p className="muted">Looking…</p>}
        {ideas && ideas.length === 0 && <p className="muted">None in TheMealDB yet.</p>}
        <ul className="recipe-rows">
          {ideas?.map((meal) => (
            <li key={meal.idMeal}>
              <button
                type="button"
                className="idea-row"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await draftFrom(meal);
                    nav.go({ name: 'edit' });
                  } catch {
                    setProblem('That recipe could not be opened just now.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <img src={meal.strMealThumb ? `${meal.strMealThumb}/small` : undefined} alt="" />
                <span>
                  <span className="recipe-row__title">{meal.strMeal}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
